import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reconciliationBeforeBrief } from './daily-reconciliation.mjs';

test('existing publisher awaits canonical check; pending/failure retain approval and timestamps', async () => {
  const publish = await readFile(new URL('./publish.mjs', import.meta.url), 'utf8');
  assert.match(
    publish,
    /await runBeforeBrief\(\(reconciliation\) =>\s*generate\(\{ publishedJournal: live, reconciliation \}\)/,
  );
  const source = await readFile(new URL('./daily-reconciliation.mjs', import.meta.url), 'utf8');
  assert.match(source, /scripts\/buildometer\/project\.mjs/);
  assert.match(source, /scripts\/buildometer\/reconcile\.mjs/);
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
