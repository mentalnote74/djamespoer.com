import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createWorker } from './worker.ts';

const issuer = 'https://fictional-team.cloudflareaccess.com';
const audience = 'b'.repeat(64);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const worker = createWorker(
  createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'test' }] }),
);
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./identity.sql', import.meta.url), 'utf8'));
  for (const suffix of ['one', 'two']) {
    db.prepare('INSERT INTO thingamajob_actors VALUES (?, ?, ?, 1)').run(
      `actor-${suffix}`,
      issuer,
      `subject-${suffix}`,
    );
    db.prepare('INSERT INTO thingamajob_workspaces VALUES (?, ?, 1)').run(
      `workspace-${suffix}`,
      `actor-${suffix}`,
    );
    db.prepare('INSERT INTO thingamajob_memberships VALUES (?, ?, 1)').run(
      `actor-${suffix}`,
      `workspace-${suffix}`,
    );
  }
  return {
    db,
    env: {
      ACCESS_ISSUER: issuer,
      ACCESS_AUDIENCE: audience,
      IDENTITY_DB: {
        prepare(sql) {
          return {
            bind(...values) {
              return {
                async first() {
                  return db.prepare(sql).get(...values) ?? null;
                },
              };
            },
          };
        },
      },
    },
  };
}
async function request(workspace = 'one', subject = 'one') {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ type: 'app', email: 'fictional@example.invalid' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(`subject-${subject}`)
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(privateKey);
  return new Request(
    `https://api.example.invalid/api/thingamajob/workspaces/workspace-${workspace}/access?actorId=actor-${workspace}&role=owner`,
    {
      headers: { 'Cf-Access-Jwt-Assertion': jwt, 'X-Actor-Id': `actor-${workspace}` },
    },
  );
}
test('Worker composes signed Access with SQLite ownership for two isolated owners', async () => {
  const { db, env } = fixture();
  try {
    for (const [target, subject, status] of [
      ['one', 'one', 200],
      ['two', 'two', 200],
      ['one', 'two', 403],
      ['two', 'one', 403],
    ]) {
      const result = await worker.fetch(await request(target, subject), env);
      assert.equal(result.status, status);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
      assert.deepEqual(
        await result.json(),
        status === 200 ? { authorized: true, operation: 'owner' } : { error: 'Access denied' },
      );
    }
  } finally {
    db.close();
  }
});

async function storageRequest(target = 'one', subject = 'one', own = false) {
  const signed = await request(target, subject);
  return new Request(
    'https://api-test.djamespoer.com' +
      (own
        ? '/api/thingamajob/test/storage'
        : `/api/thingamajob/workspaces/workspace-${target}/storage`) +
      '?key=workspaces/workspace-two/private&subject=subject-two&owner=true',
    { headers: signed.headers },
  );
}

test('TEST storage probes are owner-scoped, server-keyed and read-only for both clients', async () => {
  const { db, env } = fixture();
  env.TEST_BOOTSTRAP_ENABLED = 'true';
  const keys = [];
  env.PRIVATE_ORIGINALS = {
    async head(key) {
      keys.push(key);
      return null;
    },
  };
  const before = db.prepare('SELECT * FROM thingamajob_memberships').all();
  try {
    for (const [target, subject, status] of [
      ['one', 'one', 200],
      ['two', 'two', 200],
      ['one', 'two', 403],
      ['two', 'one', 403],
    ]) {
      const response = await worker.fetch(await storageRequest(target, subject), env);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.deepEqual(
        await response.json(),
        status === 200
          ? { authorized: true, d1: 'ready', r2: 'ready' }
          : { error: 'Access denied' },
      );
    }
    assert.equal(keys.length, 2);
    assert.match(keys[0], /^workspaces\/workspace-one\/_readiness\/[a-f0-9-]{36}$/);
    assert.match(keys[1], /^workspaces\/workspace-two\/_readiness\/[a-f0-9-]{36}$/);
    assert.deepEqual(db.prepare('SELECT * FROM thingamajob_memberships').all(), before);
    for (const subject of ['one', 'two'])
      assert.equal(
        (await worker.fetch(await storageRequest('one', subject, true), env)).status,
        200,
      );
  } finally {
    db.close();
  }
});

