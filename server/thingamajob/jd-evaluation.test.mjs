import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
import { validateEvaluation, EvaluationUnavailable } from './jd-contract.ts';
import { openAiReasoner } from './jd-provider.ts';
import { canonicalInventoryDigest, evaluationContext } from './jd-policy.ts';
const endpoint = '/api/thingamajob/test/evaluations';
const description =
  'Required: Angular application development. Preferred: current PHP proficiency. Required: Rust expertise. Official product Angular 10 experience.';
function requirement(
  id,
  quote,
  outcome,
  evidence = [],
  reasoning = 'Direct canonical testimony.',
  current = false,
) {
  return {
    id,
    requirement: quote,
    jdQuote: quote,
    importance: id === 'r2' ? 'preferred' : 'required',
    currentEvidenceRequired: current,
    outcome,
    kind: 'professional_qualification',
    basis:
      outcome === 'MET'
        ? 'supported'
        : outcome === 'UNKNOWN'
          ? 'insufficient_evidence'
          : evidence.some((e) => e.relation === 'contradicts')
            ? 'explicit_incompatibility'
            : 'absent_from_complete_record',
    reasoning,
    materialGaps: [],
    evidence,
    question: outcome === 'UNKNOWN' ? 'Can you supply relevant evidence?' : null,
  };
}
async function fixture(reason) {
  let calls = 0;
  const ids = [];
  const reasoner = {
    async evaluate(jd, truths) {
      calls++;
      return reason(jd, truths, ids, f);
    },
  };
  const f = evidenceFixture(reasoner);
  for (const name of [
    'assertions.sql',
    'claim-lifecycle.sql',
    'unknowns.sql',
    'extraction-staging.sql',
    'baseline.sql',
    'title-presentations.sql',
    'source-contexts.sql',
    'canonical-truth.sql',
    'jd-evaluation.sql',
    'jd-diagnostics.sql',
    'jd-harness-diagnostics.sql',
  ])
    f.db.exec(readFileSync(new URL(name, import.meta.url), 'utf8'));
  const root = '/api/thingamajob/workspaces/workspace-one';
  const post = async (path, body, key = 'request', subject = 'one') =>
    f.worker.fetch(
      await signedEvidenceRequest(path, subject, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(body),
      }),
      f.env,
    );
  const uploaded = await f.worker.fetch(
    await signedEvidenceRequest(root + '/evidence', 'one', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'source' },
      body: uploadForm(),
    }),
    f.env,
  );
  const source = (await uploaded.json()).sourceId;
  const facts = [
    'The candidate builds Angular applications.',
    'A historical resume listed PHP; current proficiency is not established.',
    'The official product remained on Angular 7.',
    'PRIVATE hidden candidate fact.',
    'Duplicate Angular support.',
    'Historical-only duration summary.',
    'Rejected Rust claim.',
  ];
  for (const statement of facts) {
    const p = await post(
      root + '/assertions',
      {
        statement,
        proposerAttribution: 'Fictional archive',
        evidence: [{ sourceId: source, locator: 'fictional:p1' }],
      },
      'p' + ids.length,
    );
    assert.equal(p.status, 200);
    ids.push((await p.json()).proposalId);
  }
  const doc = {
    claims: ids.map((p, i) => ({
      id: 'c' + i,
      uncertainties: i === 1 ? ['Historical listing only.'] : [],
    })),
  };
  f.db
    .prepare(
      "INSERT INTO thingamajob_extraction_runs VALUES('workspace-one','run','fp',?,'actor-one','staged',unixepoch())",
    )
    .run(JSON.stringify(doc));
  for (let i = 0; i < ids.length; i++) {
    f.db
      .prepare("INSERT INTO thingamajob_extraction_candidates VALUES('workspace-one','run',?,?)")
      .run('c' + i, ids[i]);
    f.db
      .prepare(
        "INSERT INTO thingamajob_baseline_evaluations VALUES('workspace-one','run',?,?,'baseline','[]','policy','digest','authorized_test_policy',unixepoch())",
      )
      .run('c' + i, ids[i]);
  }
  for (const [i, usage, target] of [
    [3, 'private_only', null],
    [4, 'duplicate', ids[0]],
    [5, 'historical_only', null],
  ])
    f.db
      .prepare(
        "INSERT INTO thingamajob_truth_usage VALUES('workspace-one',?,1,?,NULL,?,'Fictional usage','Fictional owner authorization',unixepoch())",
      )
      .run(ids[i], usage, target);
  await post(
    root + '/assertions/' + ids[6] + '/review',
    { expectedVersion: 1, decision: 'rejected' },
    'reject',
  );
  return {
    ...f,
    ids,
    facts,
    post,
    get calls() {
      return calls;
    },
  };
}
function valid(jd, truths, ids) {
  assert.equal(truths.length, 3);
  assert(!JSON.stringify(truths).includes('PRIVATE'));
  assert(!truths.some((t) => [ids[4], ids[5], ids[6]].includes(t.truthId)));
  return {
    requirements: [
      requirement('r1', 'Angular application development', 'MET', [
        { truthId: ids[0], quote: 'builds Angular applications', relation: 'meets' },
      ]),
      requirement(
        'r2',
        'current PHP proficiency',
        'MET',
        [{ truthId: ids[1], quote: 'historical resume listed PHP', relation: 'meets' }],
        'Historical PHP evidence only.',
        true,
      ),
      requirement('r3', 'Rust expertise', 'NOT MET', [], 'No evidence for Rust.'),
      requirement(
        'r4',
        'Official product Angular 10 experience',
        'NOT MET',
        [
          {
            truthId: ids[2],
            quote: 'official product remained on Angular 7',
            relation: 'contradicts',
          },
        ],
        'Official product was on 7, not 10.',
      ),
    ],
  };
}
test('real owner-scoped evaluation uses only canonical truth, preserves qualifications and conservative states, retains/idempotently reads result', async () => {
  const f = await fixture(valid);
  try {
    const before = f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n;
    const r = await f.post(endpoint, { jobDescription: description });
    assert.equal(r.status, 200);
    const result = await r.json();
    assert.deepEqual(
      result.requirements.map((r) => r.outcome),
      ['MET', 'UNKNOWN', 'UNKNOWN', 'NOT MET'],
    );
    assert.equal(result.requirements[1].importance, 'preferred');
    assert.equal(result.requirements[1].evidence[0].qualifications[0], 'Historical listing only.');
    const retry = await f.post(endpoint, { jobDescription: description });
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).evaluationId, result.evaluationId);
    assert.equal(f.calls, 1);
    assert.equal(
      (await f.post(endpoint, { jobDescription: description + ' changed' })).status,
      409,
    );
    const get = await f.worker.fetch(
      await signedEvidenceRequest(endpoint + '/' + result.evaluationId),
      f.env,
    );
    assert.equal(get.status, 200);
    assert.equal(
      (
        await f.worker.fetch(
          await signedEvidenceRequest(endpoint + '/' + result.evaluationId, 'two'),
          f.env,
        )
      ).status,
      404,
    );
    assert.equal(
      (await f.post(endpoint, { jobDescription: description }, 'other', 'two')).status,
      503,
    );
    assert.equal(f.calls, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n, before);
    f.db
      .prepare(
        "INSERT INTO thingamajob_truth_usage VALUES('workspace-one',?,1,'private_only',NULL,NULL,'New private classification','Owner instruction',unixepoch())",
      )
      .run(f.ids[0]);
    assert.equal(
      (
        await f.worker.fetch(
          await signedEvidenceRequest(endpoint + '/' + result.evaluationId),
          f.env,
        )
      ).status,
      409,
    );
  } finally {
    f.db.close();
  }
});

