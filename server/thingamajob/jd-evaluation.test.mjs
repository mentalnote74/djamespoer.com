import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
import { validateEvaluation } from './jd-contract.ts';
import { openAiReasoner } from './jd-provider.ts';
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
    reasoning,
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
      await f.post(endpoint, { jobDescription: description });
      assert.equal(f.calls, 1);
    } finally {
      f.db.close();
    }
  }
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
test('provider uses strict structured output, no retention or tools, and never leaks upstream body', async () => {
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
