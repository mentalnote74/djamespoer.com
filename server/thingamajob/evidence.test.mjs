import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvidence, boundedBytes } from './evidence-validation.ts';
import {
  evidenceFixture,
  fictionalDocx,
  fictionalPdf,
  signedEvidenceRequest,
  uploadForm,
} from './evidence-fixtures.mjs';
const enc = new TextEncoder(),
  bytes = enc.encode('Fictional UTF-8 fixture. No career facts.');
const collection = '/api/thingamajob/workspaces/workspace-one/evidence';
async function upload(
  f,
  form = uploadForm(),
  key = 'fictional-request',
  subject = 'one',
  path = collection,
  headers = {},
) {
  return f.worker.fetch(
    await signedEvidenceRequest(path, subject, {
      method: 'POST',
      headers: { 'Idempotency-Key': key, ...headers },
      body: form,
    }),
    f.env,
  );
}
function counts(f) {
  return ['thingamajob_originals', 'thingamajob_original_history', 'thingamajob_evidence'].map(
    (table) => f.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n,
  );
}

test('all four supported formats preserve original bytes and record authorized provenance/acquisition/integrity', async () => {
  const f = evidenceFixture();
  try {
    for (const [type, data, name, mime] of [
      ['txt', bytes, 'fixture.txt', 'text/plain'],
      ['markdown', bytes, 'fixture.md', 'text/markdown'],
      ['pdf', fictionalPdf(), 'fixture.pdf', 'application/pdf'],
      [
        'docx',
        fictionalDocx(),
        'fixture.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    ]) {
      const response = await upload(f, uploadForm(data, name, mime), 'upload-' + type);
      assert.equal(response.status, 200);
      const metadata = await response.json();
      assert.equal(metadata.sourceType, type);
      assert.equal(metadata.attribution, 'Fictional author');
      assert.equal(metadata.sourceLocator, 'Fictional source reference');
      assert.equal(metadata.version, 1);
      assert.equal(metadata.byteLength, data.length);
      assert.match(metadata.sha256, /^[a-f0-9]{64}$/);
      assert.ok(Math.abs(Date.now() - Date.parse(metadata.acquiredAt)) < 5000);
      assert.ok(
        !('object_key' in metadata) && !('workspace_id' in metadata) && !('actor_id' in metadata),
      );
      const download = await f.worker.fetch(
        await signedEvidenceRequest(collection + '/' + metadata.sourceId + '/original'),
        f.env,
      );
      assert.equal(download.status, 200);
      assert.equal(download.headers.get('content-type'), 'application/octet-stream');
      assert.match(download.headers.get('content-disposition'), /^attachment;/);
      assert.equal(download.headers.get('cache-control'), 'no-store');
      assert.deepEqual(new Uint8Array(await download.arrayBuffer()), data);
    }
    assert.deepEqual(counts(f), [4, 4, 4]);
  } finally {
    f.db.close();
  }
});
test('DOCX supports stored and deflated parts; corruption, encryption, missing packages and expansion limits reject', async () => {
  for (const method of [0, 8])
    assert.equal(
      (await validateEvidence(fictionalDocx(method), 'fixture.docx', '', 'Fictional author', ''))
        .sourceType,
      'docx',
    );
  for (const bytes of [enc.encode('not a zip'), fictionalDocx().subarray(0, 80)])
    await assert.rejects(validateEvidence(bytes, 'bad.docx', '', 'Fictional author', ''));
  const encrypted = fictionalDocx();
  new DataView(encrypted.buffer).setUint16(6, 1, true);
  await assert.rejects(validateEvidence(encrypted, 'bad.docx', '', 'Fictional author', ''));
  const crc = fictionalDocx();
  crc[14] ^= 255; // local CRC is checked below by malformed compressed bytes instead.
  crc[40] ^= 255;
  await assert.rejects(validateEvidence(crc, 'bad.docx', '', 'Fictional author', ''));
  const bomb = fictionalDocx();
  const view = new DataView(bomb.buffer);
  const cd = view.getUint32(bomb.length - 6, true);
  view.setUint32(cd + 24, 50000001, true);
  await assert.rejects(validateEvidence(bomb, 'bad.docx', '', 'Fictional author', ''));
});
test('unsupported extensions/MIME, malformed PDF, non-UTF8/binary text and bad provenance reject before R2', async () => {
  const f = evidenceFixture();
  try {
    for (const form of [
      uploadForm(bytes, 'fixture.exe', ''),
      uploadForm(bytes, 'fixture.txt', 'image/png'),
      uploadForm(bytes, 'fake.pdf', 'application/pdf'),
      uploadForm(enc.encode('%PDF-1.7\nstartxref\n0\n%%EOF\n'), 'bad.pdf', 'application/pdf'),
      uploadForm(new Uint8Array([255, 254]), 'bad.txt'),
      uploadForm(new Uint8Array([0, 1, 2]), 'bad.md', 'text/markdown'),
      uploadForm(bytes, 'fixture.txt', 'text/plain', ''),
      uploadForm(bytes, '../fixture.txt'),
      uploadForm(bytes, 'fixture.txt', 'text/plain', 'Fictional author', 'bad\nlocator'),
    ]) {
      assert.ok([400, 415].includes((await upload(f, form)).status));
    }
    assert.deepEqual(counts(f), [0, 0, 0]);
    assert.equal(f.objects.size, 0);
  } finally {
    f.db.close();
  }
});
test('10 MB boundary accepted, 10 MB plus one rejected including deceptive Content-Length', async () => {
  const f = evidenceFixture();
  try {
    const max = new Uint8Array(10000000).fill(97);
    assert.equal((await upload(f, uploadForm(max), 'maximum')).status, 200);
    const large = new Uint8Array(10000001).fill(97);
    assert.equal(
      (
        await upload(f, uploadForm(large), 'too-large', 'one', collection, {
          'Content-Length': '1',
        })
      ).status,
      413,
    );
    let cancelled = false;
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(10100001));
      },
      cancel() {
        cancelled = true;
      },
    });
    await assert.rejects(boundedBytes(stream, 10100000));
    assert.equal(cancelled, true);
    assert.deepEqual(counts(f), [1, 1, 1]);
  } finally {
    f.db.close();
  }
});
test('same request replays immutable provenance; changed bytes/filename/attribution/locator conflict', async () => {
  const f = evidenceFixture();
  try {
    const first = await (await upload(f)).json();
    const replay = await (await upload(f)).json();
    assert.equal(replay.sourceId, first.sourceId);
    assert.equal(replay.replayed, true);
    for (const form of [
      uploadForm(enc.encode('Changed fictional content')),
      uploadForm(undefined, 'changed.txt'),
      uploadForm(undefined, undefined, undefined, 'Other fictional author'),
      uploadForm(undefined, undefined, undefined, undefined, 'Other locator'),
    ])
      assert.equal((await upload(f, form)).status, 409);
    assert.deepEqual(counts(f), [1, 1, 1]);
    assert.equal(f.objects.size, 1);
  } finally {
    f.db.close();
  }
});
test('both clients store independently; foreign workspace/source/key requests deny before private reads', async () => {
  const f = evidenceFixture();
  try {
    const one = await (await upload(f)).json();
    const twoPath = collection.replace('workspace-one', 'workspace-two');
    const two = await (await upload(f, uploadForm(), 'fictional-request', 'two', twoPath)).json();
    assert.notEqual(one.sourceId, two.sourceId);
    for (const [subject, path] of [
      ['one', twoPath + '/' + two.sourceId + '/original'],
      ['two', collection + '/' + one.sourceId + '/original'],
      ['one', collection + '/' + two.sourceId + '/original'],
      ['two', twoPath + '/' + one.sourceId + '/original'],
    ]) {
      const response = await f.worker.fetch(await signedEvidenceRequest(path, subject), f.env);
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { error: 'Access denied' });
    }
    assert.equal(f.reads, 0);
    assert.equal((await upload(f, uploadForm(), 'foreign', 'one', twoPath)).status, 403);
    const forged = uploadForm();
    forged.set('workspaceId', 'workspace-two');
    assert.equal((await upload(f, forged, 'forged')).status, 400);
    assert.throws(() =>
      f.db
        .prepare('INSERT INTO thingamajob_evidence VALUES (?,?,?,?,?,?,?,unixepoch())')
        .run('workspace-two', one.sourceId, 1, 'foreign.txt', 'txt', 'fictional', ''),
    );
    assert.deepEqual(counts(f), [2, 2, 2]);
  } finally {
    f.db.close();
  }
});
test('R2 failure and provenance SQL failure expose no evidence; private orphan cannot be retrieved', async () => {
  const f = evidenceFixture();
  try {
    f.env.PRIVATE_ORIGINALS = {
      ...f.bucket,
      async put() {
        throw new Error('private-provider-detail');
      },
    };
    const r2 = await upload(f);
    assert.equal(r2.status, 503);
    assert.deepEqual(await r2.json(), { error: 'Service unavailable' });
    assert.deepEqual(counts(f), [0, 0, 0]);
    f.env.PRIVATE_ORIGINALS = f.bucket;
    f.db.exec(
      "CREATE TRIGGER evidence_fail BEFORE INSERT ON thingamajob_evidence BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    assert.equal((await upload(f)).status, 503);
    assert.deepEqual(counts(f), [0, 0, 0]);
    assert.equal(f.objects.size, 1);
    const orphan = [...f.objects.keys()][0].split('/').at(-1);
    assert.equal(
      (
        await f.worker.fetch(
          await signedEvidenceRequest(collection + '/' + orphan + '/original'),
          f.env,
        )
      ).status,
      403,
    );
    assert.equal(f.reads, 0);
  } finally {
    f.db.close();
  }
});
test('revocation after object storage rolls back metadata/history/provenance and preserves orphan', async () => {
  const f = evidenceFixture();
  try {
    f.env.PRIVATE_ORIGINALS = {
      ...f.bucket,
      async put(...args) {
        const result = await f.bucket.put(...args);
        f.db.exec('UPDATE thingamajob_memberships SET active=0');
        return result;
      },
    };
    assert.equal((await upload(f)).status, 403);
    assert.deepEqual(counts(f), [0, 0, 0]);
    assert.equal(f.objects.size, 1);
  } finally {
    f.db.close();
  }
});
test('download integrity/provider failures remain generic; revoked and synthetic-only sources are unavailable', async () => {
  const f = evidenceFixture();
  try {
    const source = await (await upload(f)).json(),
      path = collection + '/' + source.sourceId + '/original';
    const key = [...f.objects.keys()][0];
    f.objects.set(key, enc.encode('corruption'));
    const corrupt = await f.worker.fetch(await signedEvidenceRequest(path), f.env);
    assert.equal(corrupt.status, 503);
    assert.deepEqual(await corrupt.json(), { error: 'Service unavailable' });
    f.env.PRIVATE_ORIGINALS = {
      ...f.bucket,
      async get() {
        throw new Error('private-provider-detail');
      },
    };
    const failed = await f.worker.fetch(await signedEvidenceRequest(path), f.env);
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Service unavailable' });
    f.db.exec('UPDATE thingamajob_workspaces SET active=0');
    assert.equal((await f.worker.fetch(await signedEvidenceRequest(path), f.env)).status, 403);
  } finally {
    f.db.close();
  }
});
test('CSRF, missing signed identity, malformed multipart, duplicate fields and TEST-only gating fail closed', async () => {
  const f = evidenceFixture();
  try {
    assert.equal(
      (await upload(f, uploadForm(), 'x', 'one', collection, { Origin: 'https://hostile.invalid' }))
        .status,
      403,
    );
    assert.equal(
      (
        await f.worker.fetch(
          new Request('https://api-test.djamespoer.com' + collection, {
            method: 'POST',
            headers: { Origin: 'https://api-test.djamespoer.com' },
          }),
          f.env,
        )
      ).status,
      403,
    );
    const duplicate = uploadForm();
    duplicate.append('attribution', 'duplicate');
    assert.equal((await upload(f, duplicate)).status, 400);
    const malformed = await signedEvidenceRequest(collection, 'one', {
      method: 'POST',
      body: 'invalid',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=fictional',
        'Idempotency-Key': 'bad',
      },
    });
    assert.equal((await f.worker.fetch(malformed, f.env)).status, 400);
    const req = await signedEvidenceRequest(collection, 'one', {
      method: 'POST',
      body: uploadForm(),
      headers: { 'Idempotency-Key': 'x' },
    });
    assert.equal(
      (await f.worker.fetch(req, { ...f.env, TEST_BOOTSTRAP_ENABLED: undefined })).status,
      404,
    );
    const live = await signedEvidenceRequest(collection, 'one', {
      method: 'POST',
      body: uploadForm(),
      headers: { 'Idempotency-Key': 'live' },
    });
    assert.equal(
      (await f.worker.fetch(new Request(live.url.replace('api-test.', 'api.'), live), f.env))
        .status,
      404,
    );
    const page = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/evidence'),
      f.env,
    );
    assert.equal(page.status, 200);
    assert.match(await page.text(), /I authorize storing/);
    assert.match(page.headers.get('content-security-policy'), /script-src 'nonce-/);
    assert.deepEqual(counts(f), [0, 0, 0]);
  } finally {
    f.db.close();
  }
});
