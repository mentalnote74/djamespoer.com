import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileString, compile as compileFile } from 'sass';
import { fileURLToPath } from 'node:url';

const loadPaths = [fileURLToPath(new URL('../src/styles', import.meta.url))];
const compile = (source) => compileString(source, { loadPaths, style: 'compressed' }).css;
const use = "@use 'abstracts' as foundation;";

test('importing the public foundation emits no CSS', () => {
  assert.equal(compile(use), '');
});

test('all established layout thresholds remain unchanged', () => {
  const cases = new Map([
    ['controls-grid', '32rem'],
    ['content-stack', '40rem'],
    ['artwork-compact', '48rem'],
    ['navigation-wrap', '64rem'],
  ]);
  for (const [name, width] of cases) {
    assert.equal(
      compile(`${use}.example { width: foundation.breakpoint('${name}'); }`),
      `.example{width:${width}}`,
    );
  }
});

test('unknown names fail compilation rather than silently emitting an invalid query', () => {
  assert.throws(
    () =>
      compile(`${use}@include foundation.at-or-below('unknown') { .example { display: block; } }`),
    /Unknown responsive breakpoint: unknown/,
  );
});

test('one grouped transition emits one media block and only supplied declarations', () => {
  const css = compile(
    `${use}@include foundation.at-or-below('content-stack') { .first { display: grid; } .second { margin: 0; } }`,
  );
  assert.equal(css, '@media(max-width: 40rem){.first{display:grid}.second{margin:0}}');
});

test('private policy cannot be accessed through the public module', () => {
  assert.throws(
    () => compile(`${use}.example { width: foundation.$-breakpoints; }`),
    /Private members can't be accessed/,
  );
});

test('shared native-button styles exclude disabled controls from hover and active states', () => {
  const css = compile("@use 'base/buttons';");
  assert.match(css, /button\{display:inline-flex/);
  assert.match(css, /button:hover:not\(:disabled\):not\(\[aria-disabled=true\]\)/);
  assert.match(css, /button:active:not\(:disabled\):not\(\[aria-disabled=true\]\)/);
  assert.match(css, /button:disabled,button\[aria-disabled=true\]/);
});

test('header toggle is hidden by default and revealed only by the established navigation transition', () => {
  const css = compileFile(
    fileURLToPath(new URL('../src/app/components/header/header.scss', import.meta.url)),
    { style: 'compressed' },
  ).css;
  assert.match(css, /\.site-header__menu\{display:none\}/);
  assert.match(css, /@media\(max-width: 64rem\)\{\.site-header__menu\{display:inline-flex/);
  assert.doesNotMatch(css, /\.site-header button\{/);
});
