import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
import { operatorSupersedeClaim } from './claim-lifecycle-operator.ts';
async function fixture() {
  const f = evidenceFixture();
  for (const file of ['assertions.sql', 'claim-lifecycle.sql', 'unknowns.sql'])
    f.db.exec(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
  f.sources = {};
  for (const owner of ['one', 'two']) {
    const r = await f.worker.fetch(
      await signedEvidenceRequest(
        '/api/thingamajob/workspaces/workspace-' + owner + '/evidence',
        owner,
        { method: 'POST', body: uploadForm(), headers: { 'Idempotency-Key': 'source' } },
      ),
      f.env,
    );
    f.sources[owner] = (await r.json()).sourceId;
  }
  return f;
}
const root = (owner) => '/api/thingamajob/workspaces/workspace-' + owner;
async function post(f, path, body, key = 'key', owner = 'one', headers = {}) {
  return f.worker.fetch(
    await signedEvidenceRequest(path, owner, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...headers },
    }),
    f.env,
  );
}
async function proposal(f, key, owner = 'one', target) {
  const body = {
    statement: 'Fictional ' + key,
    proposerAttribution: 'Fictional owner',
    evidence: [{ sourceId: f.sources[owner] }],
    ...(target ? { correctionReason: 'Fictional correction to the same fact' } : {}),
  };
  const r = await post(
    f,
    root(owner) + (target ? '/claims/' + target + '/corrections' : '/assertions'),
    body,
    key,
    owner,
  );
  assert.equal(r.status, 200);
  return r.json();
}
async function review(f, p, key, decision = 'accepted', owner = 'one') {
  return post(
    f,
    root(owner) + '/assertions/' + p.proposalId + '/review',
    {
      decision,
      expectedVersion: 1,
      ...(decision === 'corrected' ? { correctedStatement: 'Accurate fictional correction' } : {}),
    },
    key,
    owner,
  );
}
async function claim(f, key, owner = 'one') {
  const p = await proposal(f, key, owner);
  const r = await review(f, p, key + '-review', 'accepted', owner);
  assert.equal(r.status, 200);
  return (await r.json()).claim;
}
const transition = (replacement) => ({
  replacementClaimId: replacement.claimId,
  expectedObsoleteVersion: 1,
  expectedReplacementVersion: 1,
  reason: 'This approved fictional correction replaces the same incorrect fact.',
});
const supersede = (
  f,
  old,
  replacement,
  key = 'supersede',
  owner = 'one',
  body = transition(replacement),
) => post(f, root(owner) + '/claims/' + old.claimId + '/supersede', body, key, owner);
const rows = (f) => f.db.prepare('SELECT * FROM thingamajob_claim_supersessions').all();

test('approved claims remain active until explicit supersession; original rows/history untouched and replacement relationship audited', async () => {
  const f = await fixture();
  try {
    const old = await claim(f, 'obsolete'),
      replacement = await claim(f, 'accurate');
    const before = f.db
      .prepare('SELECT * FROM thingamajob_assertion_history ORDER BY proposal_id,version')
      .all();
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_active_claims').get().n, 2);
    const response = await supersede(f, old, replacement);
    assert.equal(response.status, 200);
    const e = (await response.json()).transition;
    assert.equal(e.obsolete_claim_id, old.claimId);
    assert.equal(e.replacement_claim_id, replacement.claimId);
    assert.equal(e.execution_context, 'owner_access');
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n, 2);
    assert.deepEqual(
      f.db
        .prepare('SELECT * FROM thingamajob_assertion_history ORDER BY proposal_id,version')
        .all(),
      before,
    );
    const overview = await f.worker.fetch(
      await signedEvidenceRequest('/api/thingamajob/test/workflow'),
      f.env,
    );
    const data = await overview.json();
    assert.deepEqual(
      data.proposals.flatMap((p) => (p.claim ? [p.claim.claimId] : [])),
      [replacement.claimId],
    );
    const p = f.db
      .prepare('SELECT proposal_id FROM thingamajob_claims WHERE claim_id=?')
      .get(old.claimId);
    const audit = await f.worker.fetch(
      await signedEvidenceRequest(root('one') + '/assertions/' + p.proposal_id),
      f.env,
    );
    const a = await audit.json();
    assert.equal(a.claim, null);
    assert.equal(a.historicalClaim.lifecycleState, 'superseded');
    assert.equal(a.supersession.replacementClaimId, replacement.claimId);
    assert.equal(a.history[1].operation, 'accepted');
    assert.throws(() => f.db.prepare('DELETE FROM thingamajob_claim_supersessions').run());
    assert.throws(() =>
      f.db.prepare("UPDATE thingamajob_claim_supersessions SET reason='rewrite'").run(),
    );
  } finally {
    f.db.close();
  }
});
for (const decision of ['accepted', 'corrected', 'rejected'])
  test(
    'post-acceptance linked correction ' + decision + ' is atomic and history-preserving',
    async () => {
      const f = await fixture();
      try {
        const old = await claim(f, 'original');
        const correction = await proposal(f, 'correction', 'one', old.claimId);
        assert.equal(correction.correctionOf.obsoleteClaimId, old.claimId);
        assert.equal(rows(f).length, 0);
        const response = await review(f, correction, 'approve-correction', decision);
        assert.equal(response.status, 200);
        const result = await response.json();
        if (decision === 'rejected') {
          assert.equal(result.claim, null);
          assert.equal(rows(f).length, 0);
          assert.equal(
            f.db.prepare('SELECT claim_id FROM thingamajob_active_claims').get().claim_id,
            old.claimId,
          );
        } else {
          assert.equal(rows(f).length, 1);
          assert.equal(rows(f)[0].replacement_claim_id, result.claim.claimId);
          assert.equal(
            f.db.prepare('SELECT claim_id FROM thingamajob_active_claims').get().claim_id,
            result.claim.claimId,
          );
        }
        assert.equal(
          f.db.prepare('SELECT count(*) n FROM thingamajob_assertion_history').get().n,
          4,
        );
        const retry = await review(f, correction, 'approve-correction', decision);
        assert.equal(retry.status, 200);
        assert.equal((await retry.json()).replayed, true);
      } finally {
        f.db.close();
      }
    },
  );
