// Read-only headless production acceptance; no interactive preview or paid calls.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const out = 'tmp/evidence/scrum-145/lure-magic/production';
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--disable-extensions'],
});
const results = [],
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const width of [1440, 390])
    for (const surface of ['carousel', 'article']) {
      const page = await browser.newPage(),
        errors = [];
      await page.setViewport({
        width,
        height: 1000,
        deviceScaleFactor: width === 390 ? 2 : 1,
        hasTouch: width === 390,
      });
      await page.evaluateOnNewDocument(() => {
        Math.random = () => 0.067;
        localStorage.setItem('portfolio.analytics.internal', '1');
      });
      await page.setRequestInterception(true);
      page.on('request', (r) =>
        new URL(r.url()).hostname === 'djamespoer.com' ? r.continue() : r.abort(),
      );
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(
        'https://djamespoer.com' +
          (surface === 'carousel' ? '/' : '/blognostisphere/like-a-big-dumb-bass') +
          '?internal=1',
        { waitUntil: 'networkidle0' },
      );
      await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
      if (surface === 'carousel') await page.click('[aria-label="Next slide"]');
      const scene =
        surface === 'carousel'
          ? '.carousel__slide:not([hidden]) app-big-dumb-bass-slide .bass-scene'
          : 'app-article app-big-dumb-bass-slide .bass-scene';
      await page.waitForSelector(scene + '.started');
      const state = () =>
        page.$eval(scene, (e) => ({
          clocks: [...e.querySelectorAll('.lure-halo,.lure-sheen.current i')].map(
            (n) => n.getAnimations()[0].currentTime,
          ),
          lure: getComputedStyle(e.querySelector('.lure')).transform,
          mask: getComputedStyle(e.querySelector('.lure-sheen.current')).maskImage,
          pulse: e.querySelector('.lure-halo').getAnimations()[0].effect.getTiming().duration,
        }));
      const before = await state();
      await wait(500);
      const moving = await state();
      assert.equal(before.clocks.length, 3);
      assert(before.clocks.every((t, i) => moving.clocks[i] > t + 200));
      assert.equal(moving.lure, 'none');
      assert.equal(moving.pulse, 4800);
      await page.focus(scene + ' .motion-control');
      await page.keyboard.press('Space');
      const paused = await state();
      await wait(250);
      const held = await state();
      assert(paused.clocks.every((t, i) => Math.abs(held.clocks[i] - t) < 35));
      await page.$eval(scene, (e) => {
        e.querySelector('.bass').getAnimations()[0].currentTime = 7500;
        for (const n of e.querySelectorAll('.lure-halo,.lure-sheen.current i'))
          n.getAnimations()[0].currentTime = 2400;
      });
      await wait(60);
      const rect = await page.$eval(scene, (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
      });
      await page.screenshot({ path: out + '/' + width + '-' + surface + '-peak.png', clip: rect });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
      const axe = await page.evaluate(
        async (s) => (await axe.run(document.querySelector(s))).violations.map((v) => v.id),
        surface === 'article' ? 'app-article' : scene,
      );
      assert.deepEqual(axe, []);
      assert.deepEqual(errors, []);
      if (surface === 'article')
        assert.equal(
          await page
            .$$eval('h1', (nodes) => nodes.map((n) => n.textContent))
            .then((a) => a.join('|')),
          'Like a Big Dumb Bass',
        );
      else
        assert.equal(
          await page.$eval(scene + ' .slide-destination', (e) => e.getAttribute('href')),
          '/blognostisphere/like-a-big-dumb-bass',
        );
      if (width === 390 && surface === 'article') {
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.reload({ waitUntil: 'networkidle0' });
        const still = await page.$eval('app-big-dumb-bass-slide', (e) => ({
          src: e.querySelector('.poster img').currentSrc,
          clocks: e.getAnimations({ subtree: true }).length,
        }));
        assert(still.src.includes('fallback-'));
        assert.equal(still.clocks, 0);
      }
      results.push({ width, surface, before, moving, paused: held, axe, errors, overflow: false });
      await page.close();
    }
  await writeFile(out + '/results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
