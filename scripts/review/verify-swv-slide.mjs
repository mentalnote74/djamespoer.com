// Controlled INTERNAL browser verification; external analytics requests are blocked.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('tmp/swv-slide', { recursive: true });
const origin = process.env.SWV_QA_URL || 'http://127.0.0.1:4385';
const out = 'tmp/swv-slide';
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    ...(process.env.SWV_REDUCED ? ['--force-prefers-reduced-motion=reduce'] : []),
  ],
});
const receipt = { origin, views: [], google: [], errors: [] };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const width of [390, 1440]) {
    const p = await b.newPage();
    await p.bringToFront();
    await p.setViewport({ width, height: 900 });
    await p.evaluateOnNewDocument(() => {
      localStorage.setItem('portfolio.analytics.internal', '1');
      localStorage.setItem('rigby.greeting.seen.v1', '1');
    });
    await p.setRequestInterception(true);
    p.on('request', (r) =>
      /google-analytics|googletagmanager|cloudflareinsights|\/cdn-cgi\/rum/.test(r.url())
        ? r.abort()
        : r.continue(),
    );
    let docs = 0;
    p.on('request', (req) => {
      if (req.isNavigationRequest() && req.url().startsWith('https://shadywhitevan.rocks/')) docs++;
      if (/google-analytics|googletagmanager/.test(req.url()))
        receipt.google.push({ blocked: true, url: req.url() });
    });
    p.on('pageerror', (e) => receipt.errors.push(e.message));
    await p.goto(origin, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('app-swv-slide iframe');
    await p.evaluate(() =>
      document.querySelector('button[aria-label="Pause automatic slide rotation"]')?.click(),
    );
    const hiddenBefore = await p.$eval('app-swv-slide', (n) => ({
      warm: n.closest('.carousel__slide').classList.contains('carousel__slide--preloading'),
      size: [n.getBoundingClientRect().width, n.getBoundingClientRect().height],
      inert: n.closest('.carousel__slide').hasAttribute('inert'),
    }));
    assert(hiddenBefore.warm && hiddenBefore.inert);
    let f;
    for (let i = 0; i < 300; i++) {
      f = p.frames().find((f) => f.url().startsWith('https://shadywhitevan.rocks/'));
      if (f && (await f.$('.van-hero__stage.is-ready'))) break;
      await delay(100);
    }
    assert(f && (await f.$('.van-hero__stage.is-ready')), 'Live van must initialize before reveal');
    await f.evaluate(() => {
      window.__qaSceneToken = crypto.randomUUID();
      window.__qaCanvas = document.querySelector('.van-hero canvas');
      window.__qaThemeLog = [];
      new MutationObserver(() => {
        const s = document.documentElement.style.getPropertyValue('--live-band');
        if (s && window.__qaThemeLog.at(-1) !== s) window.__qaThemeLog.push(s);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    });
    console.log('Preloaded live scene ready', width);
    if (process.env.SWV_REDUCED) {
      assert(await f.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
      assert(await p.$('button[aria-label="Play automatic slide rotation"][disabled]'));
    }
    const token = await f.evaluate(() => window.__qaSceneToken);
    const iframe = await p.$('app-swv-slide iframe');
    await p.evaluate(() => {
      window.__qaFrame = document.querySelector('app-swv-slide iframe');
      window.__qaWindow = window.__qaFrame.contentWindow;
      window.__qaParentMoves = [];
      addEventListener('scroll', () => window.__qaParentMoves.push(scrollY));
    });
    async function showVan() {
      for (let i = 0; i < 20; i++) {
        if (
          await p.$(
            '.carousel__slide[data-slide-id="shady-white-van"]:not(.carousel__slide--preloading)',
          )
        )
          return;
        await p.$eval('button[aria-label="Next slide"]', (n) => n.click());
        await delay(50);
      }
      throw Error('SWV not reached');
    }
    async function stable() {
      assert.equal(await f.evaluate(() => window.__qaSceneToken), token);
      assert(
        await f.evaluate(() => document.querySelector('.van-hero canvas') === window.__qaCanvas),
      );
      assert(
        await p.evaluate(
          () =>
            document.querySelector('app-swv-slide iframe') === window.__qaFrame &&
            window.__qaFrame.contentWindow === window.__qaWindow,
        ),
      );
      assert.equal(docs, 1);
      const frameSize = await p.$eval('app-swv-slide iframe', (n) => {
        let r = n.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
      const childSize = await f.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      console.log('Frame sizes', width, frameSize, childSize);
      assert(Math.abs(frameSize.w - childSize.w) < 1);
      assert(Math.abs(frameSize.h - childSize.h) < 1);
    }
    await p.evaluate(() => scrollTo(0, 200));
    const parentBefore = await p.evaluate(() => scrollY);
    await showVan();
    await delay(300);
    assert.equal(await p.evaluate(() => scrollY), parentBefore);
    await stable();
    const geometry = await f.evaluate(() => {
      const box = (n) => {
        let r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      return {
        inner: [innerWidth, innerHeight],
        target: box(document.querySelector('#swv-embed-stage')),
        hero: box(document.querySelector('.van-hero')),
        canvas: box(document.querySelector('.van-hero canvas')),
        internal: localStorage.getItem('portfolio.analytics.internal'),
      };
    });
    assert(Math.abs(geometry.target.y) < 1);
    assert(Math.abs(geometry.hero.h - geometry.inner[1]) < 1);
    assert(Math.abs(geometry.canvas.w - geometry.inner[0]) < 1);
    assert.equal(geometry.internal, '1');
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await delay(600);
    await stable();
    await p.evaluate(() => scrollTo(0, 0));
    await delay(600);
    await stable();
    for (let cycle = 0; cycle < 2; cycle++) {
      await p.$eval('button[aria-label="Next slide"]', (n) => n.click());
      await delay(50);
      await showVan();
      await stable();
    }
    if (width === 1440) {
      await f.waitForSelector('.van-hero__toggle');
      await f.$eval('.van-hero__toggle', (n) => n.click());
      assert.equal(
        await f.$eval('.van-hero__toggle', (n) => n.getAttribute('aria-pressed')),
        'true',
      );
      await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await delay(250);
      await p.evaluate(() => scrollTo(0, 0));
      await p.$eval('button[aria-label="Next slide"]', (n) => n.click());
      await delay(50);
      await showVan();
      assert.equal(
        await f.$eval('.van-hero__toggle', (n) => n.getAttribute('aria-pressed')),
        'true',
      );
      await f.$eval('.van-hero__toggle', (n) => n.click());
    }
    const other = await b.newPage();
    await other.goto('about:blank');
    await other.bringToFront();
    await delay(250);
    const background = await p.evaluate(() => document.visibilityState);
    await p.bringToFront();
    await delay(250);
    await stable();
    await other.close();
    await p.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await p.evaluate(async () =>
      (await axe.run({ include: [['app-carousel']] })).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    assert.deepEqual(violations, []);
    // Theme preparation is asynchronous. Observe real theme arrivals rather than assuming a frame count.
    if (width === 1440 && !process.env.SWV_QUICK && !process.env.SWV_REDUCED) {
      for (let i = 0; i < 900; i++) {
        if (await f.evaluate(() => window.__qaThemeLog.length >= 2)) break;
        await delay(100);
      }
    }
    console.log('Core lifecycle/scroll/pause/visibility checks passed', width);
    const themes = await f.evaluate(() => window.__qaThemeLog);
    if (width === 1440 && !process.env.SWV_QUICK && !process.env.SWV_REDUCED)
      assert(themes.length >= 2, 'Observe at least two live theme arrivals without a reset');
    await stable();
    await p.$eval('app-swv-slide', (n) => n.scrollIntoView({ block: 'center' }));
    await delay(500);
    await stable();
    await p.screenshot({ path: `${out}/after-${width}.png` });
    await stable();
    receipt.views.push({
      width,
      preloaded: hiddenBefore,
      geometry,
      docs,
      background,
      themes,
      parentBefore,
      stableIdentity: true,
      userPause: width === 1440,
      violations,
    });
    await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
    await p.close();
  }
  assert(receipt.google.every((r) => r.blocked));
  assert.deepEqual(receipt.errors, []);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await b.close();
}
