import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { createWorker } from './worker.ts';

const issuer = 'https://fictional-team.cloudflareaccess.com',
  audience = 'a'.repeat(64);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const worker = createWorker(
  createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'fixture' }] }),
);
const origin = 'https://api-test.djamespoer.com';
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./identity.sql', import.meta.url), 'utf8'));
  const database = {
    prepare(sql) {
      const values = [];
      return {
        sql,
        values,
        bind(...args) {
          values.push(...args);
          return this;
        },
        async first() {
          return db.prepare(sql).get(...values) ?? null;
        },
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = statements.map((s) => db.prepare(s.sql).run(...s.values));
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return {
    db,
    env: {
      ACCESS_ISSUER: issuer,
      ACCESS_AUDIENCE: audience,
      IDENTITY_DB: database,
      TEST_BOOTSTRAP_ENABLED: 'true',
    },
  };
}
async function request(path, subject = 'fictional-one', options = {}) {
  const jwt = await new SignJWT({ type: 'app', email: 'fictional@example.invalid' })
    .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  return new Request(origin + path, {
    ...options,
    headers: {
      'Cf-Access-Jwt-Assertion': jwt,
      Origin: origin,
      'Sec-Fetch-Site': 'same-origin',
      ...options.headers,
    },
  });
}
async function bootstrap(env, subject, options = {}) {
  return worker.fetch(
    await request('/api/thingamajob/bootstrap', subject, { method: 'POST', ...options }),
    env,
  );
}
test('remote humans create distinct workspaces and both cross-client directions deny', async () => {
  const { db, env } = fixture();
  try {
    const one = await (await bootstrap(env, 'fictional-one')).json();
    const two = await (
      await bootstrap(env, 'fictional-two', {
        body: JSON.stringify({
          subject: 'fictional-one',
          workspaceId: one.workspaceId,
          actorId: 'forged',
          owner: true,
        }),
      })
    ).json();
    assert.notEqual(one.workspaceId, two.workspaceId);
    for (const [subject, workspace, status] of [
      ['fictional-one', one.workspaceId, 200],
      ['fictional-two', two.workspaceId, 200],
      ['fictional-one', two.workspaceId, 403],
      ['fictional-two', one.workspaceId, 403],
    ]) {
      const response = await worker.fetch(
        await request(`/api/thingamajob/workspaces/${workspace}/access`, subject),
        env,
      );
      assert.equal(response.status, status);
      assert.deepEqual(
        await response.json(),
        status === 200 ? { authorized: true, operation: 'owner' } : { error: 'Access denied' },
      );
      assert.ok(!response.headers.get('content-type').includes('text/html'));
    }
    env.TEST_REFERENCE_WORKSPACE = one.workspaceId;
    const reference = await worker.fetch(
      await request('/api/thingamajob/test/reference-access', 'fictional-two'),
      env,
    );
    assert.equal(reference.status, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM thingamajob_actors').get().n, 2);
  } finally {
    db.close();
  }
});
test('bootstrap is idempotent and simultaneous requests cannot duplicate ownership', async () => {
  const { db, env } = fixture();
  try {
    const responses = await Promise.all([
      bootstrap(env, 'fictional-one'),
      bootstrap(env, 'fictional-one'),
    ]);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    assert.equal(bodies[0].workspaceId, bodies[1].workspaceId);
    assert.equal(
      (await (await bootstrap(env, 'fictional-one')).json()).workspaceId,
      bodies[0].workspaceId,
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM thingamajob_workspaces').get().n, 1);
  } finally {
    db.close();
  }
});
test('revoked ownership cannot be repaired or replaced through bootstrap', async () => {
  const { db, env } = fixture();
  try {
    await bootstrap(env, 'fictional-one');
    db.exec('UPDATE thingamajob_memberships SET active=0');
    assert.equal((await bootstrap(env, 'fictional-one')).status, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM thingamajob_workspaces').get().n, 1);
  } finally {
    db.close();
  }
});
test('a failed dependent insert rolls back the entire bootstrap batch', async () => {
  const { db, env } = fixture();
  try {
    db.exec(
      "CREATE TRIGGER deny_workspace BEFORE INSERT ON thingamajob_workspaces BEGIN SELECT RAISE(ABORT,'fixture failure'); END;",
    );
    const result = await bootstrap(env, 'fictional-one');
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { error: 'Service unavailable' });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM thingamajob_actors').get().n, 0);
  } finally {
    db.close();
  }
});
test('TEST bootstrap is disabled by default and unavailable on LIVE/alternate origins', async () => {
  const { db, env } = fixture();
  try {
    assert.equal(
      (await bootstrap({ ...env, TEST_BOOTSTRAP_ENABLED: undefined }, 'fictional-one')).status,
      404,
    );
    const base = await request('/api/thingamajob/bootstrap', 'fictional-one', { method: 'POST' });
    const live = new Request('https://api.djamespoer.com/api/thingamajob/bootstrap', base);
    assert.equal((await worker.fetch(live, env)).status, 404);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM thingamajob_actors').get().n, 0);
  } finally {
    db.close();
  }
});
test('missing/forged assertions and cross-site or missing Origin cannot bootstrap', async () => {
  const { db, env } = fixture();
  try {
    for (const headers of [
      { Origin: origin },
      { Origin: origin, 'Cf-Access-Jwt-Assertion': 'forged' },
    ])
      assert.equal(
        (
          await worker.fetch(
            new Request(origin + '/api/thingamajob/bootstrap', { method: 'POST', headers }),
            env,
          )
        ).status,
        403,
      );
    for (const headers of [
      { Origin: 'https://attacker.example.invalid' },
      { Origin: '' },
      { 'Sec-Fetch-Site': 'cross-site' },
    ])
      assert.equal((await bootstrap(env, 'fictional-one', { headers })).status, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM thingamajob_actors').get().n, 0);
  } finally {
    db.close();
  }
});
test('TEST start page has native semantics, nonce CSP and no cookie/storage access', async () => {
  const { db, env } = fixture();
  try {
    const response = await worker.fetch(await request('/api/thingamajob/test/start'), env);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal((html.match(/<main>/g) ?? []).length, 1);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.match(html, /<button type="button"/);
    assert.match(html, /aria-live="polite"/);
    assert.ok(!/document\.cookie|CF_Authorization|localStorage|sessionStorage/.test(html));
    const nonce = /<script nonce="([^"]+)"/.exec(html)[1];
    assert.ok(
      response.headers.get('content-security-policy').includes(`script-src 'nonce-${nonce}'`),
    );
    assert.ok(
      !response.headers.get('content-security-policy').includes("script-src 'unsafe-inline'"),
    );
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    db.close();
  }
});
