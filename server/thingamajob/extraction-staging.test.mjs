import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
const route = '/api/thingamajob/workspaces/workspace-one/extraction-runs/fictional-run';
async function fixture() {
  const f = evidenceFixture();
  for (const file of ['assertions.sql', 'claim-lifecycle.sql', 'extraction-staging.sql'])
    f.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const text = 'Fictional source. Built a fictional form.';
  const sourceResponse = await f.worker.fetch(
    await signedEvidenceRequest('/api/thingamajob/workspaces/workspace-one/evidence', 'one', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'fictional-stage-source' },
      body: uploadForm(new TextEncoder().encode(text)),
    }),
    f.env,
  );
  assert.equal(sourceResponse.status, 200);
  const source = await sourceResponse.json();
  const payload = {
    extractionRunId: 'fictional-run',
    baselineRunId: 'fictional-baseline',
    modelActuallyUsed: 'fictional-model',
    sources: [
      {
        key: 'resume',
        sourceId: source.sourceId,
        sha256: createHash('sha256').update(text).digest('hex'),
        units: [{ locationKey: 'page:1', text }],
      },
    ],
    claims: Array.from({ length: 65 }, (_, i) => ({
      id: `c${i}`,
      text: `Built a fictional form (${i}).`,
      sourceKey: 'resume',
      extractionRunId: 'fictional-run',
      baselineRunId: 'fictional-baseline',
      modelActuallyUsed: 'fictional-model',
      reviewState: 'candidate-only',
      extractionConfidence: 'high',
      uncertainties: ['Fictional qualification retained.'],
      conflictIds: i < 2 ? ['conflict1'] : [],
      citations: [{ locationKey: 'page:1', quote: 'Built a fictional form.' }],
      sourceReference: { locator: 'fictional document' },
    })),
    conflicts: [
      {
        id: 'conflict1',
        kind: 'possible-conflict',
        claimIds: ['c0', 'c1'],
        explanation: 'Fictional ambiguity.',
      },
    ],
    questions: Array.from({ length: 4 }, (_, i) => ({
      question: `Fictional owner question ${i}?`,
      claimIds: [`c${i}`],
    })),
  };
  const post = async (body = payload, subject = 'one', url = route, headers = {}) =>
    f.worker.fetch(
      await signedEvidenceRequest(url, subject, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
      f.env,
    );
  return { ...f, payload, post };
}
test('65 candidates stage in bounded authenticated continuations, retaining metadata and zero truth promotion', async () => {
  const f = await fixture();
  try {
    const proposalResponse = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/workspaces/workspace-one/assertions', 'one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'existing-proposal' },
        body: JSON.stringify({
          statement: 'Existing fictional truth.',
          proposerAttribution: 'Fictional owner',
          evidence: [{ sourceId: f.payload.sources[0].sourceId, locator: 'page:1' }],
        }),
      }),
      f.env,
    );
    assert.equal(proposalResponse.status, 200);
    const priorProposal = await proposalResponse.json();
    const reviewResponse = await f.worker.fetch(
      await signedEvidenceRequest(
        `/api/thingamajob/workspaces/workspace-one/assertions/${priorProposal.proposalId}/review`,
        'one',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'existing-review' },
          body: JSON.stringify({ decision: 'accepted', expectedVersion: 1 }),
        },
      ),
      f.env,
    );
    assert.equal(reviewResponse.status, 200);
    const existingTruth = f.db.prepare('SELECT * FROM thingamajob_claims').all();
    const existingReviews = f.db.prepare('SELECT * FROM thingamajob_reviews').all();
    let result;
    for (let i = 0; i < 13; i++) {
      const response = await f.post();
      assert.equal(response.status, 200);
      result = await response.json();
      assert.equal(result.proposals.length, (i + 1) * 5);
      assert.equal(result.state, i === 12 ? 'staged' : 'staging');
    }
    assert.equal(result.proposals.length, 65);
    assert.ok(result.proposals.every((p) => p.reviewDisposition === 'proposed'));
    assert.deepEqual(result.document.questions, f.payload.questions);
    assert.deepEqual(result.document.conflicts, f.payload.conflicts);
    assert.deepEqual(result.document.claims, f.payload.claims);
    assert.deepEqual(f.db.prepare('SELECT * FROM thingamajob_claims').all(), existingTruth);
    assert.deepEqual(f.db.prepare('SELECT * FROM thingamajob_reviews').all(), existingReviews);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_assertion_history').get().n, 67);
    assert.equal((await f.post()).status, 200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n, 66);
    const changed = structuredClone(f.payload);
    changed.claims[0].text = 'Changed';
    assert.equal((await f.post(changed)).status, 409);
  } finally {
    f.db.close();
  }
});
test('missing/forged identity, cross-owner read/write, wrong origin and authority-field manipulation fail closed', async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.worker.fetch(
          new Request('https://api-test.djamespoer.com' + route, {
            method: 'POST',
            headers: {
              Origin: 'https://api-test.djamespoer.com',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(f.payload),
          }),
          f.env,
        )
      ).status,
      403,
    );
    assert.equal((await f.post(f.payload, 'two')).status, 403);
    assert.equal((await f.post({ ...f.payload, actorId: 'actor-one', role: 'owner' })).status, 400);
    assert.equal(
      (await f.post(f.payload, 'one', route, { Origin: 'https://evil.invalid' })).status,
      403,
    );
    assert.equal((await f.post()).status, 200);
    assert.equal(
      (await f.worker.fetch(await signedEvidenceRequest(route, 'two'), f.env)).status,
      403,
    );
    const forged = await signedEvidenceRequest(route, 'one');
    forged.headers.set('Cf-Access-Jwt-Assertion', 'forged');
    assert.equal((await f.worker.fetch(forged, f.env)).status, 403);
    const mixed = structuredClone(f.payload);
    mixed.sources[0].sourceId = 'guessed-other-source';
    assert.equal((await f.post(mixed)).status, 403);
    const foreignResponse = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/workspaces/workspace-two/evidence', 'two', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'foreign-source' },
        body: uploadForm(),
      }),
      f.env,
    );
    assert.equal(foreignResponse.status, 200);
    mixed.sources[0].sourceId = (await foreignResponse.json()).sourceId;
    assert.equal((await f.post(mixed)).status, 403);
    f.db
      .prepare('INSERT INTO thingamajob_memberships VALUES (?,?,1)')
      .run('actor-two', 'workspace-one');
    assert.equal((await f.post(f.payload, 'two')).status, 403);
    const live = new Request('https://api.djamespoer.com' + route);
    assert.equal((await f.worker.fetch(live, f.env)).status, 404);
  } finally {
    f.db.close();
  }
});
test('bad citations and broken question references reject before proposal writes', async () => {
  const f = await fixture();
  try {
    const bad = structuredClone(f.payload);
    bad.claims[0].citations[0].quote = 'Unsupported citation';
    assert.equal((await f.post(bad)).status, 400);
    const missing = structuredClone(f.payload);
    missing.questions[0].claimIds = ['missing'];
    assert.equal((await f.post(missing)).status, 400);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n, 0);
  } finally {
    f.db.close();
  }
});
