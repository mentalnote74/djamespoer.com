import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { CREATIVE_TOWN_BODY } from '../src/app/components/case-study/creative-town.content.ts';

test('Creative Town preserves approved SCRUM-106 comment 10224 article verbatim', () => {
  const markdown = readFileSync(new URL('../docs/articles/approved/creative-town-scrum-106-10224.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(createHash('sha256').update(markdown).digest('hex'), '902a1c11967d9c6b993cdccd211fe194c651ec99324f17102fcd7bdaf15e5b51');
  const strip = (text) => text.replaceAll('**', '').replaceAll('_', '');
  const expected = markdown.trim().split(/\n\n+/).flatMap(block => {
    if (block.startsWith('|')) return block.split('\n').filter((_, i) => i !== 1).flatMap(row => row.split('|').slice(1, -1).map(cell => strip(cell.trim())));
    return [strip(block.replace(/^## /, ''))];
  });
  const document = new JSDOM(CREATIVE_TOWN_BODY).window.document;
  const actual = [...document.querySelectorAll('h2,p,th,td')].map(node => node.textContent);
  assert.deepEqual(actual, expected);
  assert.ok([...document.querySelectorAll('h2')].some(node => node.textContent === 'Artificial? Yes. Intelligent? Not so’s we’d notice.'));
  assert.equal(document.querySelectorAll('table').length, 1);
  assert.equal(document.querySelectorAll('table tbody tr').length, 5);
});

test('live hero reuses the original selector and cast manifest unchanged', () => {
  const digest = name => createHash('sha256').update(readFileSync(new URL('../public/creative-town-hero/' + name, import.meta.url))).digest('hex');
  assert.equal(digest('scene.js'), 'eaed168ff449867b84b9c2904361924a8d6ad6cd3bb88d221e3cd1feef3d606a');
  assert.equal(digest('scene-data.js'), 'c4212823b2dd5008724f7273e412e2c4c25ac76e3b948e011fe3075b7830f65f');
});
