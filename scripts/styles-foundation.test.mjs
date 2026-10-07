import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileString } from 'sass';
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
