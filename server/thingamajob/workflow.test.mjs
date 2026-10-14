import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
function fixture() {
  const f = evidenceFixture();
  for (const file of ['assertions.sql', 'unknowns.sql'])
    f.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  return f;
}
test('read-only Angular snapshot is own-owner scoped and empty LoT/evidence is valid for either fictional client', async () => {
  const f = fixture();
  try {
    for (const subject of ['one', 'two']) {
      const response = await f.worker.fetch(
        await signedEvidenceRequest('/api/thingamajob/test/workflow', subject),
        f.env,
      );
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        workspaceId: 'workspace-' + subject,
        evidence: [],
        proposals: [],
        unknowns: [],
        limit: 100,
      });
    }
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_actors').get().n, 2);
  } finally {
    f.db.close();
  }
});
test('snapshot never accepts forged scope, leaks peer evidence or provisions pending identities', async () => {
  const f = fixture();
  try {
    const upload = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/workspaces/workspace-one/evidence', 'one', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'fixture-source' },
        body: uploadForm(),
      }),
      f.env,
    );
    assert.equal(upload.status, 200);
    const peer = await f.worker.fetch(
      await signedEvidenceRequest(
        '/api/thingamajob/test/workflow?workspaceId=workspace-one&role=owner',
        'two',
        {
          headers: {
            'X-Actor-Id': 'actor-one',
            'X-Workspace-Id': 'workspace-one',
            'X-Role': 'owner',
          },
        },
      ),
      f.env,
    );
    const data = await peer.json();
    assert.equal(data.workspaceId, 'workspace-two');
    assert.deepEqual(data.evidence, []);
    assert.equal(
      (
        await f.worker.fetch(
          await signedEvidenceRequest('/api/thingamajob/test/workflow', 'unapproved'),
          f.env,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.worker.fetch(
          await signedEvidenceRequest('/api/thingamajob/test/workflow', 'one', {
            method: 'POST',
            body: '{}',
          }),
          f.env,
        )
      ).status,
      405,
    );
    assert.equal(
      (
        await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/workflow'), {
          ...f.env,
          TEST_BOOTSTRAP_ENABLED: undefined,
        })
      ).status,
      404,
    );
  } finally {
    f.db.close();
  }
});
test('Angular assets require verified Access, TEST gating and explicit binding; no root or archive fallback', async () => {
  const f = fixture();
  let reads = 0;
  f.env.TEST_UI = {
    async fetch(request) {
      reads++;
      assert.equal(new URL(request.url).pathname, '/index.html');
      return new Response('<!doctype html><html></html>', {
        headers: { 'Content-Type': 'text/html' },
      });
    },
  };
  try {
    const response = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/app/'),
      f.env,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    const forged = await signedEvidenceRequest('/api/thingamajob/test/app/');
    forged.headers.set('Cf-Access-Jwt-Assertion', 'forged.token.value');
    assert.equal((await f.worker.fetch(forged, f.env)).status, 403);
    assert.equal(reads, 1);
    for (const path of [
      '/main.js',
      '/api/thingamajob/test/app/career-source.txt',
      '/api/thingamajob/test/app/archive.pdf',
    ])
      assert.equal((await f.worker.fetch(await signedEvidenceRequest(path), f.env)).status, 404);
    assert.equal(
      (
        await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/app/'), {
          ...f.env,
          TEST_UI: undefined,
        })
      ).status,
      503,
    );
    const live = await signedEvidenceRequest('/api/thingamajob/test/app/');
    assert.equal(
      (await f.worker.fetch(new Request(live.url.replace('api-test.', 'api.'), live), f.env))
        .status,
      404,
    );
  } finally {
    f.db.close();
  }
});
test('revocation during snapshot read fails closed and never returns stale private data', async () => {
  const f = fixture();
  const original = f.database.prepare.bind(f.database);
  f.database.prepare = (sql) => {
    const statement = original(sql);
    if (sql.startsWith('SELECT w.workspace_id,\n')) {
      const first = statement.first.bind(statement);
      statement.first = async () => {
        const result = await first();
        f.db.exec('UPDATE thingamajob_memberships SET active=0');
        return result;
      };
    }
    return statement;
  };
  try {
    const response = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/workflow'),
      f.env,
    );
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'Access denied' });
  } finally {
    f.db.close();
  }
});
