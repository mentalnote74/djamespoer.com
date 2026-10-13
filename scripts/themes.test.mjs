import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileString, compile as compileFile } from 'sass';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { palettes, themeCss, evaluate, contrast, rgb } from './theme-analysis.mjs';
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
  const blocks = [
    ...css.matchAll(/(:root:not\(\[data-theme\]\)|:root\[data-theme=teetotaler\])\{([^{}]+)\}/g),
  ];
  assert.deepEqual(
    blocks.map((b) => b[1]),
    [':root:not([data-theme])', ':root[data-theme=teetotaler]'],
  );
  for (const block of blocks) {
    const actual = Object.fromEntries(
      [...block[2].matchAll(/--([a-z-]+):([^;]+);?/g)].map((m) => [m[1], m[2].trim()]),
    );
    for (const [role, value] of Object.entries(expected)) assert.equal(actual[role], value);
    assert.equal(actual['grid-border'], '#767676');
    assert.equal(actual['grid-disabled-text'], '#595959');
    assert.equal(actual['component-surface'], 'Canvas');
    assert.equal(actual['input-surface'], 'Field');
    assert.equal(actual['footer-divider'], '#d8d8d8');
    assert.equal(actual['disabled-opacity'], '0.6');
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

test('every available drink has complete semantic pairings with healthy contrast', () => {
  for (const [name, tokens] of Object.entries(palettes)) {
    if (name === 'teetotaler') continue;
    for (const row of evaluate(tokens))
      assert.ok(row.ratio >= row.required, name + ': ' + JSON.stringify(row));
    assert.equal(tokens['disabled-opacity'], '1');
    for (const role of [
      'page-background',
      'section-surface',
      'panel-surface',
      'navigation-surface',
      'component-surface',
      'input-surface',
      'control-background',
      'control-hover-background',
      'control-active-background',
      'selected-background',
    ]) {
      assert.ok(
        Math.max(
          contrast(rgb(tokens['focus-inner']), rgb(tokens[role])),
          contrast(rgb(tokens['focus-outer']), rgb(tokens[role])),
        ) >= 3,
        name + ': two-tone focus on ' + role,
      );
    }
  }
});
test('available runtime choices expose static palettes and the implemented living mode', () => {
  const source = readFileSync(
    new URL('../src/app/services/theme-state.ts', import.meta.url),
    'utf8',
  );
  const names = [...source.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(names, [...Object.keys(palettes), 'dusk-to-dusk']);
  assert.doesNotMatch(source, /id: 'dawn-to-dawn'/);
  assert.doesNotMatch(themeCss, /:root\[data-theme=(?:blueprint|journey)\]/);
});
test('polarity wipes reveal complete snapshots in distinct directions without crossfading', () => {
  const wipe = compileFile(
    fileURLToPath(new URL('../src/styles/themes/_living.scss', import.meta.url)),
    { style: 'compressed' },
  ).css;
  assert.match(wipe, /data-theme-wipe=sunset.*animation-name:theme-horizon/);
  assert.match(wipe, /data-theme-wipe=sunrise.*animation-name:theme-rise/);
  assert.match(wipe, /clip-path:inset\(0 100% 0 0\)/);
  assert.match(wipe, /clip-path:inset\(100% 0 0 0\)/);
  assert.match(wipe, /var\(--theme-wipe-duration, 400ms\)/);
  assert.match(wipe, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(wipe, /opacity:|crossfade|mix-blend-mode:(?!normal)/);
});

test('actual shared UI consumes the measured roles while construction tape and artwork stay independent', () => {
  const compile = (path) =>
    compileFile(fileURLToPath(new URL('../' + path, import.meta.url)), { style: 'compressed' }).css;
  const grid = compile('src/app/components/smart-grid/smart-grid.scss');
  assert.match(grid, /border-block-end:1px solid var\(--grid-border\)/);
  assert.match(grid, /color:var\(--grid-disabled-text\)/);
  assert.match(
    compile('src/app/components/footer/footer.scss'),
    /border-top:1px solid var\(--footer-divider\)/,
  );
  assert.match(compile('src/styles/base/_buttons.scss'), /opacity:var\(--disabled-opacity\)/);
  const kiosk = compile('src/app/components/thingamajob/thingamajob.scss');
  assert.match(kiosk, /var\(--component-surface, Canvas\)/);
  assert.match(kiosk, /var\(--input-surface, Field\)/);
  assert.match(kiosk, /background:#ffdf00;color:#000/);
  assert.match(themeCss, /:root\[data-theme\]:not\(\[data-theme=teetotaler\]\) input/);
  assert.match(themeCss, /box-shadow:0 0 0 3px var\(--focus-inner\)/);
  assert.doesNotMatch(themeCss, /\.candidate|\.bedlam|--accent|transition:/);
});
