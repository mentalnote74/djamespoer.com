import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProductionDeploymentAcquisition } from './production-deployments.mjs';
import { refreshProductionDeployments } from './production-refresh.mjs';
import { generateSnapshot } from './snapshot.mjs';
const environment = {
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  DEPLOYMENT_HISTORY_READ_TOKEN: 'fictional-read-secret',
};
const deployment = (n) => ({
  id: `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`,
  created_on: new Date(Date.UTC(2026, 9, n + 4, 12)).toISOString().replace('.000Z', '.123456Z'),
  versions: [{ version_id: 'private-version', percentage: 100 }],
  author_email: 'private@example.invalid',
  annotations: { 'workers/message': 'private untrusted content' },
});
const response = (items, page = 1, total_pages = 1, total_count = items.length) =>
  new Response(
    JSON.stringify({
      success: true,
      result: { deployments: items },
      result_info: { page, per_page: 100, count: items.length, total_pages, total_count },
    }),
  );
const row = {
  id: 'attempt-' + 'b'.repeat(64),
  createdAt: '2026-10-04T12:00:00.000Z',
  environment: 'production',
  status: 'failed',
};
const snapshot = {
  schemaVersion: 4,
  checkedAt: row.createdAt,
  generatedAt: row.createdAt,
  refreshStatus: 'ok',
  rows: [row],
};
test('GETs only pinned production Worker, follows numeric pages and publishes minimal projections', async () => {
  const calls = [];
  const acquire = createProductionDeploymentAcquisition({
    accountId: environment.CLOUDFLARE_ACCOUNT_ID,
    getToken: () => environment.DEPLOYMENT_HISTORY_READ_TOKEN,
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? response(
            Array.from({ length: 100 }, (_, n) => deployment(n + 1)),
            1,
            2,
            101,
          )
        : response([deployment(101)], 2, 2, 101);
    },
  });
  const rows = await acquire();
  assert.equal(rows.length, 101);
  assert.equal(calls[0].options.method, 'GET');
  assert.match(
    calls[1].url,
    /\/workers\/scripts\/djamespoer-com\/deployments\?page=2&per_page=100$/,
  );
  assert.equal(rows[0].createdAt, '2026-10-05T12:00:00.123Z');
  assert.equal(JSON.stringify(rows).includes('private'), false);
  assert.equal(JSON.stringify(rows).includes(environment.DEPLOYMENT_HISTORY_READ_TOKEN), false);
});
test('provider errors, redirects, invalid records and incomplete pagination fail closed', async () => {
  for (const fetcher of [
    async () => new Response('{}', { status: 403 }),
    async () => response([{ ...deployment(1), created_on: 'invalid' }]),
    async () => response([{ ...deployment(1), created_on: '2026-02-30T12:00:00Z' }]),
    async () => response([null]),
    async () => response([deployment(1)], 1, 1, 65),
    async () => response([{ ...deployment(1), versions: [{ percentage: 50 }] }]),
    async () => response([deployment(1)], 2, 2),
    async () => {
      throw new Error('private');
    },
  ]) {
    await assert.rejects(
      createProductionDeploymentAcquisition({
        accountId: environment.CLOUDFLARE_ACCOUNT_ID,
        getToken: () => environment.DEPLOYMENT_HISTORY_READ_TOKEN,
        fetcher,
      })(),
      /history unavailable/,
    );
  }
});
test('repeated refresh is idempotent, newest first, retains old rows and preserves bytes on failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'production-history-'));
  const output = join(dir, 'history.json');
  try {
    await writeFile(output, JSON.stringify(snapshot));
    const options = {
      environment,
      output,
      acquireArchive: async () => [],
      createAcquisition: (o) =>
        createProductionDeploymentAcquisition({
          ...o,
          fetcher: async () => response([deployment(2), deployment(1)]),
        }),
    };
    const first = await refreshProductionDeployments(options);
    const second = await refreshProductionDeployments(options);
    assert.deepEqual(first.rows, second.rows);
    assert.equal(second.rows.length, 3);
    assert.deepEqual(second.rows.at(-1), row);
    assert.equal(second.rows[0].createdAt, '2026-10-06T12:00:00.123Z');
    const bytes = await readFile(output, 'utf8');
    await assert.rejects(
      refreshProductionDeployments({
        ...options,
        createAcquisition: () => async () => {
          throw new Error('unavailable');
        },
      }),
    );
    assert.equal(await readFile(output, 'utf8'), bytes);
    const publishedOnly = { ...row, id: 'attempt-' + 'c'.repeat(64) };
    const hosted = await generateSnapshot(output, {
      acquire: async () => [],
      retainHistory: true,
      acquireArchive: async () => [publishedOnly],
    });
    assert.equal(hosted.rows.length, 4);
    assert.ok(hosted.rows.some((item) => item.id === publishedOnly.id));
    second.rows.forEach((item) =>
      assert.deepEqual(
        hosted.rows.find((r) => r.id === item.id),
        item,
      ),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
