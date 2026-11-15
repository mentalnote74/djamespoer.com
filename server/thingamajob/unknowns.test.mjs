import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';

const root = '/api/thingamajob/workspaces/workspace-one',
  collection = root + '/unknowns';
async function fixture(withSources = true) {
  const f = evidenceFixture();
  for (const file of ['assertions.sql', 'claim-lifecycle.sql', 'unknowns.sql'])
    f.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const sources = {};
  if (withSources)
    for (const subject of ['one', 'two']) {
      const r = await f.worker.fetch(
        await signedEvidenceRequest(
          `/api/thingamajob/workspaces/workspace-${subject}/evidence`,
          subject,
          {
            method: 'POST',
            headers: { 'Idempotency-Key': 'fictional-source' },
            body: uploadForm(),
          },
        ),
        f.env,
      );
      sources[subject] = (await r.json()).sourceId;
    }
  return { ...f, sources };
}
async function post(f, path, body, key, subject = 'one', headers = {}) {
  return f.worker.fetch(
    await signedEvidenceRequest(path, subject, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...headers },
      body: JSON.stringify(body),
    }),
    f.env,
  );
}
async function read(f, path, subject = 'one') {
  return f.worker.fetch(await signedEvidenceRequest(path, subject), f.env);
}
async function create(f, key = 'unknown-one', subject = 'one', path = collection) {
  const r = await post(
    f,
    path,
    {
      question: 'What is the fictional fixture detail?',
      reason: 'Fictional information gap.',
      context: 'Synthetic test context.',
    },
    key,
    subject,
  );
  assert.equal(r.status, 200);
  return r.json();
}
async function answer(
  f,
  u,
  key = 'answer-one',
  evidence = [{ sourceId: f.sources.one, locator: 'Fictional source locator' }],
) {
  return post(
    f,
    collection + '/' + u.unknownId + '/answers',
    {
      answer: 'Fictional attributed answer. No career facts.',
      attribution: 'Fictional supplier',
      evidence,
      expectedVersion: u.version,
    },
    key,
  );
}
async function link(f, u, key = 'link-one', answerId = u.answers.at(-1).answerId) {
  return post(
    f,
    collection + '/' + u.unknownId + '/answers/' + answerId + '/proposal',
    {
      statement: 'Fictional proposed detail. No career facts.',
      proposerAttribution: 'Fictional author',
      expectedVersion: u.version,
    },
    key,
  );
}
async function review(f, u, decision = 'accepted', key = 'review-one') {
  return post(
    f,
    root + '/assertions/' + u.proposals.at(-1).proposalId + '/review',
    {
      decision,
      expectedVersion: 1,
      ...(decision === 'corrected'
        ? { correctedStatement: 'Corrected fictional detail. No career facts.' }
        : {}),
    },
    key,
  );
}
async function resolve(f, u, key = 'resolve-one', claimId = u.proposals.at(-1)?.claimId) {
  return post(
    f,
    collection + '/' + u.unknownId + '/resolve',
    {
      claimId,
      explanation:
        'This linked reviewed claim supplies the specific fictional detail asked by this question.',
      expectedVersion: u.version,
    },
    key,
  );
}
async function pathToClaim(f, decision = 'accepted') {
  let u = await create(f);
  u = await (await answer(f, u)).json();
  u = await (await link(f, u)).json();
  assert.equal((await review(f, u, decision)).status, 200);
  return (await read(f, collection + '/' + u.unknownId)).json();
}
function counts(f) {
  return [
    'thingamajob_unknowns',
    'thingamajob_unknown_answers',
    'thingamajob_unknown_proposals',
    'thingamajob_unknown_resolutions',
    'thingamajob_unknown_events',
  ].map((t) => f.db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n);
}

