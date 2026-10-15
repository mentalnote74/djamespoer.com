import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { extractSections } from './thingamajob-baseline-capture.mjs';
const expected = {
  title: 'Fictional employer',
  introduction: 'Developer · 2000–2001',
  sections: [{ heading: 'Overview', paragraphs: ['Fictional career evidence.'] }],
};
const html =
  '<main><article class="case-study"><h1>Fictional employer</h1><p>Developer · 2000–2001</p><section><h2>Overview</h2><p>Fictional career evidence.</p></section><section><h2>Excluded</h2><p>Not extraction input.</p></section></article></main>';
test('selection retains exact live text and location while excluding other sections', () => {
  const document = new JSDOM(html).window.document;
  const selected = extractSections(expected, ['Overview'], document);
  assert.equal(selected.length, 2);
  assert.equal(selected[0].text, expected.introduction);
  assert.equal(selected[1].text, 'OverviewFictional career evidence.');
  assert.equal(selected[1].order, 1);
  assert.ok(!JSON.stringify(selected).includes('Not extraction input'));
});
test('missing/duplicate heading, changed body and changed introduction fail closed', () => {
  for (const changed of [
    html.replace('<h2>Overview</h2>', '<h2>Different</h2>'),
    html.replace(
      '</article>',
      '<section><h2>Overview</h2><p>Fictional career evidence.</p></section></article>',
    ),
    html.replace('Fictional career evidence.', 'Unapproved changed copy.'),
    html.replace('2000–2001', '2000–2002'),
  ])
    assert.throws(() =>
      extractSections(expected, ['Overview'], new JSDOM(changed).window.document),
    );
});
