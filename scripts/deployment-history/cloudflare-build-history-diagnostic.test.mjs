import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseCloudflareBuildHistory } from './cloudflare-build-history-diagnostic.mjs';
import { harness, token, accountId } from './cloudflare-build-history.fixtures.mjs';
test('diagnostic prints value-free counts only, never identities/credentials/rows', async () => {
  const { fetcher } = harness();
  const report = await diagnoseCloudflareBuildHistory({
    env: { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
    fetcher,
  });
  assert.equal(report.outcome, 'usable-history');
  assert.equal(report.publicRows, 1);
  assert.equal(report.counts['pages-read'], 1);
  assert.equal(report.counts['records-observed'], 1);
  assert.ok(report.resources.every((r) => r.httpSuccess));
  assert.ok(!JSON.stringify(report).includes(token));
  assert.ok(!JSON.stringify(report).includes(accountId));
  assert.equal(report.rows, undefined);
});
test('missing external credentials cause no reads', async () => {
  const report = await diagnoseCloudflareBuildHistory({
    env: {},
    fetcher: () => {
      throw new Error('must not read');
    },
  });
  assert.equal(report.reason, 'runtime-configuration');
  assert.deepEqual(report.resources, []);
});
test('transport failure emits safe category', async () => {
  const report = await diagnoseCloudflareBuildHistory({
    env: { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
    fetcher: () => {
      throw new Error(token);
    },
  });
  assert.equal(report.reason, 'acquisition');
  assert.ok(!JSON.stringify(report).includes(token));
});