test('complete professional inventory applies only to the configured owner and exact canonical snapshot', async () => {
  const f = await fixture(valid);
  try {
    const truth = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/truth'),
      f.env,
    );
    const canonical = (await truth.json()).claims;
    f.env.TEST_REFERENCE_WORKSPACE = 'workspace-one';
    f.env.JD_COMPLETE_CORPUS_DIGEST = await canonicalInventoryDigest(canonical);
    assert.equal(
      (await evaluationContext('workspace-two', canonical, f.env)).professionalInventory,
      'unconfirmed',
    );
    assert.equal(
      (await evaluationContext('workspace-one', canonical.slice(1), f.env)).professionalInventory,
      'unconfirmed',
    );
    const before = f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n;
    const response = await f.post(endpoint, { jobDescription: description }, 'complete');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.evaluationContext.professionalInventory, 'complete');
    assert.deepEqual(
      body.requirements.map((r) => r.outcome),
      ['MET', 'UNKNOWN', 'NOT MET', 'NOT MET'],
    );
    assert.equal(body.requirements[2].basis, 'absent_from_complete_record');
    assert.equal(body.requirements[2].question, null);
    assert(!body.requirements[2].reasoning.includes('UNKNOWN'));
    f.env.JD_COMPLETE_CORPUS_DIGEST = '0'.repeat(64);
    const unconfirmed = await f.post(
      endpoint,
      { jobDescription: description },
      'coverage-mismatch',
    );
    assert.equal(unconfirmed.status, 200);
    const other = await unconfirmed.json();
    assert.equal(other.evaluationContext.professionalInventory, 'unconfirmed');
    assert.equal(other.requirements[2].outcome, 'UNKNOWN');
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n, before);
    f.db.exec("UPDATE thingamajob_jd_evaluations SET policy_version='canonical-jd-v2'");
    const historical = await f.worker.fetch(
      await signedEvidenceRequest(endpoint + '/' + body.evaluationId),
      f.env,
    );
    assert.equal(historical.status, 409);
    assert((await historical.json()).error.includes('superseded policy'));
  } finally {
    f.db.close();
  }
});

