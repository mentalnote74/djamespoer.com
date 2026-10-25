import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sitemapFor } from './discoverability.mjs';
import {
  PUBLIC_PAGES,
  publicPageForPath,
  structuredDataForPage,
} from '../src/app/content/public-pages.ts';

test('sitemap contains canonical public pages and real journal dates without invented freshness or internal routes', () => {
  const xml = sitemapFor({
    schemaVersion: 1,
    entries: [{ date: '2026-10-22' }, { date: '2026-10-22' }],
  });
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(urls.length, PUBLIC_PAGES.length + 1);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => /^https:\/\/djamespoer\.com\//.test(url)));
  assert.ok(!/test\/|api\/|career-source|changefreq|priority/.test(xml));
  const dated = [...xml.matchAll(/<url><loc>(.*?)<\/loc><lastmod>(.*?)<\/lastmod><\/url>/g)];
  assert.equal(dated.length, 5);
  assert.ok(
    dated.every(
      (match) =>
        match[1].includes('/blognostisphere') &&
        match[2] ===
          (match[1].endsWith('/blognostisphere') ||
          match[1].endsWith('/the-difference-between-good-and-good-enough')
            ? '2026-10-24'
            : '2026-10-22'),
    ),
  );
  assert.throws(() => sitemapFor({ schemaVersion: 1, entries: [{ date: '2026-02-31' }] }));
  assert.throws(() => sitemapFor({ entries: [] }));
});

test('canonical identity ignores query, fragment, matrix and trailing slash while internal paths are never indexable', () => {
  assert.equal(publicPageForPath('/work/ips/;source=nav?x=1#main')?.path, 'work/ips');
  assert.equal(publicPageForPath('/about/?internal=1#main')?.path, 'about');
  for (const path of [
    '/test/thingamajob',
    '/api/buildometer',
    '/career-source/resume.docx',
    '/not-a-page',
    '/product-journal/2026-02-31',
  ])
    assert.equal(publicPageForPath(path), undefined);
  assert.match(publicPageForPath('/product-journal/2026-10-22').title, /2026-10-22/);
});

test('metadata keeps author identity and employer distinctions; dated journal titles differ', () => {
  assert.equal(new Set(PUBLIC_PAGES.map((p) => p.title)).size, PUBLIC_PAGES.length);
  assert.equal(new Set(PUBLIC_PAGES.map((p) => p.description)).size, PUBLIC_PAGES.length);
  assert.match(publicPageForPath('/work/dr').description, /classic-ASP/);
  assert.doesNotMatch(publicPageForPath('/work/dr').description, /ASP\.NET|depart|left early/);
  assert.doesNotMatch(publicPageForPath('/work/ips').description, /depart|left early/);
  assert.notEqual(
    publicPageForPath('/product-journal/2026-10-21').title,
    publicPageForPath('/product-journal/2026-10-22').title,
  );
});

test('small JSON-LD graphs share one professional identity and truthful page-specific relationships', () => {
  for (const page of PUBLIC_PAGES) {
    const graph = structuredDataForPage(page)['@graph'];
    assert.equal(graph.length, 3);
    assert.equal(graph[0].name, 'D. James Poer');
    assert.equal(graph[1]['@type'], 'WebSite');
    assert.equal(graph[2].url, 'https://djamespoer.com/' + page.path);
    assert.equal(graph[2].isPartOf['@id'], graph[1]['@id']);
    if (page.kind === 'profile') assert.equal(graph[2].mainEntity['@id'], graph[0]['@id']);
    if (page.kind === 'work') assert.equal(graph[2].mainEntity['@type'], 'CreativeWork');
    if (page.article) {
      assert.equal(graph[0].alternateName, 'Blognosticator');
      assert.equal(graph[2].mainEntity['@type'], 'BlogPosting');
      assert.equal(graph[2].mainEntity.author['@id'], graph[0]['@id']);
      assert.equal(graph[2].mainEntity.datePublished, page.article.publishedDate);
      assert.equal(graph[2].mainEntity.dateModified, page.article.modifiedDate);
    }
    assert.doesNotMatch(
      JSON.stringify(graph),
      /aggregateRating|"JobPosting"|private-only|career-source/,
    );
  }
});
