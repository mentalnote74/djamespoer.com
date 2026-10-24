// Local built-page acceptance. No external API proxy, evaluation or deployment.
import { createServer } from 'node:http';
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const root = path.resolve('dist/djamespoer/browser');
const out = 'tmp/evidence/pig-loading/contracts';
mkdirSync(out, { recursive: true });
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};
const server = createServer((req, res) => {
  try {
    if (req.method !== 'GET') throw Error('GET only');
    let file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
    if (!file.startsWith(root + path.sep) && file !== root) throw Error('outside root');
    if (statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const scene = '.carousel__slide:not([hidden]) app-tcc-pig-slide .pig-scene';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reports = [];
async function open(width, failure) {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height: 1000,
    deviceScaleFactor: width === 390 ? 2 : 1,
    hasTouch: width === 390,
  });
  await page.evaluateOnNewDocument((mode) => {
    Math.random = () => 0.37;
    localStorage.setItem('internal', '1');
    if (mode === 'decode') {
      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function () {
        return this.closest('.preparing')
          ? Promise.reject(new Error('acceptance decode failure'))
          : decode.call(this);
      };
    }
  }, failure);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let requests = 0;
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().includes('/tcc-pig/')) {
      requests++;
      if (failure === 'network') return void request.abort();
    }
    void request.continue();
  });
  await page.goto(base + '/?internal=1', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
  await page.click('[aria-label="Next slide"]');
  await page.waitForSelector(scene);
  return { page, errors, count: () => requests };
}
try {
  for (const width of (process.env.PIG_WIDTHS || '1440,390').split(',').map(Number)) {
    for (const failure of process.env.PIG_CHECK === 'replacement' ? [] : ['network', 'decode']) {
      const { page, errors, count } = await open(width, failure);
      await page.waitForFunction(
        (s) => document.querySelector(s).classList.contains('paused'),
        {},
        scene,
      );
      const state = await page.$eval(scene, (e) => {
        const image = e.querySelector('.static-pig img');
        return {
          fallback: image.complete && image.naturalWidth > 0,
          current: e.querySelectorAll('.layered-pig.current').length,
          eligible: e.classList.contains('eligible'),
          link: e.querySelector('a').getAttribute('href'),
        };
      });
      assert(state.fallback);
      assert.equal(state.current, 0);
      assert.equal(state.eligible, false);
      const before = count();
      await wait(500);
      assert.equal(count(), before);
      await page.screenshot({ path: `${out}/${width}-${failure}.png` });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.waitForFunction(
        (s) => {
          const e = document.querySelector(s),
            image = e.querySelector('.static-pig img');
          return (
            image.complete && image.currentSrc === e.querySelector('.static-pig source').srcset
          );
        },
        {},
        scene,
      );
      await page.screenshot({ path: `${out}/${width}-${failure}-reduced.png` });
      const point = await page.$eval(scene, (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x + r.width * 0.9, y: r.y + r.height * 0.5 };
      });
      if (width === 390) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await page.waitForFunction(() => location.pathname === '/case-studies/tcc');
      assert.deepEqual(errors, []);
      reports.push({
        width,
        failure,
        ...state,
        requests: before,
        noRetry: true,
        nativeNavigation: true,
        reducedFallbackKiss: true,
        errors,
      });
      await page.close();
    }
    const { page, errors } = await open(width);
    await page.waitForSelector(scene + '.eligible');
    if (process.env.PIG_CHECK === 'replacement') {
      const previous = await page.$eval(scene, (e) =>
        [...e.querySelectorAll('.layered-pig.current img')].map((i) => i.currentSrc),
      );
      await page.evaluate(() => {
        const decode = HTMLImageElement.prototype.decode;
        window.__releasePig = [];
        HTMLImageElement.prototype.decode = function () {
          return this.closest('.preparing')
            ? new Promise((resolve, reject) =>
                window.__releasePig.push({
                  resolve: () => decode.call(this).then(resolve, reject),
                  reject,
                }),
              )
            : decode.call(this);
        };
      });
      const nextWidth = width === 1440 ? 390 : 1440;
      await page.setViewport({ ...page.viewport(), width: nextWidth });
      await page
        .waitForFunction(() => window.__releasePig.length >= 5, { timeout: 5000 })
        .catch(async (error) => {
          console.log(
            await page.evaluate(() => ({
              queued: window.__releasePig.length,
              loaders: [...document.querySelectorAll('.preparing img')].map((i) => ({
                src: i.currentSrc,
                complete: i.complete,
              })),
              shown: [...document.querySelectorAll('.layered-pig.current img')].map(
                (i) => i.currentSrc,
              ),
            })),
          );
          throw error;
        });
      assert.deepEqual(
        await page.$eval(scene, (e) =>
          [...e.querySelectorAll('.layered-pig.current img')].map((i) => i.currentSrc),
        ),
        previous,
      );
      await page.screenshot({ path: `${out}/${width}-replacement-pending.png` });
      await page.evaluate(() => window.__releasePig.splice(0).forEach((p) => p.resolve()));
      await page.waitForFunction(
        (s, old) =>
          [...document.querySelectorAll(s + ' .layered-pig.current img')].every(
            (i, n) => i.currentSrc !== old[n],
          ),
        {},
        scene,
        previous,
      );
      await page.screenshot({ path: `${out}/${width}-replacement-complete.png` });
      const current = await page.$eval(scene, (e) =>
        [...e.querySelectorAll('.layered-pig.current img')].map((i) => i.currentSrc),
      );
      await page.setViewport({ ...page.viewport(), width });
      await page
        .waitForFunction(() => window.__releasePig.length >= 5, { timeout: 5000 })
        .catch(async (error) => {
          console.log(
            await page.evaluate(() => ({
              queued: window.__releasePig.length,
              loaders: [...document.querySelectorAll('.preparing img')].map((i) => ({
                src: i.currentSrc,
                complete: i.complete,
              })),
              shown: [...document.querySelectorAll('.layered-pig.current img')].map(
                (i) => i.currentSrc,
              ),
            })),
          );
          throw error;
        });
      await page.evaluate(() =>
        window.__releasePig
          .splice(0)
          .forEach((p) => p.reject(new Error('replacement decode failure'))),
      );
      await page.waitForFunction(
        (s) => document.querySelector(s).classList.contains('paused'),
        {},
        scene,
      );
      assert.deepEqual(
        await page.$eval(scene, (e) =>
          [...e.querySelectorAll('.layered-pig.current img')].map((i) => i.currentSrc),
        ),
        current,
      );
      await page.screenshot({ path: `${out}/${width}-replacement-failed.png` });
      reports.push({
        width,
        replacementPendingKeepsCompleteFrame: true,
        replacementSuccessChangesFivePinnedSources: true,
        replacementFailureKeepsAndFreezesLastCompleteFrame: true,
        errors,
      });
      assert.deepEqual(errors, []);
      await page.close();
      continue;
    }
    const contract = await page.$eval(scene, (e) => ({
      href: e.querySelector('a').getAttribute('href'),
      name: e.querySelector('a').getAttribute('aria-label'),
      track: e.querySelector('a').hasAttribute('publicTrack'),
      ratio: e.getBoundingClientRect().width / e.getBoundingClientRect().height,
    }));
    assert.equal(contract.href, '/case-studies/tcc');
    assert.equal(contract.name, 'Explore the TCC case study');
    assert(contract.track);
    assert(Math.abs(contract.ratio - 3) < 0.01);
    // A visit away/back resets the original timeline without requesting another face.
    await page.click('[aria-label="Previous slide"]');
    await page.click('[aria-label="Next slide"]');
    await page.waitForSelector(scene + '.eligible');
    const motion = await page.$eval(scene, async (e) => {
      const start = performance.now(),
        changes = [];
      let oldW = false,
        oldK = false,
        doubled = false;
      while (performance.now() - start < 7800) {
        const shown = (name) =>
          getComputedStyle(e.querySelector('.layered-pig.current .' + name)).visibility ===
          'visible';
        const w = shown('eye-wink'),
          k = shown('mouth-kiss');
        if (w && !oldW) changes.push({ pose: 'wink', at: Math.round(performance.now() - start) });
        if (k && !oldK) changes.push({ pose: 'kiss', at: Math.round(performance.now() - start) });
        doubled ||= (w && shown('eye-open')) || (k && shown('mouth-rest'));
        oldW = w;
        oldK = k;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return { changes, doubled };
    });
    assert.deepEqual(
      motion.changes.map((c) => c.pose),
      ['wink', 'kiss', 'wink', 'kiss'],
    );
    assert(!motion.doubled);
    await page.focus(scene + ' .motion-control');
    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      (s) =>
        document
          .querySelector(s)
          .getAnimations({ subtree: true })
          .every((a) => a.playState === 'paused'),
      {},
      scene,
    );
    const before = await page.$eval(
      scene,
      (e) => e.getAnimations({ subtree: true })[0].currentTime,
    );
    await wait(250);
    const after = await page.$eval(scene, (e) => e.getAnimations({ subtree: true })[0].currentTime);
    assert(Math.abs(before - after) < 30);
    await page.keyboard.press('Space', { delay: 80 });
    await page.waitForFunction(
      (s) =>
        document
          .querySelector(s)
          .getAnimations({ subtree: true })
          .every((a) => a.playState === 'running'),
      {},
      scene,
    );
    await page.evaluate(() => scrollTo(0, 1000));
    await page.waitForFunction(
      (s) => !document.querySelector(s).classList.contains('eligible'),
      {},
      scene,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForSelector(scene + '.eligible');
    const other = await browser.newPage();
    await other.bringToFront();
    await page.waitForFunction(() => document.hidden);
    assert(await page.$eval(scene, (e) => !e.classList.contains('eligible')));
    await page.bringToFront();
    await page.waitForSelector(scene + '.eligible');
    await other.close();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await wait(80);
    const reduced = await page.$eval(scene, (e) => ({
      animations: e.getAnimations({ subtree: true }).length,
      kiss: getComputedStyle(e.querySelector('.layered-pig.current .mouth-kiss')).visibility,
    }));
    assert.deepEqual(reduced, { animations: 0, kiss: 'visible' });
    await page.screenshot({ path: `${out}/${width}-reduced.png` });
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
    const axe = await page.evaluate(async () =>
      (await axe.run(document.querySelector('app-carousel'))).violations.map((v) => v.id),
    );
    assert.deepEqual(axe, []);
    await page.emulateMediaFeatures([{ name: 'forced-colors', value: 'active' }]);
    await wait(80);
    assert.equal(
      await page.$eval(scene, (e) => getComputedStyle(e.querySelector('.art')).display),
      'none',
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    reports.push({
      width,
      contract,
      motion,
      keyboardPauseResume: true,
      offscreenReset: true,
      actualHiddenTabReset: true,
      reduced,
      forcedColors: true,
      axe,
      errors,
    });
    await page.close();
  }
  writeFileSync(
    out + (process.env.PIG_CHECK === 'replacement' ? '/replacement.json' : '/results.json'),
    JSON.stringify(reports, null, 2),
  );
  console.log(JSON.stringify(reports));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
