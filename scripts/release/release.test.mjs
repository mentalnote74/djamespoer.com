import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChannel, easternDay, versionFor } from './identity.mjs';
import { guardDeploy, uncommitted } from './guard.mjs';

test('versions count main commits within one Eastern day', () => {
  // 01:30 UTC on the 17th is still the 16th in New York.
  assert.equal(easternDay('2026-11-17T01:30:00Z'), '2026.11.16');
  const dates = ['2026-11-17T01:30:00Z', '2026-11-16T15:00:00Z', '2026-11-15T23:00:00Z'];
  assert.equal(versionFor(dates, true), '2026.11.16-2');
  assert.equal(versionFor(dates.slice(1), true), '2026.11.16-1');
  // A cut-off history that never leaves today can't be counted.
  assert.equal(versionFor(dates.slice(0, 2), false), null);
  assert.equal(versionFor(dates.slice(0, 2), true), '2026.11.16-2');
});

test('only main builds in Workers Builds are production', () => {
  assert.equal(buildChannel({}), 'local');
  assert.equal(buildChannel({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' }), 'production');
  assert.equal(buildChannel({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'scrum-1' }), 'preview');
});

test('deploy guard refuses uncommitted files and commits off main', () => {
  assert.deepEqual(
    uncommitted(' M src/app/generated/build-info.ts\n?? public/assets/x.pdf\n M src/main.ts\n'),
    ['public/assets/x.pdf', 'src/main.ts'],
  );
  const git =
    (status, onMain) =>
    (...args) => {
      if (args[0] === 'status') return status;
      if (args[0] === 'merge-base' && !onMain) throw new Error('not ancestor');
      return '';
    };
  assert.match(guardDeploy(git('?? public/x.pdf\n', true)), /not committed[\s\S]*public\/x\.pdf/);
  assert.match(guardDeploy(git('', false)), /not on origin\/main/);
  assert.equal(guardDeploy(git(' M src/app/generated/build-info.ts\n', true)), null);
});
