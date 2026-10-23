import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCanvas } from './validate.mjs';
test('accepts the explicit full-canvas target', () =>
  assert.doesNotThrow(() => assertCanvas([768, 256], [768, 256])));
test('rejects the real clipped mobile crop, trimmed effect and wrong target size', () => {
  for (const [actual, expected] of [
    [
      [384, 124],
      [384, 128],
    ],
    [
      [320, 119],
      [384, 128],
    ],
    [
      [1440, 480],
      [2172, 724],
    ],
  ])
    assert.throws(() => assertCanvas(actual, expected), /full 3:1 canvas/);
});
