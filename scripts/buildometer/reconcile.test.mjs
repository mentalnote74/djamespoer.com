import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareReconciliation, validateApproval, digest, verifiedRelease } from './reconcile.mjs';
import {
  projectMeasurement,
  assertAppendOnly,
  sameSnapshot,
  appendObservationText,
} from '../../server/buildometer/project.ts';
const ledger = JSON.parse(
  await readFile(new URL('./project-ledger.json', import.meta.url), 'utf8'),
);
const now = Date.now();
const evidence = {
  verifiedAt: new Date(now - 1000).toISOString(),
  release: {
    id: 'fixture-success',
    sha: 'a'.repeat(40),
    environment: 'production',
    status: 'succeeded',
    stage: 'deployed',
    deployedAt: new Date(now - 2000).toISOString(),
    evidenceUrl: 'https://example.invalid/reviewed-receipt',
  },
  items: [
    {
      key: 'SCRUM-25',
      commit: 'b'.repeat(40),
      evidencePath: 'fixture',
      acceptanceNote: 'Fictional full-story acceptance, not real shipment',
    },
  ],
};
const inventory = ledger.observations
  .at(-1)
  .members.map((m) => ({ ...m, type: 'Story', parent: null, status: 'Done' }));
const prepare = (decisions = {}, receipt = evidence, rows = inventory) =>
  prepareReconciliation({ ledger, inventory: rows, evidence: receipt, decisions }, now);
test('Done alone and unchanged builds do not create credit or advance observation date', () => {
  const c = prepare();
  assert.deepEqual(c.members, ledger.observations.at(-1).members);
  assert.equal(c.changes.length, 0);
  assert.equal(c.totals.shipped, 152);
  assert.equal('date' in c.totals, false);
  assert.equal(
    validateApproval(c, ledger, {
      candidateHash: c.candidateHash,
      reviewer: 'operator',
      reviewRef: 'release-check fixture',
    }),
    false,
  );
  assert.equal(prepare().candidateHash, c.candidateHash);
});
test('pending, failed, preview, future and unverified releases cannot award credit', () => {
  for (const mutate of [
    (r) => (r.release.status = 'failed'),
    (r) => (r.release.stage = 'built'),
    (r) => (r.release.environment = 'preview'),
    (r) => (r.release.deployedAt = new Date(now + 10000).toISOString()),
    (r) => delete r.verifiedAt,
  ]) {
    const r = structuredClone(evidence);
    mutate(r);
    assert.throws(() => prepare({ ship: ['SCRUM-25'] }, r));
  }
  assert.throws(() => prepare({ ship: ['SCRUM-65'] }), /Whole-story/);
});
test('whole-story changes require exact candidate review and preserve original history', () => {
  const before = JSON.stringify(ledger);
  const c = prepare({ ship: ['SCRUM-25'] });
  assert.equal(c.totals.shipped, 155);
  assert.equal(c.scopeChanged, false);
  assert.throws(() =>
    validateApproval(c, ledger, {
      candidateHash: 'wrong',
      reviewer: 'operator',
      reviewRef: 'receipt',
    }),
  );
  assert.equal(
    validateApproval(c, ledger, {
      candidateHash: c.candidateHash,
      reviewer: 'operator',
      reviewRef: 'receipt',
    }),
    true,
  );
  const rewritten = structuredClone(c);
  rewritten.members[0].points++;
  assert.throws(() =>
    validateApproval(rewritten, ledger, {
      candidateHash: c.candidateHash,
      reviewer: 'operator',
      reviewRef: 'receipt',
    }),
  );
  assert.equal(JSON.stringify(ledger), before);
});
test('added/removed/reestimated scope requires reasons and explicit owner scope review', () => {
  const extra = {
    key: 'SCRUM-999',
    title: 'Fictional new eligible work',
    points: 5,
    status: 'To Do',
    type: 'Story',
    parent: null,
  };
  const c = prepare(
    {
      add: [extra.key],
      remove: [{ key: 'SCRUM-65', reason: 'fixture scope removal' }],
      reestimate: [{ key: 'SCRUM-25', points: 5, reason: 'fixture estimate review' }],
    },
    evidence,
    [...inventory, extra],
  );
  assert.equal(c.totals.total, 401);
  assert.equal(c.totals.added, 5);
  assert.equal(c.totals.removed, 1);
  assert.equal(c.totals.reestimated, 2);
  const approval = { candidateHash: c.candidateHash, reviewer: 'James', reviewRef: 'fixture' };
  assert.throws(() => validateApproval(c, ledger, approval), /scope/);
  assert.equal(
    validateApproval(c, ledger, { ...approval, scopeReviewRef: 'owner fixture approval' }),
    true,
  );
  assert.throws(() => prepare({ remove: [{ key: 'SCRUM-65' }] }));
  assert.throws(() => prepare({ reestimate: [{ key: 'SCRUM-25', points: 13 }] }));
});
test('missing estimates, exclusions, epics, duplicate inventory and parent-child counts fail closed', () => {
  const extra = { key: 'SCRUM-999', title: 'Fictional', points: null, type: 'Story' };
  assert.throws(() => prepare({ add: [extra.key] }, evidence, [...inventory, extra]), /estimate/);
  assert.throws(() =>
    prepare({ add: ['SCRUM-80'] }, evidence, [
      ...inventory,
      { ...extra, key: 'SCRUM-80', points: 3 },
    ]),
  );
  assert.throws(() =>
    prepare({ add: [extra.key] }, evidence, [...inventory, { ...extra, points: 3, type: 'Epic' }]),
  );
  assert.throws(() => prepare({}, evidence, [...inventory, inventory[0]]));
  assert.throws(
    () =>
      prepare({ add: [extra.key] }, evidence, [
        ...inventory,
        { ...extra, points: 3, parent: 'SCRUM-12' },
      ]),
    /double counting/,
  );
});
test('history and baseline are immutable; metadata-only snapshots are no-ops; zero scope is not 0%', () => {
  const next = structuredClone(ledger);
  next.observations[0].members[0].points++;
  assert.throws(() => assertAppendOnly(ledger, next));
  const header = structuredClone(ledger);
  header.exclusions.erica = [];
  assert.throws(() => assertAppendOnly(ledger, header));
  const meta = structuredClone(ledger.observations[0].members);
  meta[0].title += ' revised label';
  assert(sameSnapshot(meta, ledger.observations[0].members));
  const zero = structuredClone(ledger);
  zero.observations[0].members.forEach((m) => (m.points = 0));
  zero.approvedOpening = { total: 0, shipped: 0, remaining: 0 };
  assert.equal(projectMeasurement(zero).observations[0].total, 0);
});

test('append serialization retains prior history bytes and exclusions exactly', async () => {
  const raw = await readFile(new URL('./project-ledger.json', import.meta.url), 'utf8');
  const observation = {
    id: 'fixture-only',
    observedAt: new Date(now).toISOString(),
    reason: 'fictional accepted update',
    members: ledger.observations[0].members,
  };
  const output = appendObservationText(raw, observation);
  const prefix = raw.replace(/(\r?\n[ \t]*\]\s*\}\s*)$/, '');
  assert(output.startsWith(prefix + ','));
  const parsed = JSON.parse(output);
  assertAppendOnly(ledger, parsed);
  assert.deepEqual(parsed.observations.slice(0, -1), ledger.observations);
  assert.deepEqual(parsed.exclusions, ledger.exclusions);
});
