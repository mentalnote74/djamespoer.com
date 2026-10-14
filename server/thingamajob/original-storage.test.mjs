import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { createAccessIdentityAdapter } from './access-identity.ts';
import { authorizeWorkspace } from './workspace-access.ts';
import { storeOriginal, verifyOriginal } from './original-storage.ts';
import { createWorker } from './worker.ts';

const issuer = 'https://fictional-team.cloudflareaccess.com',
  audience = 'c'.repeat(64);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'fictional' }] });
const authenticate = createAccessIdentityAdapter({ issuer, audience }, keys);
async function signed(
  subject = 'one',
  path = '/api/thingamajob/test/storage-roundtrip',
  options = {},
) {
  const jwt = await new SignJWT({ type: 'app', email: 'fictional@example.invalid' })
    .setProtectedHeader({ alg: 'RS256', kid: 'fictional' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  return new Request('https://api-test.djamespoer.com' + path, {
    ...options,
    headers: {
      'Cf-Access-Jwt-Assertion': jwt,
      Origin: 'https://api-test.djamespoer.com',
      'Sec-Fetch-Site': 'same-origin',
      ...options.headers,
    },
  });
}
function adapter(db) {
  return {
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
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
function fixture(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(readFileSync(new URL('./identity.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('./originals.sql', import.meta.url), 'utf8'));
  for (const s of ['one', 'two']) {
    db.prepare('INSERT INTO thingamajob_actors VALUES (?,?,?,1)').run('actor-' + s, issuer, s);
    db.prepare('INSERT INTO thingamajob_workspaces VALUES (?,?,1)').run(
      'workspace-' + s,
      'actor-' + s,
    );
    db.prepare('INSERT INTO thingamajob_memberships VALUES (?,?,1)').run(
      'actor-' + s,
      'workspace-' + s,
    );
  }
  const database = adapter(db),
    objects = new Map();
  const bucket = {
    async put(key, bytes, options) {
      assert.deepEqual(options, { onlyIf: { etagDoesNotMatch: '*' } });
      if (objects.has(key)) return null;
      objects.set(key, Uint8Array.from(bytes));
      return {};
    },
    async get(key) {
      const bytes = objects.get(key);
      return bytes
        ? {
            async arrayBuffer() {
              return Uint8Array.from(bytes).buffer;
            },
          }
        : null;
    },
    async head(key) {
      return objects.has(key) ? {} : null;
    },
  };
  return {
    db,
    database,
    objects,
    bucket,
    async scope(subject = 'one') {
      return authorizeWorkspace(
        database,
        await authenticate(await signed(subject)),
        'workspace-' + subject,
        'owner',
      );
    },
  };
}
const bytes = new TextEncoder().encode('Only fictional storage fixture data.');
function counts(db) {
  return [
    db.prepare('SELECT count(*) AS n FROM thingamajob_originals').get().n,
    db.prepare('SELECT count(*) AS n FROM thingamajob_original_history').get().n,
  ];
}

test('immutable originals commit with one atomic creation history and workspace-scoped retries', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    const created = await storeOriginal(f.database, f.bucket, scope, 'retry-one', bytes);
    assert.deepEqual(await verifyOriginal(f.database, f.bucket, scope, created.sourceId), {
      committed: true,
      integrity: 'verified',
      version: 1,
    });
    const retry = await storeOriginal(f.database, f.bucket, scope, 'retry-one', bytes);
    assert.equal(retry.sourceId, created.sourceId);
    assert.equal(retry.replayed, true);
    assert.deepEqual(counts(f.db), [1, 1]);
    assert.equal(f.objects.size, 1);
    const second = await storeOriginal(
      f.database,
      f.bucket,
      await f.scope('two'),
      'retry-one',
      bytes,
    );
    assert.notEqual(second.sourceId, created.sourceId);
    assert.deepEqual(counts(f.db), [2, 2]);
    await assert.rejects(
      verifyOriginal(f.database, f.bucket, await f.scope('two'), created.sourceId),
    );
    await assert.rejects(verifyOriginal(f.database, f.bucket, scope, second.sourceId));
    for (const key of f.objects.keys())
      assert.match(key, /^workspaces\/workspace-(one|two)\/originals\/[a-f0-9-]{36}$/);
  } finally {
    f.db.close();
  }
});
test('same request with changed bytes and incorrect expected version conflict without writes', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    await storeOriginal(f.database, f.bucket, scope, 'same', bytes);
    await assert.rejects(
      storeOriginal(f.database, f.bucket, scope, 'same', new TextEncoder().encode('different')),
    );
    await assert.rejects(storeOriginal(f.database, f.bucket, scope, 'next', bytes, 1));
    assert.equal(f.objects.size, 1);
    assert.deepEqual(counts(f.db), [1, 1]);
  } finally {
    f.db.close();
  }
});
test('R2 failure or conditional-write refusal creates no usable D1 source/history', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    for (const put of [
      async () => {
        throw new Error('private-provider-error');
      },
      async () => null,
    ])
      await assert.rejects(
        storeOriginal(f.database, { ...f.bucket, put }, scope, 'failure', bytes),
      );
    assert.deepEqual(counts(f.db), [0, 0]);
  } finally {
    f.db.close();
  }
});
test('R2 success plus D1 failure preserves inaccessible orphan and dependent failure rolls back', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    f.db.exec(
      "CREATE TRIGGER fail_history BEFORE INSERT ON thingamajob_original_history BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;",
    );
    await assert.rejects(storeOriginal(f.database, f.bucket, scope, 'failed-commit', bytes));
    assert.deepEqual(counts(f.db), [0, 0]);
    assert.equal(f.objects.size, 1);
    const sourceId = [...f.objects.keys()][0].split('/').at(-1);
    await assert.rejects(verifyOriginal(f.database, f.bucket, scope, sourceId));
    f.db.exec('DROP TRIGGER fail_history');
    const recovered = await storeOriginal(f.database, f.bucket, scope, 'failed-commit', bytes);
    assert.equal(recovered.replayed, false);
    assert.equal(f.objects.size, 2);
    assert.deepEqual(counts(f.db), [1, 1]);
  } finally {
    f.db.close();
  }
});
test('revocation at commit produces no parent or dependent history and never deletes orphan', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    const bucket = {
      ...f.bucket,
      async put(...args) {
        const result = await f.bucket.put(...args);
        f.db.exec('UPDATE thingamajob_memberships SET active=0');
        return result;
      },
    };
    await assert.rejects(storeOriginal(f.database, bucket, scope, 'revoked', bytes));
    assert.deepEqual(counts(f.db), [0, 0]);
    assert.equal(f.objects.size, 1);
  } finally {
    f.db.close();
  }
});
test('guarded zero-parent insert causes FK failure and full batch rollback', async () => {
  const f = fixture();
  try {
    await assert.rejects(
      f.database.batch([
        f.database
          .prepare(
            `INSERT INTO thingamajob_originals(workspace_id,source_id,request_key,object_key,sha256,byte_length,version)
        SELECT 'workspace-one','fictional-source','fictional-request','fictional-key',?,1,1 WHERE 0`,
          )
          .bind('a'.repeat(64)),
        f.database.prepare(
          "INSERT INTO thingamajob_original_history VALUES ('workspace-one','fictional-source',1,'actor-one','created',unixepoch())",
        ),
      ]),
    );
    assert.deepEqual(counts(f.db), [0, 0]);
  } finally {
    f.db.close();
  }
});
test('concurrent same request commits one winner/history, retaining any private orphan', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    const saved = await Promise.all([
      storeOriginal(f.database, f.bucket, scope, 'parallel', bytes),
      storeOriginal(f.database, f.bucket, scope, 'parallel', bytes),
    ]);
    assert.equal(saved[0].sourceId, saved[1].sourceId);
    assert.deepEqual(counts(f.db), [1, 1]);
  } finally {
    f.db.close();
  }
});
test('D1 metadata/history and retries survive closing and reopening the database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fictional-storage-')),
    path = join(dir, 'state.sqlite'),
    f = fixture(path);
  let reopened;
  try {
    const saved = await storeOriginal(f.database, f.bucket, await f.scope(), 'durable', bytes);
    f.db.close();
    reopened = new DatabaseSync(path);
    const database = adapter(reopened);
    const scope = await authorizeWorkspace(
      database,
      await authenticate(await signed()),
      'workspace-one',
      'owner',
    );
    const replay = await storeOriginal(database, f.bucket, scope, 'durable', bytes);
    assert.equal(replay.sourceId, saved.sourceId);
    assert.equal(replay.replayed, true);
    assert.deepEqual(counts(reopened), [1, 1]);
  } finally {
    reopened?.close();
    if (f.db.isOpen) f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('retrieval detects missing originals and integrity corruption', async () => {
  const f = fixture();
  try {
    const scope = await f.scope(),
      saved = await storeOriginal(f.database, f.bucket, scope, 'integrity', bytes);
    const key = [...f.objects.keys()][0];
    f.objects.set(key, new TextEncoder().encode('tampered'));
    await assert.rejects(verifyOriginal(f.database, f.bucket, scope, saved.sourceId));
    f.objects.delete(key);
    await assert.rejects(verifyOriginal(f.database, f.bucket, scope, saved.sourceId));
  } finally {
    f.db.close();
  }
});
test('byte-size boundary and malformed retry keys reject before storage', async () => {
  const f = fixture();
  try {
    const scope = await f.scope();
    for (const [key, value] of [
      ['bad space', bytes],
      ['empty', new Uint8Array()],
      ['large', new Uint8Array(10000001)],
    ])
      await assert.rejects(storeOriginal(f.database, f.bucket, scope, key, value));
    assert.equal(f.objects.size, 0);
    await storeOriginal(f.database, f.bucket, scope, 'maximum', new Uint8Array(10000000));
    assert.deepEqual(counts(f.db), [1, 1]);
  } finally {
    f.db.close();
  }
});
test('TEST synthetic route ignores supplied owner/key/body, requires CSRF and exposes only safe outcome', async () => {
  const f = fixture();
  const worker = createWorker(keys),
    env = {
      ACCESS_ISSUER: issuer,
      ACCESS_AUDIENCE: audience,
      IDENTITY_DB: f.database,
      PRIVATE_ORIGINALS: f.bucket,
      TEST_BOOTSTRAP_ENABLED: 'true',
    };
  try {
    const options = {
      method: 'POST',
      headers: { 'Idempotency-Key': 'synthetic-run' },
      body: '{"workspaceId":"workspace-two","subject":"two","object_key":"foreign"}',
    };
    const first = await worker.fetch(await signed('one', undefined, options), env);
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), {
      committed: true,
      integrity: 'verified',
      version: 1,
      replayed: false,
    });
    const second = await worker.fetch(await signed('one', undefined, options), env);
    assert.deepEqual(await second.json(), {
      committed: true,
      integrity: 'verified',
      version: 1,
      replayed: true,
    });
    assert.match([...f.objects.keys()][0], /^workspaces\/workspace-one\//);
    const denied = await worker.fetch(
      await signed('one', undefined, {
        ...options,
        headers: { ...options.headers, Origin: 'https://hostile.invalid' },
      }),
      env,
    );
    assert.equal(denied.status, 403);
    assert.equal(f.objects.size, 1);
    const unknown = await worker.fetch(await signed('unknown', undefined, options), env);
    assert.equal(unknown.status, 403);
    const html = await worker.fetch(await signed(), env);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /<button type="button"/);
    const disabled = await worker.fetch(await signed(), {
      ...env,
      TEST_BOOTSTRAP_ENABLED: undefined,
    });
    assert.equal(disabled.status, 404);
    env.PRIVATE_ORIGINALS = {
      ...f.bucket,
      async put() {
        throw new Error('private-provider-detail');
      },
    };
    const failed = await worker.fetch(
      await signed('one', undefined, { method: 'POST', headers: { 'Idempotency-Key': 'fails' } }),
      env,
    );
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Service unavailable' });
  } finally {
    f.db.close();
  }
});
