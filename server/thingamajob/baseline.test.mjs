import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
import { classifyBaseline } from './baseline-policy.ts';
async function fixture() {
  const f = evidenceFixture();
  for (const file of [
    'assertions.sql',
    'claim-lifecycle.sql',
    'unknowns.sql',
    'extraction-staging.sql',
    'baseline.sql',
  ])
    f.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const post = async (path, body, subject = 'one', headers = {}) =>
    f.worker.fetch(
      await signedEvidenceRequest(path, subject, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
      f.env,
    );
  const uploaded = await f.worker.fetch(
    await signedEvidenceRequest('/api/thingamajob/workspaces/workspace-one/evidence', 'one', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'source' },
      body: uploadForm(),
    }),
    f.env,
  );
  assert.equal(uploaded.status, 200);
  const source = await uploaded.json();
  const root = '/api/thingamajob/workspaces/workspace-one',
    runId = 'fictional-hot-seat';
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const p = await post(
      root + '/assertions',
      {
        statement: 'Fictional claim ' + i,
        proposerAttribution: 'Fictional extraction',
        evidence: [{ sourceId: source.sourceId, locator: 'fictional citation' }],
      },
      'one',
      { 'Idempotency-Key': 'proposal-' + i },
    );
    assert.equal(p.status, 200);
    ids.push((await p.json()).proposalId);
  }
  const document = {
    claims: ids.map((id, i) => ({
      id: 'c' + i,
      text: 'Fictional claim ' + i,
      sourceKey: 'resume',
      sourceReference: { locator: 'fictional' },
      extractionConfidence: 'high',
      uncertainties: [],
      conflictIds: [],
      citations: [{ locationKey: 'p1', quote: 'Fictional' }],
    })),
    questions: [{ question: 'Which title?', claimIds: ['c1', 'c2'] }],
    conflicts: [],
    sources: [],
  };
  f.db
    .prepare(
      "INSERT INTO thingamajob_extraction_runs(workspace_id,run_id,fingerprint,document_json,created_by,state) VALUES ('workspace-one',?,'fixture',?,'actor-one','staged')",
    )
    .run(runId, JSON.stringify(document));
  for (let i = 0; i < 3; i++) {
    f.db
      .prepare("INSERT INTO thingamajob_extraction_candidates VALUES ('workspace-one',?,?,?)")
      .run(runId, 'c' + i, ids[i]);
    f.db
      .prepare(
        "INSERT INTO thingamajob_baseline_evaluations(workspace_id,run_id,candidate_id,proposal_id,category,reasons_json,policy_version,evidence_digest,execution_context) VALUES ('workspace-one',?,?,?,?,'[]','fictional-policy','fictional-digest','authorized_test_policy')",
      )
      .run(runId, 'c' + i, ids[i], i === 0 ? 'baseline' : 'attention');
  }
  f.db
    .prepare(
      "INSERT INTO thingamajob_baseline_issues VALUES ('workspace-one',?,'question-1','Which title?','[\"c1\",\"c2\"]')",
    )
    .run(runId);
  return { ...f, post, ids, root, runId, route: root + '/extraction-runs/' + runId };
}
test('policy separates literal support, questions, caveats and invalid citations', () => {
  const c = {
    id: 'clean',
    sourceKey: 'resume',
    text: 'Fictional fact',
    extractionConfidence: 'high',
    uncertainties: [],
    conflictIds: [],
    citations: [{ locationKey: 'p1', quote: 'Fictional fact' }],
  };
  const result = classifyBaseline({
    extractionRunId: 'fictional',
    sources: [
      {
        key: 'resume',
        sourceId: 's',
        sha256: 'hash',
        units: [{ locationKey: 'p1', text: 'Fictional fact' }],
      },
    ],
    claims: [
      c,
      { ...c, id: 'question' },
      { ...c, id: 'qualified', uncertainties: ['Historical source attribution'] },
      { ...c, id: 'invalid', citations: [{ locationKey: 'p1', quote: 'Unsupported' }] },
    ],
    questions: [{ question: 'Confirm title?', claimIds: ['question'] }],
    conflicts: [],
  });
  assert.deepEqual(
    result.rows.map((c) => c.category),
    ['baseline', 'attention', 'qualified', 'invalid'],
  );
});
test('automatic baseline is active without forged owner acceptance; correction replaces it preserving original ledger', async () => {
  const f = await fixture();
  try {
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 0);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_active_baseline').get().n, 1);
    const own = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/workflow', 'one'),
      f.env,
    );
    assert.equal(own.status, 200);
    assert.equal((await own.json()).baselineClaims.length, 1);
    const peer = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/workflow', 'two'),
      f.env,
    );
    assert.deepEqual((await peer.json()).baselineClaims, []);
    const corrected = await f.post(
      f.root + '/assertions/' + f.ids[0] + '/review',
      { decision: 'corrected', expectedVersion: 1, correctedStatement: 'Fictional corrected fact' },
      'one',
      { 'Idempotency-Key': 'correct-baseline' },
    );
    assert.equal(corrected.status, 200);
    const detail = await corrected.json();
    assert.equal(detail.baseline.active, false);
    assert.equal(detail.baseline.transition, 'replaced_by_owner_review');
    assert.equal(detail.claim.statement, 'Fictional corrected fact');
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_active_baseline').get().n, 0);
    assert.equal(
      f.db.prepare('SELECT count(*) n FROM thingamajob_baseline_evaluations').get().n,
      3,
    );
    assert.throws(() => f.db.exec('DELETE FROM thingamajob_baseline_evaluations'), /Immutable/);
  } finally {
    f.db.close();
  }
});
test('one owner question saves context and related decisions; retries preserve audit; non-owner/forged scope fails closed', async () => {
  const f = await fixture();
  try {
    const body = {
      issueId: 'question-1',
      answer: 'Canonical title clarified in this fictional fixture',
      decisions: [
        { candidateId: 'c1', statement: 'Fictional canonical title', reject: false },
        { candidateId: 'c2', statement: 'Fictional claim 2', reject: true },
      ],
    };
    assert.equal((await f.post(f.route + '/resolve', body, 'two')).status, 403);
    assert.equal((await f.post(f.route + '/resolve', { ...body, role: 'owner' })).status, 400);
    const first = await f.post(f.route + '/resolve', body);
    assert.equal(first.status, 200);
    assert.equal((await f.post(f.route + '/resolve', body)).status, 200);
    assert.equal(
      (await f.post(f.route + '/resolve', { ...body, answer: 'Different answer' })).status,
      409,
    );
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_baseline_answers').get().n, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_active_baseline').get().n, 1);
    const result = await f.worker.fetch(await signedEvidenceRequest(f.route, 'one'), f.env);
    assert.equal((await result.json()).baseline.issues[0].answer.answer, body.answer);
  } finally {
    f.db.close();
  }
});

