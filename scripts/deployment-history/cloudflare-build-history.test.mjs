import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adaptCloudflareBuilds } from './cloudflare-build-history.mjs';
import { createSnapshot, generateSnapshot, serializeVerifiedSnapshot } from './snapshot.mjs';
import {
  harness,
  token,
  accountId,
  build,
  scope,
  revision,
  response,
} from './cloudflare-build-history.fixtures.mjs';
const workerTag = scope.workerTag;
test('trusted read -> sanitized v4 snapshot; no raw identities escape', async () => {
  const { acquire } = harness();
  const snapshot = await createSnapshot({ acquire });
  assert.equal(snapshot.schemaVersion, 4);
  assert.match(snapshot.rows[0].id, /^attempt-[0-9a-f]{64}$/);
  assert.equal(snapshot.rows[0].revision, revision.slice(0, 7));
  assert.equal(snapshot.rows[0].stage, 'deployed');
  const text = await serializeVerifiedSnapshot(snapshot);
  for (const privateValue of [token, accountId, workerTag, build().build_uuid, revision])
    assert.ok(!text.includes(privateValue));
});
for (const [outcome, status] of Object.entries({
  success: 'succeeded',
  fail: 'failed',
  cancelled: 'cancelled',
  skipped: 'skipped',
  terminated: 'terminated',
})) {
  test(`preserves outcome ${outcome}`, () => {
    const row = adaptCloudflareBuilds([{ ...build(), build_outcome: outcome }], scope)[0];
    assert.equal(row.status, status);
    if (status !== 'succeeded') assert.equal(row.stage, undefined);
  });
}
for (const [provider, status] of [
  ['queued', 'queued'],
  ['initializing', 'in-progress'],
  ['running', 'in-progress'],
]) {
  test(`maps ${provider}`, () =>
    assert.equal(
      adaptCloudflareBuilds([{ ...build(), status: provider, build_outcome: null }], scope)[0]
        .status,
      status,
    ));
}
test('success alone and upload commands never imply deployed', () => {
  const record = build();
  record.build_trigger_metadata.deploy_command = 'npx wrangler versions upload';
  assert.equal(adaptCloudflareBuilds([record], scope)[0].stage, undefined);
  assert.equal(
    adaptCloudflareBuilds([build()], { ...scope, deployCommand: 'upload' })[0].stage,
    undefined,
  );
});
for (const value of [undefined, null, 42, 'invalid', ' ' + revision, 'a'.repeat(6)]) {
  test(`optional malformed revision degrades ${typeof value}`, () => {
    const record = build();
    record.build_trigger_metadata.commit_hash = value;
    const row = adaptCloudflareBuilds([record], scope)[0];
    assert.equal(row.revision, undefined);
    assert.equal(row.status, 'succeeded');
  });
}
test('short and uppercase provider revisions remain source-derived', () => {
  const record = build();
  record.build_trigger_metadata.commit_hash = 'ABCDEF1';
  assert.equal(adaptCloudflareBuilds([record], scope)[0].revision, 'ABCDEF1');
});
test('optional summary is bounded first line; absent/private extras are not copied', () => {
  const record = build();
  record.build_trigger_metadata.commit_message = 'x'.repeat(300) + '\nprivate';
  assert.equal(adaptCloudflareBuilds([record], scope)[0].summary.length, 240);
  delete record.build_trigger_metadata.commit_message;
  assert.equal(adaptCloudflareBuilds([record], scope)[0].summary, undefined);
});
test('repeated revision attempts retain distinct stable public identities', () => {
  const rows = adaptCloudflareBuilds([build(1), build(2)], scope);
  assert.equal(rows[0].revision, rows[1].revision);
  assert.notEqual(rows[0].id, rows[1].id);
  assert.equal(adaptCloudflareBuilds([build(1)], scope)[0].id, rows[0].id);
  assert.throws(() => adaptCloudflareBuilds([build(1), build(1)], scope), {
    category: 'neutral-validation',
  });
});
for (const mutation of [
  (r) => (r.build_uuid = 'invalid'),
  (r) => (r.created_on = 'invalid'),
  (r) => (r.build_outcome = 'unknown'),
  (r) => (r.build_trigger_metadata.branch = 'preview'),
  (r) => (r.build_trigger_metadata.repo_name = 'other'),
  (r) => (r.trigger.external_script_id = 'c'.repeat(32)),
]) {
  test('unsafe required record omitted without destroying usable history', () => {
    const bad = build(2);
    mutation(bad);
    assert.equal(adaptCloudflareBuilds([bad, build(1)], scope).length, 1);
    assert.throws(() => adaptCloudflareBuilds([bad], scope), { category: 'no-usable-records' });
  });
}
test('historical trigger identity is not a forensic eligibility requirement', () => {
  const record = build();
  record.trigger.trigger_uuid = build(999).build_uuid;
  assert.equal(adaptCloudflareBuilds([record], scope).length, 1);
});
test('optional pagination absent accepts short page', async () => {
  const { acquire } = harness([build()], (url) =>
    url.includes('/builds?page=') ? response([build()]) : undefined,
  );
  assert.equal((await acquire()).length, 1);
});
test('full pages traverse until short page without optional totals', async () => {
  const records = Array.from({ length: 101 }, (_, n) => build(n + 1));
  const { acquire, requests } = harness(records, (url) =>
    url.includes('/builds?page=')
      ? response(
          records.slice(
            (Number(new URL(url).searchParams.get('page')) - 1) * 100,
            Number(new URL(url).searchParams.get('page')) * 100,
          ),
        )
      : undefined,
  );
  assert.equal((await acquire()).length, 101);
  assert.equal(requests.length, 4);
});
test('documented optional per_page hint handles server page size', async () => {
  const { acquire } = harness([], (url) =>
    url.includes('/builds?page=')
      ? response(
          Number(new URL(url).searchParams.get('page')) === 1 ? [build(1), build(2)] : [build(3)],
          { per_page: 2 },
        )
      : undefined,
  );
  assert.equal((await acquire()).length, 3);
});
test('empty history is valid', async () => assert.deepEqual(await harness([]).acquire(), []));
test('later page read failure cannot publish partial snapshot or overwrite existing file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'history-'));
  const output = join(directory, 'snapshot.json');
  try {
    await generateSnapshot(output, { acquire: harness().acquire });
    const before = await readFile(output, 'utf8');
    const { acquire } = harness(
      Array.from({ length: 101 }, (_, n) => build(n + 1)),
      (url) => (url.includes('page=2') ? new Response('', { status: 503 }) : undefined),
    );
    await assert.rejects(() => generateSnapshot(output, { acquire }));
    assert.equal(await readFile(output, 'utf8'), before);
    assert.deepEqual(await readdir(directory), ['snapshot.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('bounded runaway pagination fails rather than returning partial history', async () => {
  const { acquire } = harness([], (url) =>
    url.includes('/builds?page=')
      ? response(
          Array.from({ length: 100 }, (_, n) =>
            build(Number(new URL(url).searchParams.get('page')) * 100 + n),
          ),
        )
      : undefined,
  );
  await assert.rejects(acquire, { category: 'pagination-limit' });
});
