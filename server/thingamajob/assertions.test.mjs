import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';

const root = '/api/thingamajob/workspaces/workspace-one/assertions';
async function fixture() {
  const f = evidenceFixture();
  f.db.exec(readFileSync(new URL('./assertions.sql', import.meta.url), 'utf8'));
  f.db.exec(readFileSync(new URL('./claim-lifecycle.sql', import.meta.url), 'utf8'));
  const sources = {};
  for (const subject of ['one', 'two']) {
    const response = await f.worker.fetch(
      await signedEvidenceRequest(
        `/api/thingamajob/workspaces/workspace-${subject}/evidence`,
        subject,
        { method: 'POST', headers: { 'Idempotency-Key': 'fictional-source' }, body: uploadForm() },
      ),
      f.env,
    );
    assert.equal(response.status, 200);
    sources[subject] = (await response.json()).sourceId;
  }
  return { ...f, sources };
}
async function post(f, path, input, key, subject = 'one', headers = {}) {
  return f.worker.fetch(
    await signedEvidenceRequest(path, subject, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...headers },
      body: JSON.stringify(input),
    }),
    f.env,
  );
}
function input(f, source = f.sources.one) {
  return {
    statement: 'Fictional proposal. No career facts.',
    proposerAttribution: 'Fictional manual author',
    evidence: [{ sourceId: source, locator: 'Fictional page 1' }],
  };
}
async function propose(f, key = 'proposal-one', subject = 'one', payload = input(f), path = root) {
  const response = await post(f, path, payload, key, subject);
  assert.equal(response.status, 200);
  return response.json();
}
async function review(
  f,
  p,
  decision = 'accepted',
  key = 'review-one',
  extra = {},
  subject = 'one',
  path = root,
) {
  return post(
    f,
    path + '/' + p.proposalId + '/review',
    { decision, expectedVersion: 1, ...extra },
    key,
    subject,
  );
}
function counts(f) {
  return [
    'thingamajob_proposals',
    'thingamajob_reviews',
    'thingamajob_claims',
    'thingamajob_assertion_history',
  ].map((table) => f.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);
}