test('interrupted grouped decisions retain explicit partial history and resume without duplicate reviews or premature answer', async () => {
  const f = await fixture();
  try {
    const body = {
      issueId: 'question-1',
      answer: 'Fictional owner resolution',
      decisions: [
        { candidateId: 'c1', statement: 'Canonical A', reject: false },
        { candidateId: 'c2', statement: 'Canonical B', reject: false },
      ],
    };
    f.db.exec(
      "CREATE TRIGGER fictional_issue_failure BEFORE INSERT ON thingamajob_reviews WHEN NEW.proposal_id='" +
        f.ids[2] +
        "' BEGIN SELECT RAISE(ABORT,'Fictional injected failure'); END;",
    );
    assert.equal((await f.post(f.route + '/resolve', body)).status, 503);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_baseline_answers').get().n, 0);
    f.db.exec('DROP TRIGGER fictional_issue_failure');
    assert.equal((await f.post(f.route + '/resolve', body)).status, 200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_baseline_answers').get().n, 1);
  } finally {
    f.db.close();
  }
});
test('title reassessment is append-only, visible as informational provenance and cannot be resolved as a current conflict', async () => {
  const f = await fixture();
  try {
    f.db.exec(readFileSync(new URL('title-presentations.sql', import.meta.url), 'utf8'));
    const original = f.db.prepare('SELECT * FROM thingamajob_baseline_evaluations').all();
    f.db
      .prepare(
        "INSERT INTO thingamajob_baseline_reassessments(workspace_id,run_id,candidate_id,revision,category,reasons_json,policy_version) VALUES ('workspace-one',?,'c1',2,'qualified','[\"Source title presentation\"]','fictional-title-v2')",
      )
      .run(f.runId);
    f.db
      .prepare(
        "INSERT INTO thingamajob_issue_reassessments(workspace_id,run_id,issue_id,revision,disposition,reason,policy_version) VALUES ('workspace-one',?,'question-1',2,'informational','Title wording alone is not a conflict','fictional-title-v2')",
      )
      .run(f.runId);
    const result = await f.worker.fetch(await signedEvidenceRequest(f.route, 'one'), f.env);
    assert.equal(result.status, 200);
    const summary = (await result.json()).baseline;
    assert.equal(summary.issues.length, 0);
    assert.equal(summary.titleHistory.length, 1);
    assert.equal(summary.evaluations.find((e) => e.candidateId === 'c1').category, 'qualified');
    assert.deepEqual(
      f.db.prepare('SELECT * FROM thingamajob_baseline_evaluations').all(),
      original,
    );
    const body = {
      issueId: 'question-1',
      answer: 'Should not be required',
      decisions: [
        { candidateId: 'c1', statement: 'Fictional claim 1', reject: false },
        { candidateId: 'c2', statement: 'Fictional claim 2', reject: false },
      ],
    };
    assert.equal((await f.post(f.route + '/resolve', body)).status, 403);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 0);
    assert.throws(() => f.db.exec('DELETE FROM thingamajob_issue_reassessments'), /Immutable/);
  } finally {
    f.db.close();
  }
});
test('context reassessment keeps optional dates unassigned and source summaries inspectable without reopening a question', async () => {
  const f = await fixture();
  try {
    f.db.exec(readFileSync(new URL('title-presentations.sql', import.meta.url), 'utf8'));
    f.db.exec(readFileSync(new URL('source-contexts.sql', import.meta.url), 'utf8'));
    const original = f.db.prepare('SELECT * FROM thingamajob_baseline_issues').all();
    f.db
      .prepare(
        "INSERT INTO thingamajob_issue_reassessments(workspace_id,run_id,issue_id,revision,disposition,reason,policy_version) VALUES ('workspace-one',?,'question-1',3,'informational','Source-date presentation only; no required chronology fact','fictional-context-v3')",
      )
      .run(f.runId);
    const source = f.db
      .prepare('SELECT source_id FROM thingamajob_proposal_sources WHERE proposal_id=?')
      .get(f.ids[0]);
    f.db
      .prepare(
        "INSERT INTO thingamajob_source_contexts(workspace_id,run_id,candidate_id,source_id,issue_id,kind,display_text,citation_json,document_date,date_basis,policy_version) VALUES ('workspace-one',?,'c1',?,'question-1','duration_summary','Historical wording, not canonical duration','[]',NULL,'Authored date unknown; capture time is separate','fictional-context-v3')",
      )
      .run(f.runId, source.source_id);
    const response = await f.worker.fetch(await signedEvidenceRequest(f.route, 'one'), f.env);
    assert.equal(response.status, 200);
    const baseline = (await response.json()).baseline;
    assert.equal(baseline.issues.length, 0);
    assert.equal(baseline.sourceContexts[0].documentDate, null);
    assert.equal(baseline.sourceContexts[0].kind, 'duration_summary');
    assert.deepEqual(f.db.prepare('SELECT * FROM thingamajob_baseline_issues').all(), original);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 0);
    assert.throws(() => f.db.exec('DELETE FROM thingamajob_source_contexts'), /Immutable/);
  } finally {
    f.db.close();
  }
});
test('accepted duration-summary history is preserved while excluded from canonical active career truth', async () => {
  const f = await fixture();
  try {
    f.db.exec(readFileSync(new URL('title-presentations.sql', import.meta.url), 'utf8'));
    f.db.exec(readFileSync(new URL('source-contexts.sql', import.meta.url), 'utf8'));
    const reviewed = await f.post(
      f.root + '/assertions/' + f.ids[1] + '/review',
      { decision: 'accepted', expectedVersion: 1 },
      'one',
      { 'Idempotency-Key': 'historical-duration-review' },
    );
    assert.equal(reviewed.status, 200);
    const source = f.db
      .prepare('SELECT source_id FROM thingamajob_proposal_sources WHERE proposal_id=?')
      .get(f.ids[1]);
    f.db
      .prepare(
        "INSERT INTO thingamajob_source_contexts(workspace_id,run_id,candidate_id,source_id,issue_id,kind,display_text,citation_json,document_date,date_basis,policy_version) VALUES ('workspace-one',?,'c1',?,'question-1','duration_summary','Source-specific summary','[]',NULL,'Source date unknown','fictional-v3')",
      )
      .run(f.runId, source.source_id);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n, 1);
    assert.equal(
      f.db.prepare('SELECT count(*) n FROM thingamajob_canonical_active_claims').get().n,
      0,
    );
    const snapshot = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/workflow', 'one'),
      f.env,
    );
    assert.equal(
      (await snapshot.json()).proposals.find((p) => p.proposalId === f.ids[1]).claim,
      null,
    );
    const history = await f.worker.fetch(
      await signedEvidenceRequest(f.root + '/assertions/' + f.ids[1], 'one'),
      f.env,
    );
    const audit = await history.json();
    assert.equal(audit.reviewDisposition, 'accepted');
    assert.ok(audit.claim);
    assert.equal(audit.history.length, 2);
  } finally {
    f.db.close();
  }
});
