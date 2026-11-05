import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
const run = (...args) =>
  JSON.parse(
    execFileSync(process.execPath, ['scripts/analytics/report.mjs', ...args], {
      encoding: 'utf8',
      env: { ...process.env, GOOGLE_ANALYTICS_ACCESS_TOKEN: '' },
    }),
  );
test('future/default reports include Florida and all public traffic', () => {
  const report = run('2026-11-05', '2026-11-06');
  assert.equal(report.historicalFloridaExcluded, false);
  assert.equal(report.requests.arrival.dimensionFilter, undefined);
  assert.equal(
    report.requests.arrival.dimensions.some((d) => d.name === 'landingPage'),
    true,
  );
});
test('historical filter requires an explicit cutoff and cannot silently exclude later Florida visitors', () => {
  const report = run(
    '2026-10-08',
    '2026-11-04',
    '--historical-exclude-florida',
    '--historical-through=2026-11-04',
  );
  assert.equal(
    report.requests.arrival.dimensionFilter.notExpression.filter.stringFilter.value,
    'Florida',
  );
  for (const flags of [
    ['--historical-exclude-florida'],
    ['--historical-exclude-florida', '--historical-through=2026-11-03'],
  ]) {
    const result = spawnSync(
      process.execPath,
      ['scripts/analytics/report.mjs', '2026-10-08', '2026-11-04', ...flags],
      { encoding: 'utf8', env: { ...process.env, GOOGLE_ANALYTICS_ACCESS_TOKEN: '' } },
    );
    assert.notEqual(result.status, 0);
  }
});
