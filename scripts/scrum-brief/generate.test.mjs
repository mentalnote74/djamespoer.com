import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrief, saveBrief } from './generate.mjs';
const status = {
  schemaVersion: 1,
  verifiedOn: '2026-10-16',
  validThrough: '2026-10-17',
  sourceCommit: 'b'.repeat(40),
  recentlyShipped: [
    'Public release shipped.',
    'Public layout checked.',
    'Responsive assets delivered.',
  ],
  currentFocus: ['Keep the visual system stable.'],
  next: 'Review the next gate.',
};
const options = { date: '2026-10-16', head: 'a'.repeat(40), verifyCommit: () => true };
test('bounded public items and provenance; deterministic identical inputs', () => {
  const a = buildBrief(status, options);
  assert.deepEqual(a, buildBrief(status, options));
  assert.equal(a.sections[0].items.length, 3);
  assert.equal(a.provenance.statusSha256.length, 64);
  assert.equal(a.date, options.date);
});
test('expired, future and invalid dates fail closed', () => {
  for (const date of ['2026-10-18', '2026-10-15', '2026-02-30'])
    assert.throws(() => buildBrief(status, { ...options, date }));
});
test('unknown checkpoint lineage fails closed', () =>
  assert.throws(() => buildBrief(status, { ...options, verifyCommit: () => false })));
test('oversized, empty, duplicate and markup content rejected', () => {
  for (const items of [[], ['a', 'a'], ['<b>unsafe</b>', 'ok'], ['x'.repeat(401), 'ok']])
    assert.throws(() => buildBrief({ ...status, recentlyShipped: items }, options));
});
test('one next action and bounded verification lifetime required', () => {
  assert.throws(() => buildBrief({ ...status, next: '' }, options));
  assert.throws(() => buildBrief({ ...status, validThrough: '2026-11-01' }, options));
});
test('atomic snapshot includes date+content; failed validation preserves last valid bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'brief-'));
  const path = join(dir, 'brief.ts');
  try {
    await saveBrief(buildBrief(status, options), path);
    const before = await readFile(path, 'utf8');
    await assert.rejects(async () => saveBrief(buildBrief({ ...status, next: '' }, options), path));
    assert.equal(await readFile(path, 'utf8'), before);
    assert(before.includes('Recently shipped'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
