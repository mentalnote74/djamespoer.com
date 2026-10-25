// Focused local built-page contracts; no paid calls and no external network.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { startPreview } from './preview.mjs';
const out = 'tmp/evidence/scrum-145/article-hero';
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile('artwork/big-dumb-bass/manifest.json', 'utf8'));
const assets = Object.values(manifest).find(
  (v) => Array.isArray(v) && v[0]?.path?.startsWith('assets/'),
);
let hashes = 0;
for (const asset of assets) {
  if (asset.path.includes('approved-concept')) continue;
  const bytes = await readFile(
    'public/assets/registered-slides/big-dumb-bass/desktop/' + asset.path.split('/').pop(),
  );
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  hashes++;
}
assert.equal(hashes, 30);
const preview = await startPreview();
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-extensions'],
});
const scene = '.carousel__slide:not([hidden]) app-big-dumb-bass-slide .bass-scene';
const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  results = [];
const inspect = (page) =>
  page.$eval(scene, (e) => {
    const a = e.querySelector('.bass').getAnimations()[0];
    return {
      ready: e.querySelector('.world').classList.contains('ready'),
      started: e.classList.contains('started'),
      paused: e.classList.contains('paused'),
      opacity: Number(getComputedStyle(e.querySelector('.bass')).opacity),
      x:
        new DOMMatrixReadOnly(getComputedStyle(e.querySelector('.bass')).transform).m41 /
        e.getBoundingClientRect().width,
      time: a?.currentTime ?? null,
      current: e.querySelectorAll('.plate.current').length,
      poster: e.querySelector('.poster img').currentSrc,
    };
  });
