import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPublishedHistory } from './published-history.mjs';
const snapshot = {
  schemaVersion: 4,
  checkedAt: '2026-10-15T12:00:00.000Z',
  generatedAt: '2026-10-15T12:00:00.000Z',
  refreshStatus: 'ok',
  rows: [],
};
test('published retention archive uses only the pinned public GET without credentials', async () => {
  const rows = await readPublishedHistory(async (url, options) => {
    assert.equal(url, 'https://djamespoer.com/data/deployment-history.json');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, undefined);
    return new Response(JSON.stringify(snapshot));
  });
  assert.deepEqual(rows, []);
});
test('unavailable, malformed and unsafe published archives fail closed', async () => {
  for (const response of [
    new Response('{}', { status: 503 }),
    new Response('broken'),
    new Response(JSON.stringify({ ...snapshot, token: 'must-not-publish' })),
  ]) {
    await assert.rejects(
      readPublishedHistory(async () => response),
      /archive unavailable/,
    );
  }
});
