// Bounded cold/warm comparison of current main and SCRUM-145, not Lighthouse.
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { startPreview } from './preview.mjs';
const final = process.env.BASS_FINAL === '1';
const out = final
  ? 'tmp/evidence/scrum-145/performance-final'
  : 'tmp/evidence/scrum-145/performance';
await mkdir(out, { recursive: true });
const baseline = await startPreview({ root: '../pig-seamless-loading/dist/djamespoer/browser' }),
  candidate = await startPreview();
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-extensions'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  results = [];
try {
  for (const width of [1440, 390])
    for (let rep = 1; rep <= (final ? 1 : 2); rep++)
      for (const [mode, host] of final
        ? [['candidate', candidate]]
        : rep % 2
          ? [
              ['baseline', baseline],
              ['candidate', candidate],
            ]
          : [
              ['candidate', candidate],
              ['baseline', baseline],
            ]) {
        const context = await browser.createBrowserContext(),
          page = await context.newPage(),
          cdp = await page.createCDPSession();
        await page.setViewport({
          width,
          height: 1000,
          deviceScaleFactor: width === 390 ? 2 : 1,
          hasTouch: width === 390,
        });
        await cdp.send('Network.enable');
        await cdp.send('Network.clearBrowserCache');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: 204800,
          uploadThroughput: 84375,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.evaluateOnNewDocument(() => {
          Math.random = () => 0.067;
          localStorage.setItem('portfolio.analytics.internal', '1');
          window.__paint = { lcp: [], cls: 0 };
          window.__decode = [];
          new PerformanceObserver((list) => {
            for (const e of list.getEntries())
              window.__paint.lcp.push({
                at: e.startTime,
                url: e.url,
                tag: e.element?.tagName,
                class: e.element?.className,
              });
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) window.__paint.cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
          const decode = HTMLImageElement.prototype.decode;
          HTMLImageElement.prototype.decode = function () {
            if (!this.closest('app-big-dumb-bass-slide')) return decode.call(this);
            const image = this,
              start = performance.now();
            return decode.call(this).then((v) => {
              window.__decode.push({ src: image.currentSrc, start, end: performance.now() });
              return v;
            });
          };
        });
        for (const cache of final ? ['cold'] : ['cold', 'warm']) {
          await page.goto(host.base + '/?internal=1', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(
            () =>
              document.readyState === 'complete' &&
              document.fonts.status === 'loaded' &&
              window.__paint.lcp.length &&
              [...document.querySelectorAll('.carousel__slide:not([hidden]) .art img')].every(
                (i) => i.complete && i.naturalWidth,
              ),
            { timeout: 60000 },
          );
          await sleep(500);
          const opening = await page.evaluate(() => ({
            ...window.__paint,
            fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
            bytesBefore: performance
              .getEntriesByType('resource')
              .filter((r) => r.name.includes('/big-dumb-bass/')).length,
          }));
          let artwork = null;
          if (mode === 'candidate') {
            const frames = [],
              capture = rep === 1 && cache === 'cold';
            const frame = async (e) => {
              await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
              frames.push({ time: e.metadata.timestamp, data: e.data });
            };
            if (capture) {
              cdp.on('Page.screencastFrame', frame);
              await cdp.send('Page.startScreencast', {
                format: 'jpeg',
                quality: 76,
                maxWidth: width,
                maxHeight: 1000,
                everyNthFrame: 3,
              });
            }
            await page.evaluate(() =>
              document.querySelector('dialog[open] .cookie-close')?.click(),
            );
            const arrival = await page.evaluate(() => performance.now());
            await page.click('[aria-label="Next slide"]');
            await page.waitForSelector(
              '.carousel__slide:not([hidden]) app-big-dumb-bass-slide .world.ready',
              { timeout: 60000 },
            );
            const ready = await page.evaluate(() => performance.now());
            if (capture)
              await page.waitForFunction(
                () =>
                  Number(
                    getComputedStyle(document.querySelector('.carousel__slide:not([hidden]) .bass'))
                      .opacity,
                  ) === 1,
                { timeout: 16000 },
              );
            const id = width + '-' + rep + '-' + cache;
            artwork = await page.evaluate(() => ({
              decode: window.__decode,
              images: performance
                .getEntriesByType('resource')
                .filter((r) => r.name.includes('/big-dumb-bass/'))
                .map((r) => ({
                  url: r.name,
                  start: r.startTime,
                  end: r.responseEnd,
                  body: r.encodedBodySize,
                  transfer: r.transferSize,
                })),
              rect: document
                .querySelector('.carousel__slide:not([hidden]) .bass-scene')
                .getBoundingClientRect()
                .toJSON(),
              timeOrigin: performance.timeOrigin,
            }));
            if (capture) {
              await cdp.send('Page.stopScreencast');
              cdp.off('Page.screencastFrame', frame);
              await mkdir(out + '/' + id, { recursive: true });
              for (let i = 0; i < frames.length; i++)
                await writeFile(
                  out + '/' + id + '/' + i + '.jpg',
                  Buffer.from(frames[i].data, 'base64'),
                );
              await writeFile(
                out + '/' + id + '/frames.json',
                JSON.stringify(
                  frames.map((f, i) => ({ file: i + '.jpg', time: f.time })),
                  null,
                  2,
                ),
              );
              await page.screenshot({ path: out + '/' + id + '/complete.png' });
            }
            artwork = {
              ...artwork,
              arrival,
              ready,
              readyAfterArrival: ready - arrival,
              filmstrip: capture ? id : null,
            };
          }
          results.push({ mode, width, rep, cache, opening, artwork, errors });
          await writeFile(out + '/results.json', JSON.stringify(results, null, 2));
          console.log(
            JSON.stringify({
              mode,
              width,
              rep,
              cache,
              lcp: opening.lcp.at(-1)?.at,
              cls: opening.cls,
              imagesBefore: opening.bytesBefore,
              ready: artwork?.readyAfterArrival,
              bytes: artwork?.images.reduce((n, r) => n + r.body, 0),
              errors,
            }),
          );
        }
        await context.close();
      }
} finally {
  await browser.close();
  await baseline.close();
  await candidate.close();
}
