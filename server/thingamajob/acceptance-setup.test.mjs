import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';

test('SCRUM-86 acceptance uses accurate Accept, false Reject, and pre-acceptance Correct without implied supersession', async () => {
  const f = evidenceFixture();
  try {
    for (const schema of ['assertions.sql', 'claim-lifecycle.sql', 'unknowns.sql'])
      f.db.exec(fs.readFileSync(new URL(schema, import.meta.url), 'utf8'));
    const root = '/api/thingamajob/workspaces/workspace-one';
    async function post(route, body, key) {
      const response = await f.worker.fetch(
        await signedEvidenceRequest(root + route, 'one', {
          method: 'POST',
          body: body instanceof FormData ? body : JSON.stringify(body),
          headers: {
            'Idempotency-Key': key,
            ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          },
        }),
        f.env,
      );
      assert.equal(response.status, 200);
      return response.json();
    }
    const accurate =
      'Fictional owner upgraded only the private Cedar branch from version 1 to version 2; the shared product stayed on version 1.';
    const falseStatement = 'Fictional owner upgraded the shared Cedar product to version 2.';
    const source = await post(
      '/evidence',
      uploadForm(new TextEncoder().encode(accurate)),
      'setup-source',
    );
    const cases = [
      { decision: 'accepted', statement: accurate },
      { decision: 'rejected', statement: falseStatement },
      { decision: 'corrected', statement: falseStatement },
    ];
    for (const [index, scenario] of cases.entries()) {
      const proposal = await post(
        '/assertions',
        {
          statement: scenario.statement,
          proposerAttribution: 'Fictional owner',
          evidence: [{ sourceId: source.sourceId }],
        },
        'setup-proposal-' + index,
      );
      assert.equal(proposal.claim, null);
      const result = await post(
        '/assertions/' + proposal.proposalId + '/review',
        {
          decision: scenario.decision,
          expectedVersion: 1,
          ...(scenario.decision === 'corrected' ? { correctedStatement: accurate } : {}),
        },
        'setup-review-' + index,
      );
      assert.equal(result.reviewDisposition, scenario.decision);
      if (scenario.decision === 'rejected') assert.equal(result.claim, null);
      else assert.equal(result.claim.statement, accurate);
      const history = f.db
        .prepare(
          'SELECT operation,statement FROM thingamajob_assertion_history WHERE proposal_id=? ORDER BY version',
        )
        .all(proposal.proposalId);
      assert.deepEqual(
        history.map((row) => ({ ...row })),
        [
          { operation: 'proposed', statement: scenario.statement },
          {
            operation: scenario.decision,
            statement: scenario.decision === 'corrected' ? accurate : scenario.statement,
          },
        ],
      );
    }
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_claims').get().n, 2);
    assert.equal(
      f.db
        .prepare('SELECT count(*) AS n FROM thingamajob_claims WHERE statement=?')
        .get(falseStatement).n,
      0,
    );
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM thingamajob_reviews').get().n, 3);
    assert.equal(
      f.db.prepare('SELECT count(*) AS n FROM thingamajob_assertion_history').get().n,
      6,
    );
  } finally {
    f.db.close();
  }
});
