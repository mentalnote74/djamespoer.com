import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reconciliationBeforeBrief, recalculateMembers } from './daily-reconciliation.mjs';

test('existing publisher awaits canonical check; pending/failure retain approval and timestamps', async () => {
  const publish = await readFile(new URL('./publish.mjs', import.meta.url), 'utf8');
  assert.match(
    publish,
    /await runBeforeBrief\(\(reconciliation\) =>\s*generate\(\{ publishedJournal: live, reconciliation \}\)/,
  );
  const source = await readFile(new URL('./daily-reconciliation.mjs', import.meta.url), 'utf8');
  assert.match(source, /scripts\/buildometer\/project\.mjs/);
  assert.match(publish, /\.\.\.observationFiles/);
  const approved = {
    scope: 'Fictional approved scope',
    observedAt: '2026-11-06T18:51:56.743Z',
    shipped: 219,
    total: 477,
    remaining: 258,
    percent: 45.9,
  };
  const before = JSON.stringify(approved),
    order = [];
  let finish;
  const hold = new Promise((resolve) => {
    finish = resolve;
  });
  const completed = reconciliationBeforeBrief({
    readApproved: async () => {
      order.push('read');
      return approved;
    },
    reconcile: async () => {
      order.push('reconcile');
      await hold;
      return { status: 'checked', reason: 'Verified no change' };
    },
    save: async (r) => {
      order.push('save');
      assert.equal(r.observedAt, approved.observedAt);
    },
    compose: async (r) => {
      order.push('compose');
      return r;
    },
    now: () => new Date('2026-11-12T20:00:00Z'),
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ['read', 'reconcile']);
  finish();
  const ok = await completed;
  assert.deepEqual(order, ['read', 'reconcile', 'save', 'compose']);
  assert.equal(ok.status, 'checked');
  assert.notEqual(ok.checkedAt, ok.observedAt);
  for (const fail of [false, true]) {
    const result = await reconciliationBeforeBrief({
      readApproved: async () => approved,
      reconcile: async () => {
        if (fail) throw Error('PRIVATE transport detail');
        return { status: 'pending', reason: 'Approval pending' };
      },
      save: async (r) => assert.equal(r.status, fail ? 'failed' : 'pending'),
      compose: async (r) => r,
    });
    assert.equal(result.shipped, approved.shipped);
    assert.equal(result.total, approved.total);
    assert.equal(result.observedAt, approved.observedAt);
    assert.equal(result.status, fail ? 'failed' : 'pending');
    assert(!JSON.stringify(result).includes('PRIVATE'));
  }
  assert.equal(JSON.stringify(approved), before);
  let composed = false;
  await assert.rejects(
    reconciliationBeforeBrief({
      readApproved: async () => {
        throw Error('Invalid canonical evidence');
      },
      compose: async () => {
        composed = true;
      },
    }),
    /Invalid canonical/,
  );
  assert.equal(composed, false);
});

test('SCRUM-213 recalculates scope and shipped credit from Jira', () => {
  const issue = (key, points, status = 'new', extra = {}) => ({
    key,
    fields: {
      summary: key + ' title',
      issuetype: { name: 'Story', subtask: false },
      labels: [],
      status: { statusCategory: { key: status } },
      customfield_10016: points,
      ...extra,
    },
  });
  const previous = [
    { key: 'SCRUM-1', title: 'Old', points: 3, shipped: true, disposition: 'shipped' },
    { key: 'SCRUM-2', title: 'Open', points: 5, shipped: false, disposition: 'open' },
  ];
  const members = recalculateMembers(
    previous,
    [
      issue('SCRUM-1', 3, 'new'), // reopened: earlier credit is kept
      issue('SCRUM-2', 8, 'done'), // re-estimated and shipped
      issue('SCRUM-3', 5, 'done'), // new and shipped
      issue('SCRUM-4', 2), // new and open
      issue('SCRUM-5', undefined), // unestimated: not counted
      issue('SCRUM-6', 3, 'new', { labels: ['parked'] }),
      issue('SCRUM-7', 3, 'new', { issuetype: { name: 'Epic' } }),
      issue('SCRUM-8', 3, 'done', { resolution: { name: "Won't Do" } }),
      issue('SCRUM-9', 3),
    ],
    { superseded: ['SCRUM-9'], epics: 'note' },
  );
  assert.deepEqual(
    members.map((m) => [m.key, m.points, m.shipped]),
    [
      ['SCRUM-1', 3, true],
      ['SCRUM-2', 8, true],
      ['SCRUM-3', 5, true],
      ['SCRUM-4', 2, false],
    ],
  );
  assert.equal(previous[1].shipped, false);
});