test('proposal creation atomically preserves statement/version/attribution/provenance/history without a claim', async () => {
  const f = await fixture();
  try {
    const p = await propose(f);
    assert.equal(p.reviewDisposition, 'proposed');
    assert.equal(p.originalVersion, 1);
    assert.equal(p.version, 1);
    assert.equal(p.claim, null);
    assert.equal(p.history.length, 1);
    assert.deepEqual(p.evidence, input(f).evidence);
    assert.equal(p.proposerAttribution, 'Fictional manual author');
    assert.deepEqual(counts(f), [1, 0, 0, 1]);
    assert.equal(
      f.db.prepare('SELECT proposer_actor_id FROM thingamajob_proposals').get().proposer_actor_id,
      'actor-one',
    );
    const replay = await propose(f);
    assert.equal(replay.proposalId, p.proposalId);
    assert.equal(replay.replayed, true);
    assert.deepEqual(counts(f), [1, 0, 0, 1]);
    const changed = await post(
      f,
      root,
      { ...input(f), statement: 'Different fictional statement' },
      'proposal-one',
    );
    assert.equal(changed.status, 409);
  } finally {
    f.db.close();
  }
});
test('explicit owner acceptance creates one immutable reviewed claim with copied provenance and safe replay', async () => {
  const f = await fixture();
  try {
    const originalBytes = [...f.objects.entries()].map(([key, value]) => [key, Array.from(value)]);
    const p = await propose(f),
      response = await review(f, p);
    assert.equal(response.status, 200);
    const accepted = await response.json();
    assert.equal(accepted.reviewDisposition, 'accepted');
    assert.equal(accepted.version, 2);
    assert.equal(accepted.originalVersion, 1);
    assert.equal(accepted.statement, p.statement);
    assert.equal(accepted.claim.statement, p.statement);
    assert.equal(accepted.claim.version, 1);
    assert.equal(accepted.history.length, 2);
    assert.equal(accepted.review.decision, 'accepted');
    assert.equal(accepted.review.ownerActorId, 'actor-one');
    assert.equal(accepted.proposerActorId, 'actor-one');
    assert.equal(typeof accepted.proposedAt, 'number');
    assert.equal(accepted.review.reviewedAt, accepted.history[1].recordedAt);
    assert.equal(
      accepted.review.reviewId,
      f.db.prepare('SELECT review_id FROM thingamajob_reviews').get().review_id,
    );
    assert.ok(
      !('evidenceStrength' in accepted.claim) && !('requirementEvaluation' in accepted.claim),
    );
    assert.equal(
      f.db.prepare('SELECT owner_actor_id FROM thingamajob_reviews').get().owner_actor_id,
      'actor-one',
    );
    const refs = f.db.prepare('SELECT source_id,locator FROM thingamajob_claim_sources').all();
    assert.deepEqual(
      refs.map((r) => ({ sourceId: r.source_id, locator: r.locator })),
      p.evidence,
    );
    const replay = await (await review(f, p)).json();
    assert.equal(replay.replayed, true);
    assert.equal(replay.claim.claimId, accepted.claim.claimId);
    assert.deepEqual(counts(f), [1, 1, 1, 2]);
    assert.equal((await review(f, p, 'accepted', 'new-review-key')).status, 409);
    assert.deepEqual(
      [...f.objects.entries()].map(([key, value]) => [key, Array.from(value)]),
      originalBytes,
    );
  } finally {
    f.db.close();
  }
});
test('rejection preserves original proposal/decision/history and never creates an accepted claim', async () => {
  const f = await fixture();
  try {
    const p = await propose(f),
      response = await review(f, p, 'rejected');
    assert.equal(response.status, 200);
    const rejected = await response.json();
    assert.equal(rejected.reviewDisposition, 'rejected');
    assert.equal(rejected.claim, null);
    assert.equal(rejected.statement, p.statement);
    assert.deepEqual(counts(f), [1, 1, 0, 2]);
    assert.equal((await (await review(f, p, 'rejected')).json()).replayed, true);
    const row = f.db.prepare('SELECT review_id FROM thingamajob_reviews').get();
    assert.throws(() =>
      f.db
        .prepare("INSERT INTO thingamajob_claims VALUES (?,?,?,?,?,1,'accepted',unixepoch())")
        .run('workspace-one', 'forged-claim', p.proposalId, row.review_id, 'forged'),
    );
  } finally {
    f.db.close();
  }
});
test('correction creates reviewed corrected claim atomically, preserving original version and wording', async () => {
  const f = await fixture();
  try {
    const p = await propose(f);
    const response = await review(f, p, 'corrected', 'correct-one', {
      correctedStatement: 'Corrected fictional wording. No career facts.',
    });
    assert.equal(response.status, 200);
    const corrected = await response.json();
    assert.equal(corrected.statement, p.statement);
    assert.equal(corrected.originalVersion, 1);
    assert.equal(corrected.reviewDisposition, 'corrected');
    assert.equal(corrected.claim.statement, 'Corrected fictional wording. No career facts.');
    assert.equal(corrected.claim.reviewDisposition, 'corrected');
    assert.equal(corrected.history[0].statement, p.statement);
    assert.equal(corrected.history[1].statement, corrected.claim.statement);
    assert.deepEqual(counts(f), [1, 1, 1, 2]);
    assert.equal(
      f.db.prepare('SELECT corrected_statement FROM thingamajob_reviews').get().corrected_statement,
      corrected.claim.statement,
    );
    assert.equal((await review(f, p, 'accepted', 'opposite')).status, 409);
  } finally {
    f.db.close();
  }
});
test('stale/malformed decisions and client-assigned identity/timestamps/strength cannot promote truth', async () => {
  const f = await fixture();
  try {
    const p = await propose(f);
    assert.equal((await review(f, p, 'accepted', 'stale', { expectedVersion: 2 })).status, 409);
    for (const extra of [
      { reviewerId: 'actor-two' },
      { owner: true },
      { reviewedAt: 'fictional' },
      { evidenceStrength: 'Proven' },
      { requirementEvaluation: 'MET' },
      { correctedStatement: 'not an acceptance field' },
    ])
      assert.equal((await review(f, p, 'accepted', 'bad', extra)).status, 400);
    assert.equal(
      (await review(f, p, 'corrected', 'empty', { correctedStatement: ' ' })).status,
      400,
    );
    assert.equal((await review(f, p, 'proposed', 'bad-state')).status, 400);
    assert.equal(
      (await post(f, root, { ...input(f), proposerActorId: 'actor-two' }, 'spoof')).status,
      400,
    );
    assert.deepEqual(counts(f), [1, 0, 0, 1]);
  } finally {
    f.db.close();
  }
});
test('simultaneous contradictory reviews produce one outcome; same-request retries cannot duplicate claims', async () => {
  const f = await fixture();
  try {
    const p = await propose(f);
    const conflict = await Promise.all([
      review(f, p, 'accepted', 'accept-race'),
      review(f, p, 'rejected', 'reject-race'),
    ]);
    assert.deepEqual(conflict.map((r) => r.status).sort(), [200, 409]);
    const outcome = await conflict.find((response) => response.status === 200).json();
    const initialClaims = outcome.reviewDisposition === 'accepted' ? 1 : 0;
    assert.deepEqual(counts(f), [1, 1, initialClaims, 2]);
    const second = await propose(f, 'proposal-two');
    const retries = await Promise.all([
      review(f, second, 'corrected', 'same-race', {
        correctedStatement: 'Fictional corrected statement',
      }),
      review(f, second, 'corrected', 'same-race', {
        correctedStatement: 'Fictional corrected statement',
      }),
    ]);
    assert.ok(retries.every((r) => r.status === 200));
    const bodies = await Promise.all(retries.map((r) => r.json()));
    assert.equal(bodies[0].claim.claimId, bodies[1].claim.claimId);
    assert.deepEqual(counts(f), [2, 2, initialClaims + 1, 4]);
  } finally {
    f.db.close();
  }
});
test('failure in claim/history rolls back disposition, review, claims and every dependent write', async () => {
  const f = await fixture();
  try {
    const p = await propose(f);
    f.db.exec(
      "CREATE TRIGGER fail_claim BEFORE INSERT ON thingamajob_claims BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    const failed = await review(f, p);
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Service unavailable' });
    assert.deepEqual(counts(f), [1, 0, 0, 1]);
    assert.equal(
      f.db.prepare('SELECT disposition FROM thingamajob_proposals').get().disposition,
      'proposed',
    );
    f.db.exec('DROP TRIGGER fail_claim');
    f.db.exec(
      "CREATE TRIGGER fail_history BEFORE INSERT ON thingamajob_assertion_history WHEN NEW.version=2 BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    assert.equal((await review(f, p, 'rejected')).status, 503);
    assert.deepEqual(counts(f), [1, 0, 0, 1]);
    f.db.exec('DROP TRIGGER fail_history');
    assert.equal((await review(f, p)).status, 200);
    assert.deepEqual(counts(f), [1, 1, 1, 2]);
  } finally {
    f.db.close();
  }
});
test('proposal relationship failure rolls back the whole proposal/history transaction', async () => {
  const f = await fixture();
  try {
    f.db.exec(
      "CREATE TRIGGER fail_source BEFORE INSERT ON thingamajob_proposal_sources BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    assert.equal((await post(f, root, input(f), 'failed-create')).status, 503);
    assert.deepEqual(counts(f), [0, 0, 0, 0]);
  } finally {
    f.db.close();
  }
});
test('commit-time revocation denies review and cannot leave partial truth or history', async () => {
  const f = await fixture();
  try {
    const p = await propose(f),
      batch = f.database.batch.bind(f.database);
    f.database.batch = async (statements) => {
      f.db.exec('UPDATE thingamajob_memberships SET active=0');
      return batch(statements);
    };
    assert.equal((await review(f, p)).status, 403);
    assert.deepEqual(counts(f), [1, 0, 0, 1]);
    assert.equal(
      f.db.prepare('SELECT disposition FROM thingamajob_proposals').get().disposition,
      'proposed',
    );
  } finally {
    f.db.close();
  }
});
test('commit-time proposal revocation cannot leave source relationships or creation history', async () => {
  const f = await fixture();
  try {
    const batch = f.database.batch.bind(f.database);
    f.database.batch = async (statements) => {
      f.db.exec('UPDATE thingamajob_memberships SET active=0');
      return batch(statements);
    };
    assert.equal((await post(f, root, input(f), 'revoked-create')).status, 403);
    assert.deepEqual(counts(f), [0, 0, 0, 0]);
  } finally {
    f.db.close();
  }
});
test('both cross-workspace directions, foreign evidence and non-owner members cannot create/review/read truth', async () => {
  const f = await fixture();
  try {
    const one = await propose(f),
      twoRoot = root.replace('workspace-one', 'workspace-two'),
      two = await propose(f, 'proposal-two', 'two', input(f, f.sources.two), twoRoot);
    for (const [subject, path, id] of [
      ['two', root, one.proposalId],
      ['one', twoRoot, two.proposalId],
      ['one', root, two.proposalId],
      ['two', twoRoot, one.proposalId],
    ]) {
      const read = await f.worker.fetch(
        await signedEvidenceRequest(path + '/' + id, subject),
        f.env,
      );
      assert.equal(read.status, 403);
      assert.equal(
        (await review(f, { proposalId: id }, 'accepted', 'foreign', {}, subject, path)).status,
        403,
      );
    }
    assert.equal((await post(f, root, input(f, f.sources.two), 'foreign-source')).status, 403);
    f.db
      .prepare('INSERT INTO thingamajob_memberships VALUES (?,?,1)')
      .run('actor-two', 'workspace-one');
    assert.equal((await review(f, one, 'accepted', 'member-owner', {}, 'two')).status, 403);
    assert.equal(
      (await post(f, root, input(f), 'member-proposal', 'two', { 'X-Role': 'owner' })).status,
      403,
    );
    assert.throws(() =>
      f.db
        .prepare('INSERT INTO thingamajob_proposal_sources VALUES (?,?,?,?)')
        .run('workspace-one', one.proposalId, f.sources.two, 'foreign'),
    );
    assert.deepEqual(counts(f), [2, 0, 0, 2]);
  } finally {
    f.db.close();
  }
});
test('review idempotency cannot be repurposed for another proposal/decision or corrected wording', async () => {
  const f = await fixture();
  try {
    const one = await propose(f),
      two = await propose(f, 'second');
    assert.equal(
      (await review(f, one, 'corrected', 'repeat', { correctedStatement: 'Fictional correction' }))
        .status,
      200,
    );
    assert.equal(
      (await review(f, one, 'corrected', 'repeat', { correctedStatement: 'Different fiction' }))
        .status,
      409,
    );
    assert.equal((await review(f, two, 'accepted', 'repeat')).status, 409);
    assert.deepEqual(counts(f), [2, 1, 1, 3]);
  } finally {
    f.db.close();
  }
});
test('review page/list stay owner-scoped, CSRF protected and unavailable on LIVE', async () => {
  const f = await fixture();
  try {
    const page = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/assertions'),
      f.env,
    );
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Create proposal only/);
    assert.match(html, /data-decision="corrected"/);
    assert.ok(!/document\.cookie|localStorage|CF_Authorization/.test(html));
    const evidence = await f.worker.fetch(
      await signedEvidenceRequest(root.replace('/assertions', '/evidence')),
      f.env,
    );
    assert.equal(evidence.status, 200);
    assert.deepEqual(
      (await evidence.json()).sources.map((s) => s.sourceId),
      [f.sources.one],
    );
    assert.equal(
      (await post(f, root, input(f), 'cross-site', 'one', { Origin: 'https://hostile.invalid' }))
        .status,
      403,
    );
    const missing = new Request('https://api-test.djamespoer.com' + root, {
      method: 'POST',
      headers: { Origin: 'https://api-test.djamespoer.com' },
    });
    assert.equal((await f.worker.fetch(missing, f.env)).status, 403);
    const req = await signedEvidenceRequest('/api/thingamajob/test/assertions');
    assert.equal(
      (await f.worker.fetch(req, { ...f.env, TEST_BOOTSTRAP_ENABLED: undefined })).status,
      404,
    );
    const live = await signedEvidenceRequest('/api/thingamajob/test/assertions');
    assert.equal(
      (await f.worker.fetch(new Request(live.url.replace('api-test.', 'api.'), live), f.env))
        .status,
      404,
    );
  } finally {
    f.db.close();
  }
});