test('known specialist absence does not erase frontend matches or turn current-state/preferences/conflicts into NO', () => {
  const truths = [
    {
      truthId: 'front',
      statement: 'The candidate builds accessible frontend applications.',
      state: 'source_established',
      qualifications: [],
    },
    {
      truthId: 'old',
      statement: 'A historical source listed a nursing license; current active status is unknown.',
      state: 'source_established',
      qualifications: ['Historical credential only.'],
    },
    {
      truthId: 'yes',
      statement: 'Owner asserts willingness to relocate.',
      state: 'accepted',
      qualifications: [],
    },
    {
      truthId: 'no',
      statement: 'Owner asserts unwillingness to relocate.',
      state: 'accepted',
      qualifications: [],
    },
  ];
  const jd =
    'Required: accessible frontend applications. Required: quantum compiler technology. Required: active nursing license. Preferred: salary flexibility. Required: relocation.';
  const rows = [
    requirement('r1', 'accessible frontend applications', 'MET', [
      { truthId: 'front', quote: truths[0].statement, relation: 'meets' },
    ]),
    { ...requirement('r2', 'quantum compiler technology', 'UNKNOWN'), importance: 'required' },
    {
      ...requirement('r3', 'active nursing license', 'UNKNOWN', [
        { truthId: 'old', quote: truths[1].statement, relation: 'context' },
      ]),
      kind: 'current_state',
    },
    {
      ...requirement('r4', 'salary flexibility', 'NOT MET'),
      kind: 'preference',
      importance: 'preferred',
    },
    {
      ...requirement('r5', 'relocation', 'MET', [
        { truthId: 'yes', quote: truths[2].statement, relation: 'meets' },
        { truthId: 'no', quote: truths[3].statement, relation: 'contradicts' },
      ]),
      kind: 'situational',
      basis: 'conflicting_evidence',
    },
  ];
  const result = validateEvaluation({ requirements: rows }, jd, truths, {
    professionalInventory: 'complete',
    authority: 'Fixture owner approval',
  });
  assert.deepEqual(
    result.requirements.map((r) => r.outcome),
    ['MET', 'NOT MET', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN'],
  );
  assert.equal(result.requirements[1].question, null);
  assert.equal(result.requirements[4].basis, 'conflicting_evidence');
  assert.equal(result.requirements[4].evidence.length, 2);
});

test('related context cannot hide a required professional gap or establish material domain/scale qualifiers', () => {
  const truths = [
    {
      truthId: 'api',
      statement: 'The fictional candidate collaborated on REST integrations.',
      state: 'source_established',
      qualifications: [],
    },
    {
      truthId: 'testing',
      statement: 'The fictional candidate used TestBed for component tests.',
      state: 'source_established',
      qualifications: [],
    },
    {
      truthId: 'lead',
      statement: 'The fictional candidate led frontend technical delivery.',
      state: 'accepted',
      qualifications: [],
    },
    {
      truthId: 'history',
      statement: 'A historical resume listed Node; current proficiency is not established.',
      state: 'source_established',
      qualifications: ['Historical listing only.'],
    },
    {
      truthId: 'explicit',
      statement: 'The fictional license was revoked.',
      state: 'accepted',
      qualifications: [],
    },
  ];
  const jd =
    'API design and development. Building testing infrastructure. Own a user-growth area. Scale initiatives from 1 to 10. Current Node proficiency. Work in Seattle. Ambiguous platform experience. Active license.';
  const context = { professionalInventory: 'complete', authority: 'Fictional owner approval' };
  const cite = (i, relation = 'context') => [
    { truthId: truths[i].truthId, quote: truths[i].statement, relation },
  ];
  const rows = [
    requirement('r1', 'API design and development', 'UNKNOWN', cite(0)),
    {
      ...requirement('r3', 'Building testing infrastructure', 'UNKNOWN', cite(1)),
      materialGaps: ['Building testing infrastructure rather than using a test tool.'],
    },
    {
      ...requirement('r4', 'Own a user-growth area', 'MET', cite(2, 'meets')),
      materialGaps: ['User-growth domain ownership.'],
    },
    {
      ...requirement('r5', 'Scale initiatives from 1 to 10', 'MET', cite(2, 'meets')),
      importance: 'preferred',
      materialGaps: ['Scaling initiatives from 1 to 10.'],
    },
    {
      ...requirement(
        'r6',
        'Current Node proficiency',
        'UNKNOWN',
        cite(3),
        'Historical listing only.',
        true,
      ),
      materialGaps: ['Current proficiency.'],
    },
    { ...requirement('r7', 'Work in Seattle', 'UNKNOWN'), kind: 'situational' },
    {
      ...requirement('r8', 'Ambiguous platform experience', 'UNKNOWN', cite(2)),
      basis: 'ambiguous_requirement',
    },
    {
      ...requirement('r9', 'Active license', 'NOT MET', cite(4, 'contradicts')),
      materialGaps: ['Active license.'],
    },
  ];
  const result = validateEvaluation({ requirements: rows }, jd, truths, context);
  assert.deepEqual(
    result.requirements.map((r) => r.outcome),
    ['NOT MET', 'NOT MET', 'NOT MET', 'NOT MET', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 'NOT MET'],
  );
  for (const r of result.requirements.slice(0, 3)) {
    assert.equal(r.question, null);
    assert(r.evidence.every((e) => e.relation === 'context'));
    assert.match(r.reasoning, /comprehensive career record/);
  }
  const unconfirmed = validateEvaluation({ requirements: rows }, jd, truths);
  assert.equal(unconfirmed.requirements[0].outcome, 'UNKNOWN');
  assert.equal(unconfirmed.requirements[2].outcome, 'UNKNOWN');
});

test('semantic combination and independent frontend support do not inherit unrelated current-skill qualifiers', () => {
  const truths = [
    {
      truthId: 'offshore',
      statement:
        'The fictional candidate guided offshore engineering teams in India in a globally distributed environment.',
      state: 'accepted',
      qualifications: [],
    },
    {
      truthId: 'uk',
      statement: 'The fictional candidate advised UK leadership.',
      state: 'source_established',
      qualifications: [],
    },
    {
      truthId: 'ui',
      statement: 'A historical source lists Angular frontend work.',
      state: 'corrected',
      qualifications: ['Historical listing only.'],
    },
  ];
  const jd =
    'Collaborate with globally distributed teams across multiple time zones. Modern frontend familiarity and current backend proficiency.';
  const a = requirement(
    'r1',
    'Collaborate with globally distributed teams across multiple time zones.',
    'MET',
    truths.slice(0, 2).map((t) => ({ truthId: t.truthId, quote: t.statement, relation: 'meets' })),
  );
  const b = {
    ...requirement('r3', jd.split('. ')[1], 'MET', [
      { truthId: 'ui', quote: truths[2].statement, relation: 'meets' },
    ]),
    requirement: 'Modern frontend familiarity',
    currentEvidenceRequired: false,
  };
  const result = validateEvaluation({ requirements: [a, b] }, jd, truths);
  assert.deepEqual(
    result.requirements.map((r) => r.outcome),
    ['MET', 'MET'],
  );
  assert(result.requirements.every((r) => r.question === null));
  assert(result.requirements.every((r) => r.materialGaps.length === 0));
});

test('importance never changes complete-corpus professional gap classification, including compound parts', () => {
  const truths = [
    {
      truthId: 'study',
      statement: 'The fictional candidate designed comparative usability studies.',
      state: 'source_established',
      qualifications: [],
    },
  ];
  const jd =
    'Statistics knowledge. Experimental design. Current PhD enrollment. Future full-time availability.';
  const rows = ['required', 'preferred', 'unspecified'].map((importance, i) => ({
    ...requirement('gap' + i, 'Statistics knowledge', 'UNKNOWN', [
      { truthId: 'study', quote: truths[0].statement, relation: 'context' },
    ]),
    importance,
    materialGaps: ['Statistics knowledge.'],
  }));
  rows.push({
    ...requirement('phd', 'Current PhD enrollment', 'UNKNOWN'),
    importance: 'preferred',
    currentEvidenceRequired: true,
    materialGaps: ['PhD enrollment.'],
  });
  rows.push({
    ...requirement('available', 'Future full-time availability', 'UNKNOWN'),
    importance: 'preferred',
    kind: 'situational',
    materialGaps: ['Future availability.'],
  });
  rows.push({
    ...requirement('design', 'Experimental design', 'MET', [
      { truthId: 'study', quote: truths[0].statement, relation: 'meets' },
    ]),
    importance: 'preferred',
  });
  const result = validateEvaluation({ requirements: rows }, jd, truths, {
    professionalInventory: 'complete',
    authority: 'Fictional owner approval',
  });
  assert.deepEqual(
    result.requirements.map((r) => r.outcome),
    ['NOT MET', 'NOT MET', 'NOT MET', 'NOT MET', 'UNKNOWN', 'MET'],
  );
  assert.deepEqual(
    result.requirements.slice(0, 3).map((r) => r.importance),
    ['required', 'preferred', 'unspecified'],
  );
  assert(result.requirements.slice(0, 4).every((r) => r.question === null));
  assert.match(result.requirements[4].question, /evidence/);
  const incomplete = validateEvaluation({ requirements: rows }, jd, truths);
  assert(incomplete.requirements.slice(0, 4).every((r) => r.outcome === 'UNKNOWN'));
});

test('functional language matching can combine education and substantive use without claiming a certified level', () => {
  const truths = [
    {
      truthId: 'degree',
      statement: 'The fictional candidate completed English-language university education.',
      state: 'source_established',
      qualifications: [],
    },
    {
      truthId: 'work',
      statement: 'The fictional candidate teaches and advises cross-functional teams in English.',
      state: 'accepted',
      qualifications: [],
    },
  ];
  const jd =
    'Professional English proficiency. Certified CEFR C2 English. Future internship location.';
  const rows = [
    {
      ...requirement(
        'language',
        'Professional English proficiency',
        'MET',
        truths.map((t) => ({ truthId: t.truthId, quote: t.statement, relation: 'meets' })),
      ),
      currentEvidenceRequired: true,
    },
    {
      ...requirement('certificate', 'Certified CEFR C2 English', 'UNKNOWN'),
      importance: 'preferred',
      materialGaps: ['CEFR C2 certification.'],
    },
    {
      ...requirement('where', 'Future internship location', 'UNKNOWN'),
      kind: 'situational',
      importance: 'unspecified',
    },
  ];
  const result = validateEvaluation({ requirements: rows }, jd, truths, {
    professionalInventory: 'complete',
    authority: 'Fictional owner approval',
  });
  assert.deepEqual(
    result.requirements.map((r) => r.outcome),
    ['MET', 'NOT MET', 'UNKNOWN'],
  );
  assert.equal(result.requirements[0].question, null);
  assert(result.requirements[0].evidence.every((e) => truths.some((t) => t.statement === e.quote)));
});
test('invalid references, provider failures and LoT changes fail closed without automatic paid retry', async () => {
  for (const mode of ['bad-id', 'bad-quote', 'failure', 'changed']) {
    const f = await fixture((jd, truths, ids, state) => {
      if (mode === 'failure') throw Error('Private provider failure');
      if (mode === 'changed')
        state.db
          .prepare(
            "INSERT INTO thingamajob_truth_usage VALUES('workspace-one',?,1,'private_only',NULL,NULL,'Owner change','Authorization',unixepoch())",
          )
          .run(ids[0]);
      const r = valid(jd, truths, ids);
      if (mode === 'bad-id') r.requirements[0].evidence[0].truthId = 'other-client';
      if (mode === 'bad-quote') r.requirements[0].evidence[0].quote = 'Invented';
      return r;
    });
    try {
      const r = await f.post(endpoint, { jobDescription: description });
      assert.equal(r.status, mode === 'changed' ? 409 : 503);
      assert.equal(
        f.db.prepare('SELECT state FROM thingamajob_jd_evaluations').get().state,
        'failed',
      );
      const diagnostic = f.db
        .prepare('SELECT stage,code,details_json FROM thingamajob_jd_diagnostics')
        .get();
      assert.equal(diagnostic.stage, mode === 'failure' ? 'provider' : 'validation');
      assert.equal(JSON.stringify(diagnostic).includes('Private provider failure'), false);
      await f.post(endpoint, { jobDescription: description });
      assert.equal(f.calls, 1);
    } finally {
      f.db.close();
    }
  }
});

test('public sandbox failures retain a safe operator-readable reference without storing JD or career text', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  for (const mode of ['provider', 'validation', 'diagnostic-store']) {
    const f = await fixture((jd, truths, ids) => {
      if (mode !== 'validation')
        throw new EvaluationUnavailable('provider_http', {
          httpStatus: 400,
          requestId: 'req_fixture',
          providerCode: 'invalid_json_schema',
          rawBody: 'Private provider payload and career text.',
        });
      const result = valid(jd, truths, ids);
      result.requirements[0].evidence[0].truthId = 'unknown-id';
      return result;
    });
    try {
      if (mode === 'diagnostic-store') f.db.exec('DROP TABLE thingamajob_jd_harness_diagnostics');
      const before = JSON.stringify(
        f.db.prepare('SELECT * FROM thingamajob_canonical_truth').all(),
      );
      const env = {
        ...f.env,
        JD_HARNESS_ENABLED: 'true',
        TEST_REFERENCE_WORKSPACE: 'workspace-one',
        JD_HARNESS_LIMIT: { limit: async () => ({ success: true }) },
      };
      const response = await f.worker.fetch(
        new Request('https://djamespoer.com/test/thingamajob/evaluate', {
          method: 'POST',
          headers: { Origin: 'https://djamespoer.com', 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: description }),
        }),
        env,
      );
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.match(body.evaluationId, /^jd-[a-f0-9-]{36}$/);
      assert.match(body.error, /editable preview are retained/);
      assert.match(body.error, /support reference/);
      assert.equal(JSON.stringify(body).includes('invalid_json_schema'), false);
      assert.equal(JSON.stringify(body).includes('Private'), false);
      if (mode !== 'diagnostic-store') {
        const record = f.db.prepare('SELECT * FROM thingamajob_jd_harness_diagnostics').get();
        assert.equal(record.reference_id, body.evaluationId);
        assert.equal(record.stage, mode);
        assert.equal(record.code, mode === 'provider' ? 'provider_http' : 'truth_citation');
        assert.equal(JSON.parse(record.details_json).canonicalTruthCount, 3);
        assert.equal(record.details_json.includes('Private'), false);
        assert.equal(record.details_json.includes(description), false);
      }
      assert.equal(
        JSON.stringify(f.db.prepare('SELECT * FROM thingamajob_canonical_truth').all()),
        before,
      );
      assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_jd_evaluations').get().n, 0);
      assert.equal(f.calls, 1);
    } finally {
      f.db.close();
    }
  }
  assert(log.mock.calls.some((c) => c.arguments[0] === 'jd-harness-diagnostic-write-failed'));
  assert.equal(JSON.stringify(log.mock.calls).includes('Private'), false);
});
test('cross-origin, malformed scope/input, revoked membership and disabled TEST never invoke provider', async () => {
  const f = await fixture(valid);
  try {
    assert.equal(
      (await f.post(endpoint, { jobDescription: description, workspaceId: 'workspace-two' }))
        .status,
      400,
    );
    assert.equal((await f.post(endpoint, { jobDescription: 'short' })).status, 400);
    const cross = await signedEvidenceRequest(endpoint, 'one', {
      method: 'POST',
      headers: { Origin: 'https://evil.invalid' },
    });
    assert.equal((await f.worker.fetch(cross, f.env)).status, 403);
    assert.equal(
      (
        await f.worker.fetch(
          new Request('https://api-test.djamespoer.com' + endpoint, {
            method: 'POST',
            headers: { Origin: 'https://api-test.djamespoer.com' },
          }),
          f.env,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.worker.fetch(await signedEvidenceRequest(endpoint), {
          ...f.env,
          TEST_BOOTSTRAP_ENABLED: 'false',
        })
      ).status,
      404,
    );
    f.db.exec("UPDATE thingamajob_memberships SET active=0 WHERE actor_id='actor-one'");
    assert.equal((await f.post(endpoint, { jobDescription: description })).status, 403);
    assert.equal(f.calls, 0);
  } finally {
    f.db.close();
  }
});
test('reservation prevents concurrent provider calls and expired interrupted reservation is recoverable', async () => {
  let release;
  const wait = new Promise((r) => (release = r));
  const f = await fixture(async (...args) => {
    await wait;
    return valid(...args);
  });
  try {
    const first = f.post(endpoint, { jobDescription: description }, 'first');
    while (!f.calls) await new Promise((r) => setTimeout(r, 1));
    assert.equal((await f.post(endpoint, { jobDescription: description }, 'second')).status, 409);
    assert.equal((await f.post(endpoint, { jobDescription: description }, 'first')).status, 202);
    release();
    assert.equal((await first).status, 200);
    assert.equal(f.calls, 1);
    f.db.exec("UPDATE thingamajob_jd_evaluations SET state='pending',created_at=unixepoch()-181");
    assert.equal((await f.post(endpoint, { jobDescription: description }, 'third')).status, 200);
    assert.equal(f.calls, 2);
  } finally {
    release();
    f.db.close();
  }
});
test('provider uses strict structured output, store:false and no tools, and never leaks upstream body', async () => {
  let body;
  const transport = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    body = JSON.parse(init.body);
    return Response.json({
      status: 'completed',
      model: 'fictional-model',
      output: [
        { type: 'message', content: [{ type: 'output_text', text: '{"requirements":[]}' }] },
      ],
    });
  };
  await openAiReasoner('fictional-token', 'fictional-model', transport).evaluate(
    'Fictional JD',
    [],
  );
  assert.equal(body.store, false);
  assert.equal(body.tools, undefined);
  assert.equal(body.text.format.strict, true);
  await assert.rejects(() =>
    openAiReasoner('fictional', 'fictional', async () =>
      Response.json({ private: 'do not leak' }, { status: 429 }),
    ).evaluate('', []),
  );
});

