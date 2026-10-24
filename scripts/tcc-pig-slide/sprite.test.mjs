import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dimensions } from '../slide-assets/validate.mjs';

test('atlas receipts preserve masters, candidate dimensions and registered stage pieces', async () => {
  const manifest = JSON.parse(await readFile('artwork/tcc-pig-slide/sprite-manifest.json', 'utf8'));
  assert.deepEqual(manifest.canvas, [2172, 724]);
  assert.deepEqual(manifest.atlas, [2172, 928]);
  assert.deepEqual(
    manifest.pieces.map(({ name, x, y, w, h }) => ({ name, x, y, w, h })),
    [
      { name: 'base', x: 0, y: 0, w: 2172, h: 724 },
      { name: 'eye-open', x: 1410, y: 185, w: 185, h: 165 },
      { name: 'eye-wink', x: 1410, y: 185, w: 185, h: 165 },
      { name: 'mouth-rest', x: 1500, y: 415, w: 400, h: 200 },
      { name: 'mouth-kiss', x: 1500, y: 415, w: 400, h: 200 },
    ],
  );
  for (const p of manifest.pieces) {
    assert(p.sx >= 0 && p.sy >= 0 && p.sx + p.w <= 2172 && p.sy + p.h <= 928);
    assert(p.x + p.w <= 2172 && p.y + p.h <= 724);
  }
  for (const receipt of [...manifest.sources, ...manifest.receipts]) {
    const data = await readFile(receipt.file);
    assert.equal(createHash('sha256').update(data).digest('hex'), receipt.sha256, receipt.file);
    if (receipt.width) {
      assert.deepEqual(dimensions(data), [receipt.width, receipt.height]);
      assert.equal(data.length, receipt.bytes);
    }
  }
  assert.equal(manifest.receipts.length, 10);
});