test('reciprocal/mixed IDs, missing targets, non-owner and manipulated authority fail closed', async () => {
  const f = await fixture();
  try {
    const one = await claim(f, 'one'),
      one2 = await claim(f, 'one2'),
      two = await claim(f, 'two', 'two'),
      two2 = await claim(f, 'two2', 'two');
    for (const [a, b, owner] of [
      [one, two, 'one'],
      [two, one, 'two'],
      [one, one2, 'two'],
      [two, two2, 'one'],
    ])
      assert.equal((await supersede(f, a, b, 'mix-' + owner, owner)).status, 403);
    assert.equal(
      (
        await supersede(f, one, one2, 'inject', 'one', {
          ...transition(one2),
          actorId: 'actor-two',
          role: 'owner',
        })
      ).status,
      400,
    );
    assert.equal((await supersede(f, { claimId: 'guessed' }, one2)).status, 403);
    assert.equal(
      (
        await post(
          f,
          root('one') + '/claims/' + two.claimId + '/corrections',
          {
            statement: 'Fictional',
            proposerAttribution: 'Fictional',
            evidence: [{ sourceId: f.sources.one }],
            correctionReason: 'Fictional',
          },
          'foreign-correction',
        )
      ).status,
      403,
    );
    f.db
      .prepare(
        "UPDATE thingamajob_workspaces SET owner_actor_id='actor-two' WHERE workspace_id='workspace-one'",
      )
      .run();
    assert.equal((await supersede(f, one, one2)).status, 403);
    assert.equal(rows(f).length, 0);
  } finally {
    f.db.close();
  }
});
test('changed retries, duplicate/stale decisions, self replacement, inactive replacement and cycles cannot change truth', async () => {
  const f = await fixture();
  try {
    const a = await claim(f, 'a'),
      b = await claim(f, 'b'),
      c = await claim(f, 'c');
    assert.equal((await supersede(f, a, a)).status, 409);
    assert.equal((await supersede(f, a, b, 'once')).status, 200);
    const retry = await supersede(f, a, b, 'once');
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).replayed, true);
    assert.equal((await supersede(f, a, c, 'once')).status, 409);
    assert.equal((await supersede(f, a, b, 'different')).status, 409);
    assert.equal((await supersede(f, b, a, 'cycle')).status, 409);
    assert.equal((await supersede(f, c, a, 'inactive')).status, 409);
    assert.equal((await supersede(f, b, c, 'chain')).status, 200);
    assert.equal(rows(f).length, 2);
    assert.equal(
      f.db.prepare('SELECT claim_id FROM thingamajob_active_claims').get().claim_id,
      c.claimId,
    );
  } finally {
    f.db.close();
  }
});
test('concurrent competing corrections yield one lifecycle event; losing approval rolls back review and claim', async () => {
  const f = await fixture();
  try {
    const old = await claim(f, 'old');
    const a = await proposal(f, 'a', 'one', old.claimId),
      b = await proposal(f, 'b', 'one', old.claimId);
    const result = await Promise.all([review(f, a, 'review-a'), review(f, b, 'review-b')]);
    assert.deepEqual(result.map((r) => r.status).sort(), [200, 409]);
    assert.equal(rows(f).length, 1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n, 2);
  } finally {
    f.db.close();
  }
});
test('lifecycle insert failure rolls back approved correction and preserves original active truth', async () => {
  const f = await fixture();
  try {
    const old = await claim(f, 'old'),
      p = await proposal(f, 'correction', 'one', old.claimId);
    f.db.exec(
      "CREATE TRIGGER inject_failure BEFORE INSERT ON thingamajob_claim_supersessions BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
    );
    assert.equal((await review(f, p, 'failure')).status, 503);
    assert.equal(rows(f).length, 0);
    assert.equal(
      f.db
        .prepare('SELECT disposition FROM thingamajob_proposals WHERE proposal_id=?')
        .get(p.proposalId).disposition,
      'proposed',
    );
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n, 1);
    assert.equal(
      f.db.prepare('SELECT claim_id FROM thingamajob_active_claims').get().claim_id,
      old.claimId,
    );
  } finally {
    f.db.close();
  }
});
test('commit-time revocation denies standalone and linked correction supersession', async () => {
  for (const linked of [false, true]) {
    const f = await fixture();
    try {
      const old = await claim(f, 'old'),
        replacement = linked
          ? await proposal(f, 'correction', 'one', old.claimId)
          : await claim(f, 'replacement');
      const original = f.database.batch.bind(f.database);
      f.database.batch = async (statements) => {
        f.db
          .prepare("UPDATE thingamajob_memberships SET active=0 WHERE actor_id='actor-one'")
          .run();
        return original(statements);
      };
      const response = linked
        ? await review(f, replacement, 'revoke')
        : await supersede(f, old, replacement);
      assert.ok([403, 409, 503].includes(response.status));
      assert.equal(rows(f).length, 0);
    } finally {
      f.db.close();
    }
  }
});
test('operator transition is explicitly attributed, replayable and does not impersonate Access', async () => {
  const f = await fixture();
  try {
    const old = await claim(f, 'old'),
      replacement = await claim(f, 'replacement');
    const instruction = {
      workspaceId: 'workspace-one',
      authorizingOwnerActorId: 'actor-one',
      obsoleteClaimId: old.claimId,
      input: transition(replacement),
      requestKey: 'operator-test',
      authorizationReference: 'Explicit fictional owner direction, TEST only',
    };
    const result = await operatorSupersedeClaim(f.database, instruction);
    assert.equal(result.transition.execution_context, 'operator');
    assert.equal(result.transition.authorization_reference, instruction.authorizationReference);
    assert.equal((await operatorSupersedeClaim(f.database, instruction)).replayed, true);
    assert.equal(rows(f).length, 1);
    await assert.rejects(() =>
      operatorSupersedeClaim(f.database, { ...instruction, authorizingOwnerActorId: 'actor-two' }),
    );
  } finally {
    f.db.close();
  }
});
test('new UNKNOWN resolutions cannot use superseded claims; existing resolution/history remain unchanged', async () => {
  const f = await fixture();
  try {
    const u = await (
      await post(
        f,
        root('one') + '/unknowns',
        { question: 'Fictional gap', reason: 'Fictional' },
        'u',
      )
    ).json();
    const a = await (
      await post(
        f,
        root('one') + '/unknowns/' + u.unknownId + '/answers',
        {
          answer: 'Fictional answer',
          attribution: 'Fictional',
          evidence: [{ sourceId: f.sources.one }],
          expectedVersion: 1,
        },
        'answer',
      )
    ).json();
    const linked = await (
      await post(
        f,
        root('one') +
          '/unknowns/' +
          u.unknownId +
          '/answers/' +
          a.answers[0].answerId +
          '/proposal',
        { statement: 'Fictional original', proposerAttribution: 'Fictional', expectedVersion: 2 },
        'link',
      )
    ).json();
    const reviewed = await (
      await review(f, { proposalId: linked.proposals[0].proposalId }, 'review-linked')
    ).json();
    const old = reviewed.claim,
      replacement = await claim(f, 'replacement');
    assert.equal((await supersede(f, old, replacement)).status, 200);
    const resolution = await post(
      f,
      root('one') + '/unknowns/' + u.unknownId + '/resolve',
      { claimId: old.claimId, explanation: 'Fictional', expectedVersion: 3 },
      'resolve',
    );
    assert.equal(resolution.status, 403);
    assert.equal(f.db.prepare('SELECT state FROM thingamajob_unknowns').get().state, 'open');
  } finally {
    f.db.close();
  }
});
test('lifecycle route enforces CSRF, verified identity and TEST-only boundary', async () => {
  const f = await fixture();
  try {
    const old = await claim(f, 'old'),
      replacement = await claim(f, 'replacement');
    assert.equal(
      (await supersede(f, old, replacement, 'csrf', 'one', transition(replacement))).status,
      200,
    );
    const r = await post(
      f,
      root('one') + '/claims/' + replacement.claimId + '/supersede',
      transition(old),
      'bad-origin',
      'one',
      { Origin: 'https://evil.invalid' },
    );
    assert.equal(r.status, 403);
    const unsigned = await f.worker.fetch(
      new Request(
        'https://api-test.djamespoer.com' +
          root('one') +
          '/claims/' +
          replacement.claimId +
          '/supersede',
        { method: 'POST', headers: { Origin: 'https://api-test.djamespoer.com' } },
      ),
      f.env,
    );
    assert.equal(unsigned.status, 403);
    f.env.TEST_BOOTSTRAP_ENABLED = 'false';
    assert.equal((await supersede(f, replacement, old)).status, 404);
  } finally {
    f.db.close();
  }
});
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('supersession and active LoT persist across an independent Node process restart', async () => {
  const f = await fixture();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scrum86-lifecycle-'));
  const filename = path.join(directory, 'fictional.sqlite');
  try {
    const old = await claim(f, 'old');
    const replacement = await claim(f, 'replacement');
    assert.equal((await supersede(f, old, replacement)).status, 200);
    f.db.exec("VACUUM INTO '" + filename.replaceAll("'", "''") + "'");
    const code = `import { DatabaseSync } from 'node:sqlite'; const db=new DatabaseSync(${JSON.stringify(filename)}); console.log(JSON.stringify({active:db.prepare('SELECT claim_id FROM thingamajob_active_claims').all(),claims:db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n,events:db.prepare('SELECT count(*) n FROM thingamajob_claim_supersessions').get().n,history:db.prepare('SELECT count(*) n FROM thingamajob_assertion_history').get().n})); db.close();`;
    const restarted = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8',
    });
    assert.equal(restarted.status, 0);
    assert.deepEqual(JSON.parse(restarted.stdout), {
      active: [{ claim_id: replacement.claimId }],
      claims: 2,
      events: 1,
      history: 4,
    });
  } finally {
    f.db.close();
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  }
});

