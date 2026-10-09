import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { refreshHistoryForBuild } from './build-refresh.mjs';
import { createCloudflareBuildAcquisition } from './cloudflare-build-history.mjs';
import { createSnapshot } from './snapshot.mjs';
import { validateDeploymentSnapshot } from './load-adapter.mjs';
import { accountId, build, harness, token } from './cloudflare-build-history.fixtures.mjs';

const environment = {
  WORKERS_CI: '1',
  WORKERS_CI_BRANCH: 'main',
  CLOUDFLARE_ACCOUNT_ID: accountId,
  DEPLOYMENT_HISTORY_READ_TOKEN: token,
  CLOUDFLARE_API_TOKEN: 'fixture-wrangler-token-must-not-be-used',
};
const clock = () => new Date('2026-10-09T12:00:00.000Z');
async function withOutput(run) {
  const directory = await mkdtemp(join(tmpdir(), 'build-history-refresh-'));
  const output = join(directory, 'history.json');
  try {
    await writeFile(
      output,
      JSON.stringify(await createSnapshot({ acquire: async () => [], now: clock })),
    );
    await run(output, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('npm production build refreshes before timestamp generation and Angular compilation', async () => {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(
    pkg.scripts.prebuild,
    'node scripts/deployment-history/build-refresh.mjs && node scripts/generate-build-info.mjs',
  );
  assert.equal(pkg.scripts.build, 'ng build');
  assert.equal(pkg.scripts['history:refresh'], 'node scripts/generate-deployment-history.mjs');
});

test('production CLI exits nonzero without a read secret and never echoes deployment credentials', () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./build-refresh.mjs', import.meta.url))],
    {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        WORKERS_CI: '1',
        WORKERS_CI_BRANCH: 'main',
        CLOUDFLARE_ACCOUNT_ID: accountId,
        CLOUDFLARE_API_TOKEN: environment.CLOUDFLARE_API_TOKEN,
      },
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /refresh failed; build stopped/);
  assert.equal(result.stderr.includes(accountId), false);
  assert.equal(result.stderr.includes(environment.CLOUDFLARE_API_TOKEN), false);
});

test('local and preview builds never acquire, even if runtime credentials exist', async () => {
  for (const env of [
    { ...environment, WORKERS_CI: undefined },
    { ...environment, WORKERS_CI_BRANCH: 'preview-fixture' },
  ]) {
    let called = false;
    const result = await refreshHistoryForBuild({
      environment: env,
      createAcquisition: () => {
        called = true;
        throw new Error('must not execute');
      },
    });
    assert.equal(result.refreshed, false);
    assert.equal(called, false);
  }
});

test('missing/unsupported hosted context cannot silently select the offline path', async () => {
  for (const env of [
    { ...environment, WORKERS_CI: '0' },
    { ...environment, WORKERS_CI_BRANCH: undefined },
    { ...environment, WORKERS_CI_BRANCH: '' },
    { ...environment, WORKERS_CI_BRANCH: ' main ' },
  ])
    await assert.rejects(refreshHistoryForBuild({ environment: env }), /context/);
});

test('missing read configuration fails before acquisition and preserves old asset bytes', async () => {
  for (const env of [
    { ...environment, CLOUDFLARE_ACCOUNT_ID: undefined },
    { ...environment, CLOUDFLARE_ACCOUNT_ID: 'malformed' },
    { ...environment, DEPLOYMENT_HISTORY_READ_TOKEN: undefined },
    { ...environment, DEPLOYMENT_HISTORY_READ_TOKEN: ' ' },
  ])
    await withOutput(async (output) => {
      const before = await readFile(output);
      let called = false;
      await assert.rejects(
        refreshHistoryForBuild({
          environment: env,
          output,
          createAcquisition: () => {
            called = true;
          },
        }),
        /read configuration/,
      );
      assert.equal(called, false);
      assert.deepEqual(await readFile(output), before);
    });
});

test('mocked complete history replaces an Oct 6 artifact with Oct 7 attempts through the real sanitizer', async () => {
  await withOutput(async (output, directory) => {
    const older = build(1);
    older.created_on = '2026-10-06T10:00:00Z';
    const newRecords = ['success', 'fail', 'terminated'].map((outcome, index) => ({
      ...build(index + 2),
      created_on: '2026-10-07T10:00:00Z',
      build_outcome: outcome,
    }));
    const oldHarness = harness([older]);
    const original = await createSnapshot({
      acquire: oldHarness.acquire,
      now: () => new Date('2026-10-06T16:00:00.000Z'),
    });
    await writeFile(output, JSON.stringify(original));
    const liveFixture = harness([older, ...newRecords]);
    const result = await refreshHistoryForBuild({
      environment,
      output,
      now: clock,
      createAcquisition: (options) =>
        createCloudflareBuildAcquisition({ ...options, fetcher: liveFixture.fetcher }),
    });
    const bytes = await readFile(output, 'utf8');
    const snapshot = JSON.parse(bytes);
    assert.equal(result.refreshed, true);
    assert.equal(result.rowCount, 4);
    assert.equal(snapshot.checkedAt, clock().toISOString());
    assert.equal(snapshot.rows.filter((row) => row.createdAt.startsWith('2026-10-07')).length, 3);
    assert.deepEqual(snapshot.rows[0], original.rows[0]);
    assert.equal(new Set(snapshot.rows.map((row) => row.id)).size, 4);
    assert.deepEqual(
      snapshot.rows.map((row) => row.status),
      ['succeeded', 'succeeded', 'failed', 'terminated'],
    );
    assert.equal(snapshot.rows.filter((row) => row.stage === 'deployed').length, 2);
    assert.equal(validateDeploymentSnapshot(snapshot).ok, true);
    assert.equal(bytes.includes(token), false);
    assert.equal(bytes.includes(environment.CLOUDFLARE_API_TOKEN), false);
    assert.equal(bytes.includes(accountId), false);
    assert.deepEqual(await readdir(directory), ['history.json']);
  });
});

test('failed acquisition, invalid neutral rows and incomplete provider pages stop refresh with last-good bytes intact', async () => {
  for (const factory of [
    () => async () => {
      throw new Error('fixture failure');
    },
    () => async () => [{ token: 'must-not-publish' }],
    (options) =>
      createCloudflareBuildAcquisition({
        ...options,
        fetcher: harness(
          Array.from({ length: 101 }, (_, index) => build(index + 1)),
          (url) => {
            if (new URL(url).searchParams.get('page') === '2')
              throw new Error('fixture page failure');
          },
        ).fetcher,
      }),
  ])
    await withOutput(async (output, directory) => {
      const before = await readFile(output);
      await assert.rejects(
        refreshHistoryForBuild({ environment, output, now: clock, createAcquisition: factory }),
      );
      assert.deepEqual(await readFile(output), before);
      assert.deepEqual(await readdir(directory), ['history.json']);
    });
});

test('verified-empty refresh remains successful rather than fabricating attempts', async () => {
  await withOutput(async (output) => {
    const result = await refreshHistoryForBuild({
      environment,
      output,
      now: clock,
      createAcquisition: () => async () => [],
    });
    assert.equal(result.refreshed, true);
    assert.equal(result.rowCount, 0);
    assert.equal(validateDeploymentSnapshot(JSON.parse(await readFile(output, 'utf8'))).ok, true);
  });
});