test('empty LoT/open UNKNOWN is valid; creation preserves question/reason/context without facts or evaluation', async () => {
  const f = await fixture(false);
  try {
    const u = await create(f);
    assert.equal(u.state, 'open');
    assert.equal(u.version, 1);
    assert.equal(u.resolution, null);
    assert.deepEqual(u.answers, []);
    assert.deepEqual(u.proposals, []);
    assert.equal(u.history[0].operation, 'opened');
    assert.deepEqual(counts(f), [1, 0, 0, 0, 1]);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_claims').get().n, 0);
    assert.ok(!('requirementEvaluation' in u) && !('evidenceStrength' in u));
    const retry = await create(f);
    assert.equal(retry.unknownId, u.unknownId);
    assert.equal(retry.replayed, true);
    assert.deepEqual(counts(f), [1, 0, 0, 0, 1]);
  } finally {
    f.db.close();
  }
});
test('attributed unsupported answer is preserved but stays open and cannot become evidence-backed truth', async () => {
  const f = await fixture(false);
  try {
    const initial = await create(f),
      r = await answer(f, initial, 'unsupported', []);
    assert.equal(r.status, 200);
    const u = await r.json();
    assert.equal(u.state, 'open');
    assert.equal(u.version, 2);
    assert.equal(u.answers[0].attribution, 'Fictional supplier');
    assert.equal(u.resolution, null);
    assert.equal((await link(f, u)).status, 409);
    assert.deepEqual(counts(f), [1, 1, 0, 0, 2]);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_proposals').get().n, 0);
  } finally {
    f.db.close();
  }
});
for (const decision of ['accepted', 'corrected'])
  test(
    'canonical ' +
      decision +
      ' path remains open until explicit owner resolution, preserving complete chronology',
    async () => {
      const f = await fixture();
      try {
        const originalSnapshot = JSON.stringify(
          [...f.objects.entries()].map(([key, bytes]) => [key, Array.from(bytes)]),
        );
        const u = await pathToClaim(f, decision);
        assert.equal(u.state, 'open');
        assert.equal(u.version, 3);
        assert.equal(u.resolution, null);
        assert.equal(u.proposals[0].reviewDisposition, decision);
        assert.equal(u.proposals[0].reviewHistory.length, 2);
        assert.equal(u.answers[0].answer, 'Fictional attributed answer. No career facts.');
        assert.deepEqual(
          u.history.map((e) => e.operation),
          ['opened', 'answered', 'proposal-linked'],
        );
        const result = await resolve(f, u);
        assert.equal(result.status, 200);
        const resolved = await result.json();
        assert.equal(resolved.state, 'resolved');
        assert.equal(resolved.version, 4);
        assert.equal(resolved.resolution.claimId, u.proposals[0].claimId);
        assert.match(resolved.resolution.explanation, /specific fictional detail/);
        assert.deepEqual(
          resolved.history.map((e) => e.operation),
          ['opened', 'answered', 'proposal-linked', 'resolved'],
        );
        assert.deepEqual(counts(f), [1, 1, 1, 1, 4]);
        assert.equal((await (await resolve(f, u)).json()).replayed, true);
        assert.deepEqual(counts(f), [1, 1, 1, 1, 4]);
        assert.equal((await resolve(f, u, 'different-repeated-request')).status, 409);
        assert.equal((await answer(f, resolved, 'after-close')).status, 409);
        assert.equal(
          JSON.stringify([...f.objects.entries()].map(([key, bytes]) => [key, Array.from(bytes)])),
          originalSnapshot,
        );
      } finally {
        f.db.close();
      }
    },
  );
