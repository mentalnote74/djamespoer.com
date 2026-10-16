import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { textCandidates } from './text-candidates.ts';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';

test('text suggestions preserve chronology, qualifications and repeated-line provenance', () => {
  const result = textCandidates(
    '2011 - 2015\n- Built fictional interfaces, with supervision.\nBuilt fictional interfaces, with supervision.\nEmail: fictional@example.invalid',
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].statement, '2011 - 2015');
  assert.equal(result[1].statement, 'Built fictional interfaces, with supervision.');
  assert.match(result[1].locator, /line 2, line 3/);
  assert.throws(() => textCandidates('x'.repeat(4001)));
});

test('stored text to pending proposal to corrected active claim; resume and scope fail closed', async () => {
  const f = evidenceFixture();
  for (const file of ['assertions.sql', 'claim-lifecycle.sql'])
    f.db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  const root = '/api/thingamajob/workspaces/workspace-one';
  async function request(path, method = 'GET', body, subject = 'one', key = 'fixture-request') {
    return f.worker.fetch(
      await signedEvidenceRequest(path, subject, {
        method,
        headers: {
          'Idempotency-Key': key,
          ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined
          ? {}
          : { body: body instanceof FormData ? body : JSON.stringify(body) }),
      }),
      f.env,
    );
  }
  const uploaded = await request(
    root + '/evidence',
    'POST',
    uploadForm(
      new TextEncoder().encode(
        'Built fictional interfaces, with supervision.\nUsed fictional tools.',
      ),
    ),
  );
  assert.equal(uploaded.status, 200);
  const source = await uploaded.json();
  const path = root + '/evidence/' + source.sourceId + '/candidates';
  const preview = await request(path);
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).candidates.length, 2);
  assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n, 0);
  assert.equal((await request(path, 'GET', undefined, 'two')).status, 403);
  assert.equal((await request(path, 'POST', { index: 0, role: 'owner' })).status, 400);
  const staged = await request(path, 'POST', { index: 0 });
  assert.equal(staged.status, 200);
  const p = await staged.json();
  assert.equal(p.reviewDisposition, 'proposed');
  assert.equal(p.claim, null);
  assert.equal(p.evidence[0].sourceId, source.sourceId);
  assert.match(p.evidence[0].locator, /line 1/);
  const replay = await request(path, 'POST', { index: 0 });
  assert.equal((await replay.json()).proposalId, p.proposalId);
  assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_proposals').get().n, 1);
  const accepted = await request(
    root + '/assertions/' + p.proposalId + '/review',
    'POST',
    { decision: 'accepted', expectedVersion: p.version },
    'one',
    'accept-fixture',
  );
  assert.equal(accepted.status, 200);
  const old = (await accepted.json()).claim;
  assert.ok(old.claimId);
  const correction = await request(
    root + '/claims/' + old.claimId + '/corrections',
    'POST',
    {
      statement: 'Contributed fictional interfaces under supervision.',
      proposerAttribution: 'Fictional owner',
      evidence: p.evidence,
      correctionReason: 'Clarify responsibility.',
    },
    'one',
    'correction-fixture',
  );
  assert.equal(correction.status, 200);
  const replacement = await correction.json();
  const decision = await request(
    root + '/assertions/' + replacement.proposalId + '/review',
    'POST',
    {
      decision: 'corrected',
      correctedStatement: replacement.statement,
      expectedVersion: replacement.version,
    },
    'one',
    'approve-correction',
  );
  assert.equal(decision.status, 200);
  assert.equal(
    f.db
      .prepare('SELECT count(*) n FROM thingamajob_active_claims WHERE claim_id=?')
      .get(old.claimId).n,
    0,
  );
  assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n, 2);
  const second = await (await request(path, 'POST', { index: 1 })).json();
  assert.equal(
    (
      await request(
        root + '/assertions/' + second.proposalId + '/review',
        'POST',
        {
          decision: 'rejected',
          expectedVersion: second.version,
        },
        'one',
        'reject-fixture',
      )
    ).status,
    200,
  );
  assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_active_claims').get().n, 1);
  f.db.close();
});
