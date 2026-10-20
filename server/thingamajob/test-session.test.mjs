import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evidenceFixture, signedEvidenceRequest } from './evidence-fixtures.mjs';
const root = '/api/thingamajob/test/';

test('TEST reauthentication is a fixed Access handoff, not an authority or open redirect', async () => {
  const f = evidenceFixture();
  try {
    const request = new Request('https://api-test.djamespoer.com' + root + 'sign-in?view=evaluate');
    const response = await f.worker.fetch(request, f.env);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const login = new URL(response.headers.get('Location'));
    assert.equal(login.origin, f.env.ACCESS_ISSUER);
    assert.equal(login.pathname, '/cdn-cgi/access/login/api-test.djamespoer.com');
    assert.equal(login.searchParams.get('kid'), f.env.ACCESS_AUDIENCE);
    assert.equal(login.searchParams.get('redirect_url'), root + 'app/?resume=evaluate');
    assert.equal(
      (
        await f.worker.fetch(
          new Request(request.url.replace('evaluate', 'https://evil.invalid')),
          f.env,
        )
      ).status,
      400,
    );
    assert.equal(
      (await f.worker.fetch(request, { ...f.env, TEST_BOOTSTRAP_ENABLED: 'false' })).status,
      404,
    );
    assert.equal(
      (await f.worker.fetch(new Request(request.url.replace('api-test.', 'api.')), f.env)).status,
      404,
    );
    assert.equal(
      (await f.worker.fetch(new Request(request.url, { method: 'POST' }), f.env)).status,
      405,
    );
    assert.equal(
      (
        await f.worker.fetch(
          new Request('https://api-test.djamespoer.com' + root + 'session'),
          f.env,
        )
      ).status,
      403,
    );
  } finally {
    f.db.close();
  }
});

test('new human session restores the existing owner; revocation stays denied with no provisioning', async () => {
  const f = evidenceFixture();
  try {
    f.env.TEST_UI = { fetch: async () => new Response('fictional shell') };
    const counts = () => f.db.prepare('SELECT COUNT(*) n FROM thingamajob_workspaces').get().n;
    const before = counts();
    assert.equal(
      (await f.worker.fetch(await signedEvidenceRequest(root + 'session'), f.env)).status,
      200,
    );
    const restored = await f.worker.fetch(
      await signedEvidenceRequest(root + 'app/?resume=evaluate'),
      f.env,
    );
    assert.equal(restored.status, 302);
    assert.equal(restored.headers.get('Location'), root + 'app/#/evaluate');
    assert.equal(
      (
        await f.worker.fetch(
          new Request('https://api-test.djamespoer.com' + root + 'app/?resume=evaluate'),
          f.env,
        )
      ).status,
      403,
    );
    assert.equal(
      (await f.worker.fetch(await signedEvidenceRequest(root + 'session', 'unknown'), f.env))
        .status,
      403,
    );
    f.db.exec("UPDATE thingamajob_memberships SET active=0 WHERE actor_id='actor-one'");
    assert.equal(
      (await f.worker.fetch(await signedEvidenceRequest(root + 'session'), f.env)).status,
      403,
    );
    assert.equal(
      (await f.worker.fetch(await signedEvidenceRequest(root + 'session', 'two'), f.env)).status,
      200,
    );
    assert.equal(counts(), before);
  } finally {
    f.db.close();
  }
});
