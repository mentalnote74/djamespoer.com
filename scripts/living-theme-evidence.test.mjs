import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseOptions } from './theme-evidence.mjs';
import {
  livingCases,
  expectedLivingTokens,
  verifyLivingIdentity,
  verifyAdvancement,
} from './living-theme-evidence.mjs';
const args = [
  '--url',
  'https://djamespoer.com/',
  '--expected-sha',
  '398d96266185a8a1410ff985485278b2660e1e0a',
];
function observed(point) {
  const tokens = Object.fromEntries(
    Object.entries(expectedLivingTokens(point)).map(([r, v]) => [
      r,
      Array.isArray(v) ? `rgb(${v.join(', ')})` : v,
    ]),
  );
  return {
    root: point.from,
    route: '/about',
    main: 1,
    pressed: ['Dusk-to-Dusk'],
    wipe: point.wipe ?? null,
    clock: point.time,
    now: point.time,
    navigation: false,
    guard: { changes: [] },
    tokens,
    background: tokens['page-background'],
    foreground: tokens['page-foreground'],
    snapshot: { outgoing: point.outgoing, incoming: point.from, direction: point.wipe },
    duration: 400,
    opacity: '1',
    clip: point.wipe === 'sunset' ? 'inset(0px 50% 0px 0px)' : 'inset(50% 0px 0px)',
    inlineBackground: '',
  };
}
test('living CLI preserves static defaults and rejects ambiguous modes/theme overrides', () => {
  assert.equal(parseOptions(args).mode, 'static');
  assert.equal(parseOptions([...args, '--mode', 'living']).mode, 'living');
  assert.throws(() => parseOptions([...args, '--mode', 'fast']));
  assert.throws(() => parseOptions([...args, '--mode', 'living', '--themes', 'mojito']));
  assert.deepEqual(
    livingCases.filter((c) => c.wipe).map((c) => c.wipe),
    ['sunset', 'sunrise', 'sunset'],
  );
});
test('every living checkpoint verifies colors, selection, time, navigation and complete wipe snapshots', () => {
  for (const point of livingCases)
    assert.equal(verifyLivingIdentity(observed(point), point, '/about').root, point.from);
  const point = livingCases.find((c) => c.name === 'sunset-wipe');
  for (const mutate of [
    (s) => (s.root = 'teetotaler'),
    (s) => (s.pressed = ['Teetotaler']),
    (s) => s.clock++,
    (s) => s.now++,
    (s) => (s.navigation = true),
    (s) => (s.main = 2),
    (s) => (s.tokens['page-background'] = '#000'),
    (s) => (s.opacity = '.5'),
    (s) => (s.snapshot.outgoing = 'mojito'),
    (s) => s.guard.changes.push({ oldValue: 'teetotaler', observed: point.from }),
  ]) {
    const state = observed(point);
    mutate(state);
    assert.throws(() => verifyLivingIdentity(state, point, '/about'));
  }
});
test('machine advancement assertion rejects a static or backwards-time observation', () => {
  const early = observed(livingCases.find((c) => c.name === 'early')),
    later = observed(livingCases.find((c) => c.name === 'later'));
  assert.equal(verifyAdvancement(early, later).verified, true);
  assert.throws(() => verifyAdvancement(early, { ...later, background: early.background }));
  assert.throws(() => verifyAdvancement(early, { ...later, clock: early.clock }));
});
test('living CLI reaches the runner and records launch failure rather than deadlocking on imports', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/theme-evidence.mjs',
      ...args,
      '--mode',
      'living',
      '--chrome',
      'not-an-installed-browser',
    ],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Evidence:/);
  assert.doesNotMatch(result.stderr, /unsettled top-level await/);
});
