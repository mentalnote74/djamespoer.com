import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, verifyIdentity, auditOutcome } from './theme-evidence.mjs';
import { palettes } from './theme-analysis.mjs';

const args = [
  '--url',
  'https://djamespoer.com/',
  '--expected-sha',
  '3c600bb41e5b6bc901b60160506b5875df87d5cf',
];
test('CLI expands all implemented themes and validates the planned route/viewport matrix', () => {
  const options = parseOptions(args);
  assert.deepEqual(options.themes, Object.keys(palettes));
  assert.deepEqual(options.routes, ['/', '/about', '/work/exl', '/engineering']);
  assert.deepEqual(options.sizes, ['desktop', 'narrow']);
  for (const invalid of [
    ['--themes', 'dusk-to-dusk'],
    ['--themes', 'mojito,mojito'],
    ['--routes', '/../../private'],
    ['--viewports', 'phone'],
    ['--unexpected', 'true'],
    ['--themes'],
  ])
    assert.throws(() => parseOptions([...args, ...invalid]));
  assert.throws(() =>
    parseOptions(['--url', 'https://secret:token@example.com/', '--expected-sha', args[3]]),
  );
  assert.throws(() => parseOptions(['--url', args[1], '--expected-sha', 'VERIFIED_DEPLOYED_SHA']));
});
function state(theme) {
  return {
    theme,
    pathname: '/',
    mainCount: 1,
    pressed: [theme],
    tokens: { ...palettes[theme] },
    background: palettes[theme]['page-background'],
    foreground: palettes[theme]['page-foreground'],
    guard: { navigation: false, changes: [] },
  };
}
test('identity verifies every implemented palette and rejects mismatched state, missing instrumentation or computed colors', () => {
  const compressed = state('teetotaler');
  compressed.tokens['disabled-opacity'] = '.6';
  assert.equal(verifyIdentity(compressed, 'teetotaler', 'teetotaler', '/').theme, 'teetotaler');
  for (const theme of Object.keys(palettes))
    assert.equal(verifyIdentity(state(theme), theme, theme, '/').theme, theme);
  for (const mutate of [
    (s) => (s.theme = 'teetotaler'),
    (s) => (s.pressed = []),
    (s) => s.pressed.push('teetotaler'),
    (s) => (s.guard = null),
    (s) => (s.guard.navigation = true),
    (s) => (s.mainCount = 2),
    (s) => (s.pathname = '/about'),
    (s) => (s.background = '#000'),
    (s) => delete s.tokens['navigation-surface'],
    (s) => (s.tokens['secondary-text'] = '#fff'),
    // A rapid switch away and back must not evade endpoint-only checks.
    (s) => (s.guard.changes = [{ oldValue: 'teetotaler', observed: 'mojito' }]),
  ]) {
    const observed = state('mojito');
    mutate(observed);
    assert.throws(() => verifyIdentity(observed, 'mojito', 'mojito', '/'));
  }
});
test('snapshot success requires zero violations, correct mode and full accessibility score; incomplete items remain review-required', () => {
  const axe = { violations: [], incomplete: [] };
  const lh = { gatherMode: 'snapshot', categories: { accessibility: { score: 1 } } };
  assert.equal(auditOutcome(axe, lh), 'PASS');
  assert.equal(auditOutcome({ violations: [{}], incomplete: [] }, lh), 'FAIL');
  assert.equal(auditOutcome(axe, { ...lh, gatherMode: 'navigation' }), 'FAIL');
  assert.equal(auditOutcome(axe, { ...lh, categories: {} }), 'FAIL');
  assert.equal(
    auditOutcome(axe, { ...lh, categories: { accessibility: { score: 0.99 } } }),
    'FAIL',
  );
  assert.equal(auditOutcome({ violations: [], incomplete: [{}] }, lh), 'REVIEW_REQUIRED');
});