test('superseding a historical resolution claim preserves resolution and event history, labelled as historical', async () => {
  const f = await fixture();
  try {
    const u = await (
      await post(
        f,
        root('one') + '/unknowns',
        { question: 'Fictional gap', reason: 'Fictional' },
        'u',
      )
    ).json();
    const a = await (
      await post(
        f,
        root('one') + '/unknowns/' + u.unknownId + '/answers',
        {
          answer: 'Fictional answer',
          attribution: 'Fictional',
          evidence: [{ sourceId: f.sources.one }],
          expectedVersion: 1,
        },
        'a',
      )
    ).json();
    const p = await (
      await post(
        f,
        root('one') +
          '/unknowns/' +
          u.unknownId +
          '/answers/' +
          a.answers[0].answerId +
          '/proposal',
        { statement: 'Fictional original', proposerAttribution: 'Fictional', expectedVersion: 2 },
        'p',
      )
    ).json();
    const original = (
      await (await review(f, { proposalId: p.proposals[0].proposalId }, 'r')).json()
    ).claim;
    assert.equal(
      (
        await post(
          f,
          root('one') + '/unknowns/' + u.unknownId + '/resolve',
          {
            claimId: original.claimId,
            explanation: 'This fictional claim answers the fictional question',
            expectedVersion: 3,
          },
          'resolve',
        )
      ).status,
      200,
    );
    const before = JSON.stringify(
      f.db.prepare('SELECT * FROM thingamajob_unknown_events ORDER BY version').all(),
    );
    const resolution = JSON.stringify(
      f.db.prepare('SELECT * FROM thingamajob_unknown_resolutions').all(),
    );
    const replacement = await claim(f, 'replacement');
    assert.equal((await supersede(f, original, replacement)).status, 200);
    assert.equal(
      JSON.stringify(
        f.db.prepare('SELECT * FROM thingamajob_unknown_events ORDER BY version').all(),
      ),
      before,
    );
    assert.equal(
      JSON.stringify(f.db.prepare('SELECT * FROM thingamajob_unknown_resolutions').all()),
      resolution,
    );
    const fetched = await f.worker.fetch(
      await signedEvidenceRequest(root('one') + '/unknowns/' + u.unknownId),
      f.env,
    );
    const data = await fetched.json();
    assert.equal(data.state, 'resolved');
    assert.equal(data.resolution.claimLifecycleState, 'superseded');
    assert.equal(data.proposals[0].claimLifecycleState, 'superseded');
  } finally {
    f.db.close();
  }
});
