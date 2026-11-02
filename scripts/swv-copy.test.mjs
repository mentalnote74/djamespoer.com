import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { SWV_BODY } from '../src/app/components/case-study/shady-white-van.content.ts';

test('SCRUM-149 preserves the supplied manuscript wording, emphasis and paragraph order', () => {
  const source = readFileSync(
    new URL('../docs/articles/approved/shady-white-van-scrum-149.md', import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(source.toString('utf8').replaceAll('\r\n', '\n')).digest('hex'),
    'bcfbea86c3cdacdb52c5b8cbe71e6da103ae78fc1e4c8dac3302af744b9df389',
  );
  const expected = source.toString('utf8').replaceAll('\r\n', '\n').trim().split(/\n\n+/).slice(1);
  const document = new JSDOM(SWV_BODY).window.document;
  const actual = [...document.body.children];
  assert.equal(actual.length, expected.length);
  expected.forEach((block, index) => {
    assert.equal(actual[index].tagName, block.startsWith('## ') ? 'H2' : 'P');
    assert.equal(actual[index].textContent, block.replace(/^## /, '').replaceAll('*', ''));
  });
  assert.equal(
    document.querySelectorAll('strong').length,
    expected.join('\n').match(/\*\*.+?\*\*/g).length,
  );
  assert.equal(document.querySelectorAll('em').length, 1);
});