test('rejected proposal cannot resolve; revised answer/new linked proposal preserve rejected history', async () => {
  const f = await fixture();
  try {
    let u = await pathToClaim(f, 'rejected');
    assert.equal(u.state, 'open');
    assert.equal(u.proposals[0].claimId, null);
    assert.equal((await resolve(f, u, 'reject-as-claim', u.proposals[0].proposalId)).status, 403);
    u = await (await answer(f, u, 'revised-answer')).json();
    u = await (await link(f, u, 'revised-proposal')).json();
    assert.equal((await review(f, u, 'corrected', 'revised-review')).status, 200);
    u = await (await read(f, collection + '/' + u.unknownId)).json();
    assert.equal(u.state, 'open');
    assert.equal(u.answers.length, 2);
    assert.equal(u.proposals.length, 2);
    assert.ok(u.proposals.some((p) => p.reviewDisposition === 'rejected'));
    const corrected = u.proposals.find((p) => p.reviewDisposition === 'corrected');
    assert.equal((await resolve(f, u, 'revised-resolution', corrected.claimId)).status, 200);
  } finally {
    f.db.close();
  }
});
test('unrelated same-workspace accepted claim is insufficient; specific linkage is required', async () => {
  const f = await fixture();
  try {
    const u = await create(f);
    const p = await (
      await post(
        f,
        root + '/assertions',
        {
          statement: 'Unrelated fictional statement.',
          proposerAttribution: 'Fictional author',
          evidence: [{ sourceId: f.sources.one, locator: '' }],
        },
        'unrelated-proposal',
      )
    ).json();
    const accepted = await (
      await post(
        f,
        root + '/assertions/' + p.proposalId + '/review',
        { decision: 'accepted', expectedVersion: 1 },
        'unrelated-review',
      )
    ).json();
    assert.equal((await resolve(f, u, 'unrelated-resolution', accepted.claim.claimId)).status, 409);
    assert.equal((await (await read(f, collection + '/' + u.unknownId)).json()).state, 'open');
    assert.deepEqual(counts(f), [1, 0, 0, 0, 1]);
  } finally {
    f.db.close();
  }
});
test('stale versions, changed retries, status/identity/timestamp payloads and blank explanation fail closed', async () => {
  const f = await fixture();
  try {
    const u = await pathToClaim(f),
      path = collection + '/' + u.unknownId + '/resolve';
    for (const extra of [
      { state: 'resolved' },
      { owner: true },
      { actorId: 'actor-two' },
      { resolvedAt: 'fictional' },
      { evidenceStrength: 'Proven' },
      { requirementEvaluation: 'MET' },
      { explanation: ' ' },
    ])
      assert.equal(
        (
          await post(
            f,
            path,
            {
              claimId: u.proposals[0].claimId,
              explanation: 'Fictional relevance explanation',
              expectedVersion: u.version,
              ...extra,
            },
            'forged',
          )
        ).status,
        400,
      );
    assert.equal(
      (
        await post(
          f,
          path,
          {
            claimId: u.proposals[0].claimId,
            explanation: 'Fictional explanation',
            expectedVersion: 1,
          },
          'stale',
        )
      ).status,
      409,
    );
    assert.equal((await resolve(f, u, 'same-key')).status, 200);
    assert.equal(
      (
        await post(
          f,
          path,
          {
            claimId: u.proposals[0].claimId,
            explanation: 'Changed explanation',
            expectedVersion: u.version,
          },
          'same-key',
        )
      ).status,
      409,
    );
    assert.deepEqual(counts(f), [1, 1, 1, 1, 4]);
  } finally {
    f.db.close();
  }
});
test('answer and proposal retries retain one record/event; stale linked creation rolls back all proposal writes', async () => {
  const f = await fixture();
  try {
    const created = await create(f);
    const u = await (await answer(f, created)).json();
    const replay = await (await answer(f, created)).json();
    assert.equal(replay.answers[0].answerId, u.answers[0].answerId);
    assert.equal(replay.replayed, true);
    const stale = { ...u, version: 1 };
    assert.equal((await link(f, stale, 'stale-link')).status, 409);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_proposals').get().n, 0);
    const linked = await (await link(f, u)).json();
    const again = await (await link(f, u)).json();
    assert.equal(again.proposals[0].proposalId, linked.proposals[0].proposalId);
    assert.deepEqual(counts(f), [1, 1, 1, 0, 3]);
  } finally {
    f.db.close();
  }
});
test('concurrent answer and resolution requests enforce version preconditions and never duplicate history', async () => {
  const f = await fixture();
  try {
    const created = await create(f);
    const answers = await Promise.all([
      answer(f, created, 'one-answer'),
      answer(f, created, 'two-answer'),
    ]);
    assert.deepEqual(answers.map((r) => r.status).sort(), [200, 409]);
    let u = await (await read(f, collection + '/' + created.unknownId)).json();
    u = await (await link(f, u)).json();
    assert.equal((await review(f, u)).status, 200);
    u = await (await read(f, collection + '/' + u.unknownId)).json();
    const outcomes = await Promise.all([
      resolve(f, u, 'resolve-one'),
      resolve(f, u, 'resolve-two'),
    ]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    assert.deepEqual(counts(f), [1, 1, 1, 1, 4]);
  } finally {
    f.db.close();
  }
});
test('injected answer/link/resolution failures roll back head versions, dependent records and history', async () => {
  const f = await fixture();
  try {
    let u = await create(f);
    f.db.exec(
      "CREATE TRIGGER fail_answer BEFORE INSERT ON thingamajob_unknown_answers BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    assert.equal((await answer(f, u)).status, 503);
    assert.deepEqual(counts(f), [1, 0, 0, 0, 1]);
    f.db.exec('DROP TRIGGER fail_answer');
    u = await (await answer(f, u)).json();
    f.db.exec(
      "CREATE TRIGGER fail_link BEFORE INSERT ON thingamajob_unknown_proposals BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    assert.equal((await link(f, u)).status, 503);
    assert.deepEqual(counts(f), [1, 1, 0, 0, 2]);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_proposals').get().n, 0);
    f.db.exec('DROP TRIGGER fail_link');
    u = await (await link(f, u)).json();
    assert.equal((await review(f, u)).status, 200);
    u = await (await read(f, collection + '/' + u.unknownId)).json();
    f.db.exec(
      "CREATE TRIGGER fail_resolution BEFORE INSERT ON thingamajob_unknown_resolutions BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    const failed = await resolve(f, u);
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Service unavailable' });
    assert.deepEqual(counts(f), [1, 1, 1, 0, 3]);
    const unchanged = await (await read(f, collection + '/' + u.unknownId)).json();
    assert.equal(unchanged.state, 'open');
    assert.equal(unchanged.version, 3);
  } finally {
    f.db.close();
  }
});
test('commit-time revocation denies resolution without partial state or history', async () => {
  const f = await fixture();
  try {
    const u = await pathToClaim(f),
      batch = f.database.batch.bind(f.database);
    f.database.batch = async (statements) => {
      f.db.exec('UPDATE thingamajob_memberships SET active=0');
      return batch(statements);
    };
    assert.equal((await resolve(f, u)).status, 403);
    assert.deepEqual(counts(f), [1, 1, 1, 0, 3]);
    assert.equal(f.db.prepare('SELECT state FROM thingamajob_unknowns').get().state, 'open');
  } finally {
    f.db.close();
  }
});
test('foreign UNKNOWN/answer/evidence/claim relationships and non-owner members cannot bypass isolation', async () => {
  const f = await fixture();
  try {
    const u = await pathToClaim(f),
      twoRoot = collection.replace('workspace-one', 'workspace-two'),
      peer = await create(f, 'peer-unknown', 'two', twoRoot);
    assert.equal((await read(f, collection + '/' + u.unknownId, 'two')).status, 403);
    assert.equal((await read(f, twoRoot + '/' + peer.unknownId, 'one')).status, 403);
    assert.equal(
      (
        await post(
          f,
          twoRoot + '/' + u.unknownId + '/resolve',
          {
            claimId: u.proposals[0].claimId,
            explanation: 'Forged relevance',
            expectedVersion: u.version,
          },
          'foreign',
          'two',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post(
          f,
          twoRoot + '/' + peer.unknownId + '/resolve',
          {
            claimId: u.proposals[0].claimId,
            explanation: 'Foreign claim',
            expectedVersion: peer.version,
          },
          'foreign-claim',
          'two',
        )
      ).status,
      403,
    );
    assert.equal(
      (await answer(f, u, 'foreign-evidence', [{ sourceId: f.sources.two, locator: '' }])).status,
      403,
    );
    assert.equal((await link(f, u, 'foreign-answer', 'unknown-foreign-answer')).status, 403);
    f.db
      .prepare('INSERT INTO thingamajob_memberships VALUES (?,?,1)')
      .run('actor-two', 'workspace-one');
    assert.equal(
      (
        await post(
          f,
          collection + '/' + u.unknownId + '/resolve',
          {
            claimId: u.proposals[0].claimId,
            explanation: 'Pretended owner',
            expectedVersion: u.version,
          },
          'member',
          'two',
          { 'X-Role': 'owner' },
        )
      ).status,
      403,
    );
    assert.deepEqual(counts(f), [2, 1, 1, 0, 4]);
  } finally {
    f.db.close();
  }
});
test('UNKNOWN page/list is TEST-only, CSRF protected and does not expose identity or read tokens', async () => {
  const f = await fixture(false);
  try {
    const u = await create(f);
    const list = await read(f, collection);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).unknowns[0].unknownId, u.unknownId);
    const page = await read(f, '/api/thingamajob/test/unknowns');
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Resolve this UNKNOWN explicitly/);
    assert.ok(!/document\.cookie|CF_Authorization|localStorage/.test(html));
    assert.equal(
      (
        await post(
          f,
          collection,
          { question: 'Fictional question', reason: 'Fictional reason' },
          'cross-site',
          'one',
          { Origin: 'https://hostile.invalid' },
        )
      ).status,
      403,
    );
    const req = await signedEvidenceRequest('/api/thingamajob/test/unknowns');
    assert.equal(
      (await f.worker.fetch(req, { ...f.env, TEST_BOOTSTRAP_ENABLED: undefined })).status,
      404,
    );
    const live = await signedEvidenceRequest('/api/thingamajob/test/unknowns');
    assert.equal(
      (await f.worker.fetch(new Request(live.url.replace('api-test.', 'api.'), live), f.env))
        .status,
      404,
    );
  } finally {
    f.db.close();
  }
});

test('reciprocal foreign UNKNOWN access denies reads and writes without changing either workspace', async () => {
  const f = await fixture();
  try {
    const one = await create(f);
    const twoRoot = '/api/thingamajob/workspaces/workspace-two/unknowns';
    const two = await create(f, 'peer-unknown', 'two', twoRoot);
    for (const [subject, path, u] of [
      ['two', collection, one],
      ['one', twoRoot, two],
    ]) {
      assert.equal((await read(f, path + '/' + u.unknownId, subject)).status, 403);
      assert.equal(
        (
          await post(
            f,
            path + '/' + u.unknownId + '/answers',
            {
              answer: 'Fictional foreign answer',
              attribution: 'Fictional actor',
              expectedVersion: 1,
            },
            'foreign-answer',
            subject,
          )
        ).status,
        403,
      );
    }
    assert.deepEqual(counts(f), [2, 0, 0, 0, 2]);
  } finally {
    f.db.close();
  }
});

for (const operation of ['create', 'answer', 'link'])
  test('commit-time revocation rolls back UNKNOWN ' + operation, async () => {
    const f = await fixture();
    try {
      let u;
      if (operation !== 'create') u = await create(f);
      if (operation === 'link') u = await (await answer(f, u)).json();
      const before = counts(f);
      const batch = f.database.batch.bind(f.database);
      f.database.batch = async (statements) => {
        f.db.exec('UPDATE thingamajob_memberships SET active=0');
        return batch(statements);
      };
      const response =
        operation === 'create'
          ? await post(
              f,
              collection,
              { question: 'Fictional question', reason: 'Fictional reason' },
              'revoked-create',
            )
          : operation === 'answer'
            ? await answer(f, u)
            : await link(f, u);
      assert.equal(response.status, 403);
      assert.deepEqual(counts(f), before);
      assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_proposals').get().n, 0);
    } finally {
      f.db.close();
    }
  });
