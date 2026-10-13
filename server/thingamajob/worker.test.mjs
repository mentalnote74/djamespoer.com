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
