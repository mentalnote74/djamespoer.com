import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture } from './evidence-fixtures.mjs';
import { jdHarness } from './jd-harness.ts';
import {
  expirePublicEvaluations,
  beginAttempt,
  publicEvent,
  retainPublicContent,
} from './public-evaluation.ts';
import { openAiReasoner } from './jd-provider.ts';
const root = 'https://djamespoer.com/test/thingamajob';
const id = '00000000-0000-4000-8000-000000000001';
const session = '00000000-0000-4000-8000-000000000002';
function fixture() {
  const f = evidenceFixture();
  for (const file of ['public-evaluation.sql', 'jd-harness-diagnostics.sql'])
    f.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  f.bucket.delete = async (keys) => {
    for (const key of keys) f.objects.delete(key);
  };
  const env = {
    ...f.env,
    JD_HARNESS_ENABLED: 'true',
    TEST_REFERENCE_WORKSPACE: 'workspace-one',
    JD_HARNESS_LIMIT: { limit: async () => ({ success: true }) },
    JD_TELEMETRY_LIMIT: { limit: async () => ({ success: true }) },
  };
  return { ...f, env };
}
function request(path, body, extra = {}) {
  return new Request(root + path, {
    method: 'POST',
    headers: {
      Origin: 'https://djamespoer.com',
      'Content-Type': 'application/json',
      'Idempotency-Key': id,
      'X-TAMJ-Session': session,
      'X-TAMJ-Method': 'text',
      ...extra,
    },
    body: JSON.stringify(body),
  });
}
test('normalization failure is a private retained attempt; retry keys do not initiate duplicate work', async (t) => {
  t.mock.method(console, 'error', () => {});
  const f = fixture();
  try {
    const reasoner = {
      evaluate() {
        throw Error('Must not call provider');
      },
    };
    const response = await jdHarness(
      request('/jd-input', { method: 'text', text: 'too short' }),
      f.env,
      reasoner,
    );
    assert.equal(response.status, 400);
    const row = f.db.prepare('SELECT * FROM thingamajob_public_attempts').get();
    assert.equal(row.status, 'failed');
    assert.equal(row.code, 'intake_failed');
    assert(f.objects.has('public-evaluations/v1/' + id + '/submitted.json'));
    assert.equal(
      (
        await jdHarness(
          request('/evaluate', {
            jobDescription: 'Valid fictional job description for verification.',
          }),
          f.env,
          reasoner,
        )
      ).status,
      409,
    );
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_public_attempts').get().n, 1);
  } finally {
    f.db.close();
  }
});
test('event endpoint accepts only finite content-free contexts and requires matching session/attempt', async () => {
  const f = fixture();
  try {
    await beginAttempt(f.env, { id, session, method: 'text' });
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await jdHarness(
            request('/events', { event: 'external_profile_click', context: 'linkedin' }),
            f.env,
          )
        ).status,
        200,
      );
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_public_events').get().n, 1);
    assert.equal(
      (
        await jdHarness(
          request('/events', {
            event: 'evaluation_result_viewed',
            context: 'private@example.invalid',
          }),
          f.env,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await jdHarness(
          request('/events', { event: 'evaluation_result_viewed', context: 'text', jd: 'private' }),
          f.env,
        )
      ).status,
      400,
    );
    await jdHarness(
      request(
        '/events',
        { event: 'resume_download', context: 'public-current' },
        { 'X-TAMJ-Session': crypto.randomUUID() },
      ),
      f.env,
    );
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_public_events').get().n, 1);
    const crossSite = request(
      '/events',
      { event: 'resume_download', context: 'public-current' },
      { Origin: 'https://other.invalid' },
    );
    assert.equal((await jdHarness(crossSite, f.env)).status, 403);
  } finally {
    f.db.close();
  }
});
test('90-day deletion is retry-safe and leaves career/history/legacy records untouched', async (t) => {
  t.mock.method(console, 'info', () => {});
  const f = fixture();
  try {
    await beginAttempt(f.env, { id, session, method: 'text' });
    await retainPublicContent(f.env, id, 'input', { jobDescription: 'Private fixture' });
    await publicEvent(f.env, { id, session, method: 'text' }, 'evaluation_submitted', 'text');
    const live = crypto.randomUUID();
    await beginAttempt(f.env, { id: live, session, method: 'url' });
    f.objects.set('workspaces/workspace-one/evaluations/legacy.json', new Uint8Array([1]));
    f.db
      .prepare('UPDATE thingamajob_public_attempts SET expires_at=unixepoch()-1 WHERE attempt_id=?')
      .run(id);
    const remove = f.bucket.delete;
    f.bucket.delete = async () => {
      throw Error('Fixture storage outage');
    };
    await assert.rejects(expirePublicEvaluations(f.env), /storage outage/);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_public_attempts').get().n, 2);
    f.bucket.delete = remove;
    assert.equal(await expirePublicEvaluations(f.env), 1);
    assert.equal(await expirePublicEvaluations(f.env), 0);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_public_attempts').get().n, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_public_events').get().n, 0);
    assert(f.objects.has('workspaces/workspace-one/evaluations/legacy.json'));
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_workspaces').get().n, 2);
  } finally {
    f.db.close();
  }
});
test('paid provider output and usage reach private audit before malformed output parsing fails', async () => {
  const captured = [];
  const reasoner = openAiReasoner('fake-key', 'fixture-model', async () =>
    Response.json(
      {
        id: 'resp_fixture',
        status: 'completed',
        model: 'fixture-model',
        usage: {
          input_tokens: 300,
          output_tokens: 25,
          total_tokens: 325,
          input_tokens_details: { cached_tokens: 100 },
          output_tokens_details: { reasoning_tokens: 8 },
        },
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'invalid json' }] }],
      },
      { headers: { 'x-request-id': 'req_fixture' } },
    ),
  );
  await assert.rejects(
    reasoner.evaluate(
      'Fictional JD',
      [{ truthId: 't', statement: 'Fictional truth', state: 'accepted', qualifications: [] }],
      undefined,
      async (metadata, raw) => captured.push({ metadata, raw }),
    ),
    (error) => error.code === 'provider_output' && error.details.inputTokens === 300,
  );
  assert.equal(captured.length, 1);
  assert.equal(captured[0].metadata.cachedInputTokens, 100);
  assert.equal(captured[0].raw.output[0].content[0].text, 'invalid json');
});
