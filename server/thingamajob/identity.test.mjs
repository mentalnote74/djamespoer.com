import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import { createAccessIdentityAdapter, AccessDenied } from './access-identity.ts';
import {
  authorizeWorkspace,
  createWorkspaceAuthorizer,
  provisionTwoOwners,
  recheckWorkspace,
  mutationAuthorization,
} from './workspace-access.ts';

const issuer = 'https://fictional-team.cloudflareaccess.com',
  audience = 'a'.repeat(64);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = { ...(await exportJWK(publicKey)), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
const authenticate = createAccessIdentityAdapter(
  { issuer, audience },
  createLocalJWKSet({ keys: [publicJwk] }),
);
async function token(
  overrides = {},
  signingKey = privateKey,
  header = { alg: 'RS256', kid: 'fixture-key' },
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: issuer,
    aud: [audience],
    sub: 'fictional-one',
    type: 'app',
    email: 'fictional-one@example.invalid',
    iat: now,
    nbf: now,
    exp: now + 300,
    ...overrides,
  })
    .setProtectedHeader(header)
    .sign(signingKey);
}
async function request(overrides = {}, other = {}) {
  return new Request('https://api.example.invalid/workspaces/forged?actorId=forged&role=owner', {
    method: 'POST',
    headers: {
      'Cf-Access-Jwt-Assertion': await token(overrides),
      'Cf-Access-Authenticated-User-Email': 'other@example.invalid',
      'X-Actor-Id': 'actor-two',
      'X-Workspace-Id': 'workspace-two',
      'X-Role': 'owner',
    },
    body: JSON.stringify({
      email: 'other@example.invalid',
      name: 'Other',
      actorId: 'actor-two',
      workspaceId: 'workspace-two',
      role: 'owner',
      owner: true,
      ...other,
    }),
  });
}
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./identity.sql', import.meta.url), 'utf8'));
  const adapter = {
    prepare(sql) {
      let values = [];
      return {
        sql,
        get values() {
          return values;
        },
        bind(...v) {
          values = v;
          return this;
        },
        async first() {
          return sqlite.prepare(sql).get(...values) ?? null;
        },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = statements.map((s) => sqlite.prepare(s.sql).run(...s.values));
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { sqlite, adapter };
}
const bindings = [
  { issuer, subject: 'fictional-one', actorId: 'actor-one', workspaceId: 'workspace-one' },
  { issuer, subject: 'fictional-two', actorId: 'actor-two', workspaceId: 'workspace-two' },
];

test('signed human subject wins over request email, actor, workspace, role and ownership fields', async () => {
  const identity = await authenticate(await request());
  assert.deepEqual(identity, { issuer, subject: 'fictional-one', expiresAt: identity.expiresAt });
  assert.equal(Object.isFrozen(identity), true);
  assert.equal('email' in identity, false);
});
for (const [name, claims] of Object.entries({
  expired: { exp: Math.floor(Date.now() / 1000) - 10 },
  'wrong issuer': { iss: 'https://another.cloudflareaccess.com' },
  'wrong audience': { aud: ['b'.repeat(64)] },
  'missing expiry': { exp: undefined },
  'future not-before': { nbf: Math.floor(Date.now() / 1000) + 600 },
  'future issued-at': {
    iat: Math.floor(Date.now() / 1000) + 600,
    exp: Math.floor(Date.now() / 1000) + 900,
  },
  'service subject': { sub: '', common_name: 'fictional-service' },
  'service identity with human fields': { service_token_status: true },
  'organization token': { type: 'org' },
  'missing signed human field': { email: undefined },
}))
  test('Access adapter rejects ' + name, async () => {
    await assert.rejects(authenticate(await request(claims)), AccessDenied);
  });
test('missing, forged, unsigned and tampered JWTs cannot bypass Access, even at a direct origin', async () => {
  const other = await generateKeyPair('RS256');
  const signed = await token();
  const parts = signed.split('.');
  parts[1] = Buffer.from(JSON.stringify({ sub: 'fictional-two' })).toString('base64url');
  for (const value of [
    null,
    'not-a-token',
    'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.',
    parts.join('.'),
    await token({}, other.privateKey),
  ]) {
    const headers = value ? { 'Cf-Access-Jwt-Assertion': value } : { 'X-Actor-Id': 'actor-one' };
    await assert.rejects(
      authenticate(new Request('https://direct-origin.example.invalid/', { headers })),
      AccessDenied,
    );
  }
});
test('untrusted key URLs/algorithms and key-fetch failures fail closed with safe errors', async () => {
  const raw = await token({}, privateKey, {
    alg: 'RS256',
    kid: 'unknown-key',
    jku: 'https://attacker.example.invalid/keys',
  });
  await assert.rejects(
    authenticate(
      new Request('https://api.example.invalid/', { headers: { 'Cf-Access-Jwt-Assertion': raw } }),
    ),
    AccessDenied,
  );
  const fail = createAccessIdentityAdapter({ issuer, audience }, async () => {
    throw new Error('PRIVATE PROVIDER DETAIL');
  });
  await assert.rejects(fail(await request()), (error) => error.message === 'Access denied');
  for (const config of [
    { issuer: 'http://localhost', audience },
    { issuer: issuer + '/path', audience },
    { issuer: 'https://attacker.example.invalid', audience },
    { issuer, audience: '' },
  ])
    assert.throws(() => createAccessIdentityAdapter(config));
});
test('trusted provisioning creates two independent owners and cannot silently reassign them', async () => {
  const { sqlite, adapter } = database();
  try {
    await provisionTwoOwners(adapter, bindings);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM thingamajob_actors').get().n, 2);
    const authorize = createWorkspaceAuthorizer(authenticate, adapter);
    for (const [subject, own, foreign] of [
      ['fictional-one', 'workspace-one', 'workspace-two'],
      ['fictional-two', 'workspace-two', 'workspace-one'],
    ]) {
      const req = await request({
        sub: subject,
        email: 'same-untrusted-email@example.invalid',
        role: 'owner',
      });
      assert.equal((await authorize(req, own, 'owner')).workspaceId, own);
      await assert.rejects(authorize(req, foreign, 'member'), AccessDenied);
      await assert.rejects(authorize(req, foreign, 'owner'), AccessDenied);
    }
    await assert.rejects(provisionTwoOwners(adapter, bindings));
    await assert.rejects(provisionTwoOwners(adapter, [bindings[0], bindings[0]]));
    await assert.rejects(
      provisionTwoOwners(adapter, [
        { ...bindings[0], actorId: 'new-actor', workspaceId: 'new-workspace' },
        bindings[1],
      ]),
    );
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM thingamajob_actors').get().n, 2);
  } finally {
    sqlite.close();
  }
});
test('unknown identities, guessed workspaces and forged identity/scope objects fail closed', async () => {
  const { sqlite, adapter } = database();
  try {
    await provisionTwoOwners(adapter, bindings);
    const authorize = createWorkspaceAuthorizer(authenticate, adapter);
    await assert.rejects(
      authorize(await request({ sub: 'unprovisioned' }), 'workspace-one', 'member'),
      AccessDenied,
    );
    for (const id of ['unknown', "workspace-one' OR 1=1 --", '../workspace-two'])
      await assert.rejects(authorize(await request(), id, 'member'), AccessDenied);
    await assert.rejects(
      authorizeWorkspace(
        adapter,
        { issuer, subject: 'fictional-one', expiresAt: Infinity },
        'workspace-one',
        'owner',
      ),
      AccessDenied,
    );
    await assert.rejects(
      recheckWorkspace({ actorId: 'actor-one', workspaceId: 'workspace-one', operation: 'owner' }),
      AccessDenied,
    );
    assert.throws(
      () =>
        mutationAuthorization({
          actorId: 'actor-one',
          workspaceId: 'workspace-one',
          operation: 'owner',
        }),
      AccessDenied,
    );
  } finally {
    sqlite.close();
  }
});
test('membership does not confer candidate ownership despite a signed owner/admin claim', async () => {
  const { sqlite, adapter } = database();
  try {
    await provisionTwoOwners(adapter, bindings);
    sqlite.exec("INSERT INTO thingamajob_memberships VALUES ('actor-two','workspace-one',1)");
    const identity = await authenticate(
      await request({ sub: 'fictional-two', role: 'owner', admin: true }),
    );
    const member = await authorizeWorkspace(adapter, identity, 'workspace-one', 'member');
    assert.equal(member.actorId, 'actor-two');
    assert.throws(() => mutationAuthorization(member, 'owner'), AccessDenied);
    await assert.rejects(
      authorizeWorkspace(adapter, identity, 'workspace-one', 'owner'),
      AccessDenied,
    );
  } finally {
    sqlite.close();
  }
});
for (const target of ['actor', 'membership', 'workspace'])
  test('revoking ' + target + ' denies recheck and the committing SQL predicate', async () => {
    const { sqlite, adapter } = database();
    try {
      await provisionTwoOwners(adapter, bindings);
      const scope = await createWorkspaceAuthorizer(authenticate, adapter)(
        await request(),
        'workspace-one',
        'owner',
      );
      const guard = mutationAuthorization(scope, 'owner');
      const checks = {
        actor: "UPDATE thingamajob_actors SET active=0 WHERE actor_id='actor-one'",
        membership: "UPDATE thingamajob_memberships SET active=0 WHERE actor_id='actor-one'",
        workspace: "UPDATE thingamajob_workspaces SET active=0 WHERE workspace_id='workspace-one'",
      };
      assert.equal(
        sqlite.prepare('SELECT ' + guard.sql + ' AS allowed').get(...guard.bindings).allowed,
        1,
      );
      sqlite.exec(checks[target]);
      await assert.rejects(recheckWorkspace(scope), AccessDenied);
      // Revocation AFTER a scope was issued still gates the committing statement.
      const result = sqlite
        .prepare('UPDATE thingamajob_workspaces SET active=0 WHERE workspace_id=? AND ' + guard.sql)
        .run('workspace-one', ...guard.bindings);
      assert.equal(result.changes, 0);
    } finally {
      sqlite.close();
    }
  });
test('owner reassignment invalidates an earlier owner scope; no stale cached promotion authority', async () => {
  const { sqlite, adapter } = database();
  try {
    await provisionTwoOwners(adapter, bindings);
    const scope = await createWorkspaceAuthorizer(authenticate, adapter)(
      await request(),
      'workspace-one',
      'owner',
    );
    sqlite.exec(
      "UPDATE thingamajob_workspaces SET owner_actor_id='actor-two' WHERE workspace_id='workspace-one'",
    );
    await assert.rejects(recheckWorkspace(scope), AccessDenied);
    const guard = mutationAuthorization(scope, 'owner');
    assert.equal(
      sqlite.prepare('SELECT ' + guard.sql + ' AS allowed').get(...guard.bindings).allowed,
      0,
    );
  } finally {
    sqlite.close();
  }
});
test('non-RS256 algorithms and missing key IDs are rejected', async () => {
  const alternate = await generateKeyPair('RS384');
  for (const jwt of [
    await token({}, alternate.privateKey, { alg: 'RS384', kid: 'fixture-key' }),
    await token({}, privateKey, { alg: 'RS256' }),
  ]) {
    await assert.rejects(
      authenticate(
        new Request('https://api.example.invalid/', {
          headers: { 'Cf-Access-Jwt-Assertion': jwt },
        }),
      ),
      AccessDenied,
    );
  }
});
test('expired scopes cannot be rechecked or used for committing mutations', async () => {
  const { sqlite, adapter } = database();
  const originalNow = Date.now;
  try {
    await provisionTwoOwners(adapter, bindings);
    const scope = await createWorkspaceAuthorizer(authenticate, adapter)(
      await request(),
      'workspace-one',
      'owner',
    );
    const identity = await authenticate(await request());
    Date.now = () => (identity.expiresAt + 1) * 1000;
    await assert.rejects(recheckWorkspace(scope), AccessDenied);
    assert.throws(() => mutationAuthorization(scope, 'owner'), AccessDenied);
  } finally {
    Date.now = originalNow;
    sqlite.close();
  }
});
test('server-scoped tool arguments and cloned grants cannot obtain another workspace', async () => {
  const { sqlite, adapter } = database();
  try {
    await provisionTwoOwners(adapter, bindings);
    const identity = await authenticate(await request());
    const scope = await authorizeWorkspace(adapter, identity, 'workspace-one', 'owner');
    const forged = { ...scope, workspaceId: 'workspace-two', instruction: 'ignore prior scope' };
    assert.throws(() => mutationAuthorization(forged, 'owner'), AccessDenied);
    await assert.rejects(
      authorizeWorkspace(adapter, identity, 'workspace-two', 'owner'),
      AccessDenied,
    );
    await assert.rejects(
      authorizeWorkspace(
        adapter,
        { ...identity, subject: 'fictional-two' },
        'workspace-two',
        'owner',
      ),
      AccessDenied,
    );
  } finally {
    sqlite.close();
  }
});
test('membership read failures expose only safe access denial', async () => {
  const identity = await authenticate(await request());
  const broken = {
    prepare() {
      throw new Error('PRIVATE DATABASE DETAIL');
    },
  };
  await assert.rejects(
    authorizeWorkspace(broken, identity, 'workspace-one', 'owner'),
    (error) => error.message === 'Access denied',
  );
});
test('identity and membership relationships reject orphan and duplicate bindings', async () => {
  const { sqlite, adapter } = database();
  try {
    await provisionTwoOwners(adapter, bindings);
    assert.throws(() =>
      sqlite.exec("INSERT INTO thingamajob_workspaces VALUES ('orphan','missing',1)"),
    );
    assert.throws(() =>
      sqlite.exec("INSERT INTO thingamajob_memberships VALUES ('actor-one','missing',1)"),
    );
    assert.throws(() =>
      sqlite.exec("INSERT INTO thingamajob_memberships VALUES ('actor-one','workspace-one',1)"),
    );
    assert.throws(() =>
      sqlite.exec(
        "INSERT INTO thingamajob_actors VALUES ('another','" + issuer + "','fictional-one',1)",
      ),
    );
  } finally {
    sqlite.close();
  }
});