test('storage denies untrusted/unprovisioned identity before touching R2', async () => {
  const { db, env } = fixture();
  env.TEST_BOOTSTRAP_ENABLED = 'true';
  let calls = 0;
  env.PRIVATE_ORIGINALS = {
    async head() {
      calls++;
      return null;
    },
  };
  try {
    const valid = await storageRequest();
    for (const headers of [{}, { 'Cf-Access-Jwt-Assertion': 'forged', 'X-Actor-Id': 'actor-one' }])
      assert.equal((await worker.fetch(new Request(valid.url, { headers }), env)).status, 403);
    assert.equal(
      (await worker.fetch(await storageRequest('one', 'unknown', true), env)).status,
      403,
    );
    db.exec('UPDATE thingamajob_memberships SET active = 0');
    assert.equal((await worker.fetch(await storageRequest(), env)).status, 403);
    assert.equal(calls, 0);
  } finally {
    db.close();
  }
});

test('revocation during R2 probe fails closed; provider details are never returned', async () => {
  const { db, env } = fixture();
  env.TEST_BOOTSTRAP_ENABLED = 'true';
  try {
    env.PRIVATE_ORIGINALS = {
      async head() {
        db.exec('UPDATE thingamajob_memberships SET active = 0');
        return { key: 'private-metadata' };
      },
    };
    const revoked = await worker.fetch(await storageRequest(), env);
    assert.equal(revoked.status, 403);
    assert.deepEqual(await revoked.json(), { error: 'Access denied' });
    db.exec('UPDATE thingamajob_memberships SET active = 1');
    env.PRIVATE_ORIGINALS = {
      async head() {
        throw new Error('private-provider-detail');
      },
    };
    const failed = await worker.fetch(await storageRequest(), env);
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Service unavailable' });
    delete env.PRIVATE_ORIGINALS;
    assert.equal((await worker.fetch(await storageRequest(), env)).status, 503);
  } finally {
    db.close();
  }
});

test('storage routes are disabled outside TEST and accept no writes', async () => {
  const { db, env } = fixture();
  try {
    const valid = await storageRequest();
    assert.equal((await worker.fetch(valid, env)).status, 404);
    env.TEST_BOOTSTRAP_ENABLED = 'true';
    for (const origin of ['https://api.djamespoer.com', 'https://other.example.invalid'])
      assert.equal(
        (
          await worker.fetch(
            new Request(valid.url.replace('https://api-test.djamespoer.com', origin), {
              headers: valid.headers,
            }),
            env,
          )
        ).status,
        404,
      );
    const method = await worker.fetch(
      new Request(valid.url, { method: 'POST', headers: valid.headers, body: 'fictional' }),
      env,
    );
    assert.equal(method.status, 405);
    assert.equal(method.headers.get('Allow'), 'GET');
  } finally {
    db.close();
  }
});
test('Worker rejects missing/forged identity, unknown subjects and revoked owners', async () => {
  const { db, env } = fixture();
  try {
    const valid = await request();
    for (const headers of [{}, { 'Cf-Access-Jwt-Assertion': 'forged', 'X-Actor-Id': 'actor-one' }])
      assert.equal((await worker.fetch(new Request(valid.url, { headers }), env)).status, 403);
    assert.equal((await worker.fetch(await request('one', 'unknown'), env)).status, 403);
    db.exec('UPDATE thingamajob_memberships SET active = 0');
    assert.equal((await worker.fetch(await request(), env)).status, 403);
  } finally {
    db.close();
  }
});
test('Worker never serves SPA HTML or exposes binding/provider errors', async () => {
  const { db, env } = fixture();
  try {
    assert.equal(
      (await worker.fetch(new Request('https://api.example.invalid/about'), env)).status,
      404,
    );
    const req = await request();
    const method = await worker.fetch(
      new Request(req.url, { method: 'POST', body: '{"owner":true}' }),
      env,
    );
    assert.equal(method.status, 405);
    assert.equal(method.headers.get('Allow'), 'GET');
    const missing = await worker.fetch(req, { ...env, IDENTITY_DB: undefined });
    assert.equal(missing.status, 503);
    assert.deepEqual(await missing.json(), { error: 'Service unavailable' });
    const failed = await worker.fetch(req, {
      ...env,
      IDENTITY_DB: {
        prepare() {
          throw new Error('private-provider-detail');
        },
      },
    });
    assert.equal(failed.status, 403);
    assert.deepEqual(await failed.json(), { error: 'Access denied' });
  } finally {
    db.close();
  }
});