async function open(width, mode = 'normal') {
  const context = await browser.createBrowserContext(),
    page = await context.newPage();
  await page.setViewport({
    width,
    height: 1000,
    deviceScaleFactor: width === 390 ? 2 : 1,
    hasTouch: width === 390,
  });
  if (mode === 'reduced')
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    Math.random = () => 0.067;
    window.__events = [];
    window.__lcp = 0;
    Object.defineProperty(window, 'gtag', {
      configurable: true,
      get:
        () =>
        (...args) =>
          window.__events.push(args),
      set: () => {},
    });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.hostname !== 'djamespoer.com') return void request.abort();
    if (mode === 'failure' && /\/big-dumb-bass\/desktop\/lure-/.test(url.pathname))
      return void request.abort();
    try {
      const response = await fetch(preview.base + url.pathname + url.search);
      const body = Buffer.from(await response.arrayBuffer());
      // fetch already decompresses; do not forward content-encoding/length.
      await request.respond({
        status: response.status,
        headers: {
          'content-type': response.headers.get('content-type') || 'application/octet-stream',
          'cache-control': response.headers.get('cache-control') || 'no-cache',
        },
        body,
      });
    } catch {
      await request.abort().catch(() => {});
    }
  });
  await page.goto('https://djamespoer.com/?internal=0', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
  // The test-only valid shuffle puts Bass second; the real control pauses rotation.
  const before = await page.evaluate(
    () =>
      performance.getEntriesByType('resource').filter((r) => r.name.includes('/big-dumb-bass/'))
        .length,
  );
  assert.equal(before, 0);
  await page.click('[aria-label="Next slide"]');
  await page.waitForSelector(scene);
  return { context, page, errors };
}
try {
  for (const width of [1440, 390]) {
    const { context, page, errors } = await open(width);
    await page.waitForSelector(scene + ' .world.ready');
    await page.waitForSelector(scene + '.started');
    const start = await inspect(page);
    assert.equal(start.current, 3);
    assert.equal(start.opacity, 1);
    assert(Math.abs(start.x - 0.4) < 0.001);
    await page.screenshot({ path: out + '/' + width + '-opening.png' });
    await wait(900);
    assert(Math.abs((await inspect(page)).x - 0.4) < 0.001);
    await page.focus(scene + ' .motion-control');
    await page.keyboard.press('Space', { delay: 80 });
    const held = await inspect(page);
    await wait(400);
    const still = await inspect(page);
    assert(Math.abs(held.time - still.time) < 35);
    assert(still.paused);
    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      (s) =>
        new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s + ' .bass')).transform)
          .m41 /
          document.querySelector(s).getBoundingClientRect().width <
        0.32,
      {},
      scene,
    );
    // Offscreen/hidden freeze an in-progress approach; they do not reset the visit.
    await page.focus(scene + ' .motion-control');
    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      (s) => document.querySelector(s).classList.contains('paused'),
      {},
      scene,
    );
    const manualApproach = await inspect(page);
    const pausedTab = await context.newPage();
    await pausedTab.bringToFront();
    await page.waitForFunction(() => document.hidden);
    await wait(200);
    await page.bringToFront();
    await pausedTab.close();
    assert.equal((await inspect(page)).paused, true);
    assert(Math.abs((await inspect(page)).time - manualApproach.time) < 35);
    await page.focus(scene + ' .motion-control');
    await page.keyboard.press('Space', { delay: 80 });
    await page.evaluate(() => scrollTo(0, 1100));
    await page.waitForFunction(
      (s) => document.querySelector(s).classList.contains('paused'),
      {},
      scene,
    );
    const off = await inspect(page);
    await wait(250);
    assert(Math.abs((await inspect(page)).time - off.time) < 35);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(
      (s) => !document.querySelector(s).classList.contains('paused'),
      {},
      scene,
    );
    const other = await context.newPage();
    await other.bringToFront();
    await page.waitForFunction(() => document.hidden);
    const hidden = await inspect(page);
    await wait(250);
    assert(Math.abs((await inspect(page)).time - hidden.time) < 35);
    await page.bringToFront();
    await other.close();
    await page.waitForFunction(
      (s) =>
        new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s + ' .bass')).transform)
          .m41 === 0,
      { timeout: 12000 },
      scene,
    );
    const end = await inspect(page);
    assert.equal(end.x, 0);
    assert.equal(end.opacity, 1);
    assert(end.time >= 7490, JSON.stringify(end));
    await wait(300);
    assert.equal((await inspect(page)).opacity, 1);
    await page.screenshot({ path: out + '/' + width + '-revealed.png' });
    const composition = await page.$eval(scene, (e) => {
      const r = e.getBoundingClientRect();
      const h = e.querySelector('h2').getBoundingClientRect(),
        cta = e.querySelector('.slide-explore').getBoundingClientRect();
      return {
        ratio: r.width / r.height,
        font: getComputedStyle(e.querySelector('h2')).fontSize,
        copyInside: h.top >= r.top && cta.bottom <= r.bottom + 0.5,
        title: e.querySelector('h2').textContent,
        href: e.querySelector('a').getAttribute('href'),
        arrow: getComputedStyle(e.querySelector('.slide-explore'), '::after').content,
      };
    });
    assert(Math.abs(composition.ratio - 3) < 0.01);
    assert(composition.copyInside);
    assert.equal(composition.title, 'Whatever You Do, Do Not Click Here');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
    const axe = await page.evaluate(
      async (s) =>
        (await axe.run(document.querySelector(s))).violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      scene,
    );
    assert.deepEqual(axe, []);
    // One fresh visit resets to rest; Previous/Next are the existing native controls.
    await page.click('[aria-label="Previous slide"]');
    await page.click('[aria-label="Next slide"]');
    await page.waitForSelector(scene + '.started');
    assert(Math.abs((await inspect(page)).x - 0.4) < 0.001);
    await page.focus(scene + ' .motion-control');
    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      (s) => document.querySelector(s).classList.contains('paused'),
      {},
      scene,
    );
    assert.equal((await inspect(page)).paused, true);
    // Resize within this device; keep the persistent reveal animation and decoded batch.
    await page.$eval(
      scene,
      (e) => (window.__bassAnimation = e.querySelector('.bass').getAnimations()[0]),
    );
    await page.setViewport({ ...page.viewport(), width: width === 390 ? 1440 : 390 });
    await page.waitForFunction(
      (s) => {
        const e = document.querySelector(s),
          loaders = [...e.querySelectorAll('.preparing img')],
          current = [...e.querySelectorAll('.plate.current')];
        return (
          current.length === 3 &&
          loaders.every(
            (image, index) => image.complete && image.currentSrc === current[index].currentSrc,
          )
        );
      },
      {},
      scene,
    );
    assert(
      await page.$eval(
        scene,
        (e) => e.querySelector('.bass').getAnimations()[0] === window.__bassAnimation,
      ),
    );
    await page.setViewport({ ...page.viewport(), width });
    assert.equal(
      await page.evaluate(
        () => window.__events.filter((e) => e[1] === 'carousel_cta_click').length,
      ),
      0,
    );
    await page.focus(scene + ' .slide-destination');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/blognostisphere/like-a-big-dumb-bass');
    const hero = 'app-article app-slide-hero app-big-dumb-bass-slide .bass-scene';
    await page.waitForSelector(hero + '.started');
    const articleHero = await page.$eval(hero, (e) => {
      const frame = e.closest('.slide-hero');
      const r = frame.getBoundingClientRect();
      const h = frame.querySelector('h1');
      return {
        h1Count: document.querySelectorAll('h1').length,
        title: h.textContent,
        ratio: r.width / r.height,
        selfLinks: e.querySelectorAll('a').length,
        duplicateHeadlines: e.querySelectorAll('h2').length,
        explore: e.querySelectorAll('.slide-explore').length,
        pause: !!e.querySelector('.motion-control'),
        font: getComputedStyle(h).fontSize,
        titleRight: (h.getBoundingClientRect().right - r.left) / r.width,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(articleHero.h1Count, 1);
    assert.equal(articleHero.title, 'Like a Big Dumb Bass');
    assert.equal(articleHero.selfLinks, 0);
    assert.equal(articleHero.explore, 0);
    assert.equal(articleHero.duplicateHeadlines, 0);
    assert(articleHero.pause);
    assert(!articleHero.overflow);
    assert(Math.abs(articleHero.ratio - 3) < 0.01);
    await page.focus(hero + ' .motion-control');
    await page.keyboard.press('Space');
    await page.waitForFunction(
      (s) => document.querySelector(s).classList.contains('paused'),
      {},
      hero,
    );
    const frozen = await page.$eval(hero + ' .bass', (e) => e.getAnimations()[0].currentTime);
    await wait(250);
    assert(
      Math.abs(
        (await page.$eval(hero + ' .bass', (e) => e.getAnimations()[0].currentTime)) - frozen,
      ) < 35,
    );
    await page.keyboard.press('Space');
    await page.waitForFunction(
      (s) =>
        new DOMMatrixReadOnly(getComputedStyle(document.querySelector(s + ' .bass')).transform)
          .m41 === 0,
      { timeout: 12000 },
      hero,
    );
    await page.screenshot({ path: out + '/' + width + '-article-hero.png' });
    const heroAxe = await page.evaluate(async () =>
      (await axe.run(document.querySelector('app-article'))).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(heroAxe, []);
    let events = await page.evaluate(() =>
      window.__events.filter((e) => e[1] === 'carousel_cta_click'),
    );
    assert.equal(events.length, 1);
    assert.equal(events[0][2].slide, 'big-dumb-bass');
    await page.goBack({ waitUntil: 'networkidle0' });
    await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
    // Home is recreated after native Back. Select the same slide through controls.
    for (
      let n = 0;
      n < 17 && !(await page.$('.carousel__slide:not([hidden])[data-slide-id="big-dumb-bass"]'));
      n++
    ) {
      await page.click('[aria-label="Next slide"]');
      await wait(100);
    }
    await page.waitForSelector(scene);
    await page.click(scene + ' .slide-destination');
    await page.waitForFunction(() => location.pathname === '/blognostisphere/like-a-big-dumb-bass');
    events = await page.evaluate(() =>
      window.__events.filter((e) => e[1] === 'carousel_cta_click'),
    );
    assert.equal(events.length, 2);
    const canonical = await page.$eval('link[rel="canonical"]', (e) => e.href);
    assert.equal(canonical, 'https://djamespoer.com/blognostisphere/like-a-big-dumb-bass');
    results.push({
      width,
      mode: 'normal',
      start,
      end,
      composition,
      articleHero,
      heroAxe,
      axe,
      keyboardAndPointerOneEventEach: true,
      clickEvents: events,
      manualMidApproachPauseAndBackgroundPreserved: true,
      responsiveAnimationPreserved: true,
      pauseExcluded: true,
      canonical,
      offscreenFreeze: true,
      hiddenFreeze: true,
      revisitReset: true,
      errors,
    });
    assert.deepEqual(errors, []);
    await context.close();
    for (const mode of ['failure', 'reduced']) {
      const { context, page, errors } = await open(width, mode);
      await wait(1000);
      const state = await inspect(page);
      const resources = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((r) => r.name.includes('/big-dumb-bass/'))
          .map((r) => r.name),
      );
      if (mode === 'failure') {
        assert.equal(state.current, 0);
        assert.equal(state.started, false);
        assert(state.poster.includes('opening-'));
        assert(await page.$eval(scene + ' .poster img', (i) => i.complete && i.naturalWidth > 0));
      } else {
        assert(state.poster.includes('fallback-'));
        assert.equal(await page.$eval(scene, (e) => e.getAnimations({ subtree: true }).length), 0);
      }
      await page.screenshot({ path: out + '/' + width + '-' + mode + '.png' });
      await page.emulateMediaFeatures([{ name: 'forced-colors', value: 'active' }]);
      assert.equal(await page.$eval(scene + ' .art', (e) => getComputedStyle(e).display), 'none');
      await page.focus(scene + ' .slide-destination');
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => location.pathname === '/blognostisphere/like-a-big-dumb-bass',
      );
      results.push({
        width,
        mode,
        state,
        resources,
        nativeNavigation: true,
        forcedColors: true,
        errors,
      });
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
  await writeFile(out + '/contracts.json', JSON.stringify({ hashes, results }, null, 2));
  console.log(JSON.stringify({ hashes, results }));
} finally {
  await browser.close();
  await preview.close();
}
