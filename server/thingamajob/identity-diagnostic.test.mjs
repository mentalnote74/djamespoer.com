import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import { diagnoseIdentity, inspectJwtStructure } from './identity-diagnostic.mjs';

const issuer = 'https://fictional-team.cloudflareaccess.com',
  aud = 'a'.repeat(64);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const keys = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: 'fictional-key' }],
});
async function input(overrides = {}, signer = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: issuer,
    aud,
    sub: 'private-fictional-subject',
    email: 'private@example.invalid',
    type: 'app',
    iat: now,
    exp: now + 60,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'fictional-key' })
    .sign(signer);
  return JSON.stringify({ issuer, aud, jwt });
}
function safe(report, encoded = '') {
  const output = JSON.stringify(report);
  for (const secret of [
    issuer,
    aud,
    'private-fictional-subject',
    'private@example.invalid',
    encoded,
  ])
    if (secret) assert.ok(!output.includes(secret));
}
test('diagnostic identifies JSON/input/structure stages without sensitive output', async () => {
  for (const [value, stage] of [
    ['{', 'JSON parse'],
    ['{}', 'secure-pipe/input'],
    [JSON.stringify({ issuer, aud, jwt: 'bad' }), 'JWT structure'],
  ]) {
    const report = await diagnoseIdentity(value, { keys });
    assert.equal(report.stage, stage);
    assert.equal(report.ok, false);
    safe(report);
  }
});
test('signed valid fixture reports completion without returning subject or JWT', async () => {
  const encoded = await input();
  const report = await diagnoseIdentity(encoded, { keys });
  assert.equal(report.ok, true);
  assert.equal(report.stage, 'subject extraction');
  assert.equal(report.signatureValidationBegan, true);
  assert.equal(report.claimsValidationBegan, true);
  safe(report, JSON.parse(encoded).jwt);
});
for (const [overrides, stage] of [
  [{ iss: 'https://other.cloudflareaccess.com' }, 'issuer validation'],
  [{ aud: 'b'.repeat(64) }, 'audience validation'],
  [{ exp: 1 }, 'token expiry/time validation'],
  [{ type: 'org' }, 'claims validation'],
  [{ sub: '' }, 'subject extraction'],
]) {
  test(`diagnostic distinguishes ${stage}`, async () => {
    const report = await diagnoseIdentity(await input(overrides), { keys });
    assert.equal(report.ok, false);
    assert.equal(report.stage, stage);
    safe(report);
  });
}
test('signature failure does not begin claims validation', async () => {
  const other = await generateKeyPair('RS256');
  const report = await diagnoseIdentity(await input({}, other.privateKey), { keys });
  assert.equal(report.stage, 'signature verification');
  assert.equal(report.errorCode, 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
  assert.equal(report.claimsValidationBegan, false);
  safe(report);
});
test('key retrieval reports HTTP status and whitelisted error, never provider text', async () => {
  const report = await diagnoseIdentity(await input(), {
    fetcher: async () =>
      new Response('private@example.invalid private-fictional-subject', { status: 403 }),
  });
  assert.equal(report.stage, 'signing-key retrieval');
  assert.equal(report.httpStatus, 403);
  assert.equal(report.signatureValidationBegan, false);
  safe(report);
});

test('structure reports only the seven safe booleans for valid input', async () => {
  const encoded = await input();
  const structure = inspectJwtStructure(JSON.parse(encoded).jwt);
  assert.deepEqual(structure, {
    inputPresent: true,
    inputWithinExpectedSize: true,
    containsInternalWhitespace: false,
    hasExactlyThreeJwtSegments: true,
    protectedHeaderDecoded: true,
    algorithmAllowed: true,
    keyIdPresent: true,
  });
  safe(structure, JSON.parse(encoded).jwt);
});
test('whitespace is reported and never stripped before signature validation', async () => {
  const values = JSON.parse(await input());
  for (const jwt of [' ' + values.jwt, values.jwt + '\n', values.jwt.replace('.', '.\n')]) {
    const report = await diagnoseIdentity(JSON.stringify({ ...values, jwt }), { keys });
    assert.equal(report.structure.containsInternalWhitespace, true);
    assert.equal(report.stage, 'JWT structure');
    assert.equal(report.signatureValidationBegan, false);
  }
});
test('empty, oversized and malformed segment counts are individually distinguishable', () => {
  assert.equal(inspectJwtStructure('').inputPresent, false);
  assert.equal(inspectJwtStructure('x'.repeat(16385)).inputWithinExpectedSize, false);
  assert.equal(inspectJwtStructure('a.b').hasExactlyThreeJwtSegments, false);
  assert.equal(inspectJwtStructure('a.b.c.d').hasExactlyThreeJwtSegments, false);
  assert.equal(inspectJwtStructure('a.b.c').protectedHeaderDecoded, false);
});
test('algorithm and key-ID failures stop before signing-key or signature checks', async () => {
  for (const header of [{ alg: 'HS256', kid: 'private-key-id' }, { alg: 'RS256' }]) {
    const jwt =
      Buffer.from(JSON.stringify(header)).toString('base64url') +
      '.' +
      Buffer.from('{}').toString('base64url') +
      '.fictional';
    const report = await diagnoseIdentity(JSON.stringify({ issuer, aud, jwt }), { keys });
    assert.equal(report.structure.protectedHeaderDecoded, true);
    assert.equal(report.structure.algorithmAllowed, header.alg === 'RS256');
    assert.equal(report.structure.keyIdPresent, !!header.kid);
    assert.equal(report.signatureValidationBegan, false);
    assert.equal(report.claimsValidationBegan, false);
    assert.ok(!JSON.stringify(report).includes('private-key-id'));
  }
});
