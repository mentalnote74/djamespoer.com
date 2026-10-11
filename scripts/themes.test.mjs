import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileString } from 'sass';
import { fileURLToPath } from 'node:url';
const css = compileString("@use 'themes';", {
  loadPaths: [fileURLToPath(new URL('../src/styles', import.meta.url))],
  style: 'compressed',
}).css;
const expected = {
  'page-background': '#f7f7f7',
  'page-foreground': '#202020',
  'control-background': '#fff',
  'control-foreground': '#202020',
  'control-border': '#252a30',
  'control-hover-background': '#202020',
  'control-hover-foreground': '#fff',
  'control-active-background': '#252a30',
  'control-active-foreground': '#fff',
  'navigation-surface': '#fff',
  'navigation-foreground': '#111827',
  'section-surface': '#eef1f4',
  'panel-surface': '#fff',
  'secondary-text': '#454b52',
  'panel-border': '#aab2bb',
  'selected-background': '#202020',
  'selected-foreground': '#fff',
};
test('Teetotaler and no-selector fallback preserve all migrated production colors with root-only scoping', () => {
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
  assert.deepEqual(
    blocks.map((b) => b[1]),
    [':root:not([data-theme])', ':root[data-theme=teetotaler]'],
  );
  for (const block of blocks) {
    const actual = Object.fromEntries(
      [...block[2].matchAll(/--([a-z-]+):([^;]+);?/g)].map((m) => [m[1], m[2].trim()]),
    );
    assert.deepEqual(actual, expected);
  }
});
function luminance(hex) {
  let s = hex.slice(1);
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  const c = s
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
test('migrated enabled text pairings preserve normal-text contrast', () => {
  for (const [fg, bg] of [
    ['page-foreground', 'page-background'],
    ['control-foreground', 'control-background'],
    ['control-hover-foreground', 'control-hover-background'],
    ['control-active-foreground', 'control-active-background'],
    ['navigation-foreground', 'navigation-surface'],
    ['secondary-text', 'section-surface'],
    ['selected-foreground', 'selected-background'],
  ]) {
    const a = luminance(expected[fg]),
      b = luminance(expected[bg]);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, fg + ' on ' + bg);
  }
});