test('citation choices are constrained compact refs and rebound only to real canonical IDs', async () => {
  let schema;
  const truths = [
    {
      truthId: 'fictional-canonical-uuid',
      statement: 'The candidate builds Angular applications.',
      state: 'source_established',
      qualifications: [],
    },
  ];
  const transport = async (_url, init) => {
    const request = JSON.parse(init.body);
    assert.equal(JSON.parse(request.input).canonicalTruths[0].truthId, 't1');
    assert.equal(JSON.parse(request.input).evaluationContext.professionalInventory, 'complete');
    assert(request.instructions.includes('absent_from_complete_record'));
    schema = request.text.format.schema;
    return Response.json({
      status: 'completed',
      model: 'fictional-model',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                requirements: [
                  requirement('r1', 'j1', 'MET', [{ truthId: 't1', relation: 'meets' }]),
                ],
              }),
            },
          ],
        },
      ],
    });
  };
  const raw = await openAiReasoner('fictional', 'fictional-model', transport).evaluate(
    description,
    truths,
    { professionalInventory: 'complete', authority: 'Fixture owner approval' },
  );
  assert.equal(raw.requirements[0].evidence[0].truthId, truths[0].truthId);
  assert.deepEqual(
    schema.properties.requirements.items.properties.evidence.items.properties.truthId.enum,
    ['t1'],
  );
  assert.equal(schema.properties.requirements.items.properties.requirement.enum, undefined);
  assert(schema.properties.requirements.items.required.includes('basis'));
  assert(schema.properties.requirements.items.required.includes('kind'));
  assert(schema.properties.requirements.items.required.includes('materialGaps'));
  assert.equal(validateEvaluation(raw, description, truths).requirements[0].outcome, 'MET');
});
