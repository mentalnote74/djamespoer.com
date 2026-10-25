// Focused publication/read-back checks. No paid calls; Chrome stays headless.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer-core';
import { startPreview } from '../big-dumb-bass-slide/preview.mjs';

const live = process.argv.includes('--live');
const preview = live ? null : await startPreview();
const base = live ? 'https://djamespoer.com' : preview.base;
const slug = 'the-difference-between-good-and-good-enough';
const path = '/blognostisphere/' + slug;
const out = 'tmp/evidence/blognostisphere-publication/' + (live ? 'production' : 'local');
await mkdir(out, { recursive: true });
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const source = await readFile('docs/articles/approved/04-good-and-good-enough.md', 'utf8');
const expected = normalize(
  source
    .replace(/^# Consideration #1\s*\n\n## The Difference Between Good, and Good Enough\s*\n/, '')
    .replace(/\*\*Status:\*\* Consideration draft only\. Not approved for publication\.\s*$/, '')
    .replace(/^#{1,6} /gm, '')
    .replace(/^---$/gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/\*\*/g, ''),
);
const sourceHash = createHash('sha256').update(source).digest('hex');
const results = { sourceHash, base, html: {}, views: [] };
let browser;
try {
  for (const route of ['/blognostisphere', path]) {
    const response = await fetch(base + route, { cache: 'no-store' });
    assert.equal(response.status, 200);
    const html = await response.text(),
      document = new JSDOM(html).window.document;
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.equal(
      document.querySelector('link[rel="canonical"]').getAttribute('href'),
      'https://djamespoer.com' + route,
    );
    assert.equal(document.querySelector('meta[name="robots"]').content, 'index, follow');
    if (route === path) {
      assert.equal(
        document.querySelector('h1').textContent,
        'The Difference Between Good, and Good Enough',
      );
      const prose = normalize(
        document.querySelector('.blognostisphere-article__dek').textContent +
          ' ' +
          document.querySelector('.blognostisphere-article__body').textContent,
      );
      assert.equal(
        prose,
        expected,
        'Publication must match every source word, including citations',
      );
      assert(!html.includes('Consideration draft only'));
      assert.equal(document.querySelectorAll('.blognostisphere-article__body ol li').length, 4);
      const graph = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((e) => JSON.parse(e.textContent))
        .find((g) => g['@graph']);
      const posting = graph['@graph'].find(
        (e) => e.mainEntity?.['@type'] === 'BlogPosting',
      ).mainEntity;
      assert.equal(posting.datePublished, '2026-10-24');
      assert.equal(posting.headline, 'The Difference Between Good, and Good Enough');
      assert.equal(posting.author['@id'], 'https://djamespoer.com/#person');
      results.html[route] = {
        status: 200,
        exactSourceText: true,
        citations: 4,
        canonical: true,
        schema: true,
      };
    } else {
      const heading = document.querySelector('.blognostisphere-index > h2');
      assert.equal(heading.textContent, 'Blognostifications');
      assert(heading.nextElementSibling.matches('.blognostisphere-index__entry'));
      assert.equal(document.querySelectorAll('.blognostisphere-index__entry > h3').length, 4);
      assert.equal(document.querySelectorAll('#articles-navigation a').length, 5);
      results.html[route] = { status: 200, heading: true, articles: 4, navArticles: 4 };
    }
  }
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert(
    sitemap.includes('<loc>https://djamespoer.com' + path + '</loc><lastmod>2026-10-24</lastmod>'),
  );
  browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--disable-extensions'],
  });
  for (const width of [1440, 390]) {
    const page = await browser.newPage(),
      errors = [];
    await page.setViewport({
      width,
      height: 1000,
      deviceScaleFactor: width === 390 ? 2 : 1,
      hasTouch: width === 390,
    });
    await page.evaluateOnNewDocument(() =>
      localStorage.setItem('portfolio.analytics.internal', '1'),
    );
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/blognostisphere?internal=1', { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
    for (const view of ['index', 'article']) {
      const scope = view === 'index' ? '.blognostisphere-index' : 'app-article';
      await page.waitForSelector(scope);
      if (view === 'article') assert.equal(new URL(page.url()).pathname, path);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
      const violations = await page.evaluate(
        async (selector) =>
          (await axe.run(document.querySelector(selector))).violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        scope,
      );
      assert.deepEqual(violations, []);
      // Keep visual evidence at the article opening after keyboard navigation.
      if (view === 'article') await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: out + '/' + width + '-' + view + '.png' });
      results.views.push({ width, view, axe: violations, overflow: false });
      if (view === 'index') {
        await page.focus('.blognostisphere-index__entry a[href="' + path + '"]');
        assert.equal(
          await page.$eval('.blognostisphere-index__entry a[href="' + path + '"]', (e) =>
            e.matches(':focus-visible'),
          ),
          true,
        );
        await page.keyboard.press('Enter');
        await page.waitForFunction((expected) => location.pathname === expected, {}, path);
      }
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await writeFile(out + '/results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser?.close();
  await preview?.close();
}
