// Local production-build comparison only. Never evaluates Thingamajob or deploys.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { dimensions } from '../slide-assets/validate.mjs';
const out = 'tmp/evidence/pig-loading';
await mkdir(out, { recursive: true });
const modes = (process.env.PIG_MODES || 'baseline,fix').split(',');
const reps = Number(process.env.PIG_REPS || 3);
const profiles = (process.env.PIG_PROFILES || 'native,slow').split(',');
const widths = (process.env.PIG_WIDTHS || '1440,390').split(',').map(Number);
const scenarios = (process.env.PIG_SCENARIOS || 'home,hero').split(',');
const visual = process.env.PIG_VISUAL === '1';
const caches = (process.env.PIG_CACHES || 'cold,warm').split(',');
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
const servers = [];
const roots = { baseline: 'tmp/baseline-browser', fix: 'dist/djamespoer/browser' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const mode of modes) {
  const root = path.resolve(roots[mode]),
    cache = new Map();
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') {
        res.writeHead(405);
        return res.end();
      }
      let file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
      if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403);
        return res.end();
      }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      let item = cache.get(file);
      if (!item) {
        const raw = await readFile(file),
          ext = path.extname(file),
          gzip = /\.(html|js|css|json|svg)$/.test(file);
        item = {
          body: gzip ? gzipSync(raw) : raw,
          type: types[ext] || 'application/octet-stream',
          gzip,
          html: ext === '.html',
        };
        cache.set(file, item);
      }
      res.writeHead(200, {
        'Content-Type': item.type,
        ...(item.gzip ? { 'Content-Encoding': 'gzip' } : {}),
        'Cache-Control': item.html ? 'no-cache' : 'public,max-age=86400',
      });
      res.end(item.body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push({ mode, server, base: 'http://127.0.0.1:' + server.address().port });
}
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-extensions', '--no-first-run'],
});
const results = [];
async function traceStop(cdp) {
  const complete = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const { stream } = await complete;
  let text = '';
  for (;;) {
    const r = await cdp.send('IO.read', { handle: stream });
    text += r.data;
    if (r.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  return JSON.parse(text);
}
try {
  for (const width of widths)
    for (const profile of profiles)
      for (let rep = 1; rep <= reps; rep++)
        for (const scenario of scenarios) {
          // Alternate variant order to reduce time/order bias.
          const ordered = rep % 2 ? servers : [...servers].reverse();
          for (const { mode, base } of ordered) {
            const context = await browser.createBrowserContext(),
              page = await context.newPage();
            await page.setViewport({
              width,
              height: 1000,
              deviceScaleFactor: width === 390 ? 2 : 1,
              hasTouch: width === 390,
            });
            const cdp = await page.createCDPSession();
            await cdp.send('Network.enable');
            await cdp.send('Performance.enable');
            await cdp.send('Network.emulateNetworkConditions', {
              offline: false,
              latency: profile === 'slow' ? 150 : 0,
              downloadThroughput: profile === 'slow' ? 204800 : -1,
              uploadThroughput: profile === 'slow' ? 84375 : -1,
            });
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile === 'slow' ? 4 : 1 });
            const errors = [];
            page.on('pageerror', (e) => errors.push(e.message));
            await page.evaluateOnNewDocument(() => {
              Math.random = () => 0.37; // A valid deterministic shuffle: pig is next after Conservatory.
              localStorage.setItem('internal', '1');
              window.__paint = { lcp: 0, cls: 0 };
              window.__pig = { states: [], first: null, complete: null, arrival: null };
              new PerformanceObserver((list) => {
                for (const e of list.getEntries()) window.__paint.lcp = e.startTime;
              }).observe({ type: 'largest-contentful-paint', buffered: true });
              new PerformanceObserver((list) => {
                for (const e of list.getEntries())
                  if (!e.hadRecentInput) window.__paint.cls += e.value;
              }).observe({ type: 'layout-shift', buffered: true });
              let decoding = false,
                previous = '';
              const observe = () => {
                const scene = document.querySelector('app-tcc-pig-slide .pig-scene');
                if (scene && scene.getBoundingClientRect().width > 0) {
                  const p = window.__pig,
                    now = performance.now(),
                    images = [...scene.querySelectorAll('.preparing img')];
                  if (!images.length) images.push(...scene.querySelectorAll('.art img'));
                  const fallback = scene.querySelector('.static-pig img');
                  if (fallback?.complete && fallback.naturalWidth && p.fallbackAt == null)
                    p.fallbackAt = now;
                  const displayed = [...scene.querySelectorAll('.layered-pig.current img')];
                  const mayComplete = !fallback || displayed.length === 5;
                  if (p.first === null) p.first = now;
                  const state = images
                    .map((i) => (i.complete && i.naturalWidth ? '1' : '0'))
                    .join('');
                  if (state !== previous) {
                    p.states.push({
                      at: now,
                      state,
                      eligible: scene.classList.contains('eligible'),
                    });
                    previous = state;
                  }
                  if (
                    !decoding &&
                    mayComplete &&
                    images.length === 5 &&
                    images.every((i) => i.complete && i.naturalWidth)
                  ) {
                    decoding = true;
                    Promise.all(images.map((i) => i.decode())).then(() =>
                      requestAnimationFrame(() =>
                        requestAnimationFrame(() => {
                          p.complete = performance.now();
                          p.images = images.map((i) => ({
                            src: i.currentSrc,
                            w: i.naturalWidth,
                            h: i.naturalHeight,
                          }));
                        }),
                      ),
                    );
                  }
                }
                requestAnimationFrame(observe);
              };
              requestAnimationFrame(observe);
            });
            for (const cache of caches) {
              if (cache === 'cold') await cdp.send('Network.clearBrowserCache');
              const id = [
                  ...(visual ? ['visual'] : []),
                  mode,
                  width,
                  profile,
                  scenario,
                  rep,
                  cache,
                ].join('-'),
                frames = [],
                resources = [],
                snapshots = [];
              let capture = scenario === 'hero';
              const requests = new Map();
              const request = (e) => requests.set(e.requestId, e.request.url);
              const response = (e) => {
                const url = requests.get(e.requestId);
                if (url && /\/tcc-pig\/|\/pig-sprite\//.test(url))
                  resources.push({ url, encoded: e.encodedDataLength, at: e.timestamp });
              };
              cdp.on('Network.requestWillBeSent', request);
              cdp.on('Network.loadingFinished', response);
              const frame = async (e) => {
                await cdp
                  .send('Page.screencastFrameAck', { sessionId: e.sessionId })
                  .catch(() => {});
                if (capture && rep === 1 && frames.length < 600)
                  frames.push({ data: e.data, time: e.metadata.timestamp });
              };
              if (rep === 1) {
                cdp.on('Page.screencastFrame', frame);
                await cdp.send('Page.startScreencast', {
                  format: 'jpeg',
                  quality: 72,
                  maxWidth: 1440,
                  maxHeight: 1000,
                  everyNthFrame: 1,
                });
              }
              await cdp.send('Tracing.start', {
                categories:
                  'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,loading',
                transferMode: 'ReturnAsStream',
              });
              await page.goto(
                base + (scenario === 'home' ? '/' : '/case-studies/tcc') + '?internal=1',
                { waitUntil: 'domcontentloaded', timeout: 60000 },
              );
              let opening;
              if (scenario === 'home') {
                await page.waitForFunction(
                  () =>
                    window.__paint.lcp > 0 &&
                    document.readyState === 'complete' &&
                    document.fonts.status === 'loaded' &&
                    [...document.querySelectorAll('.carousel__slide:not([hidden]) .art img')].every(
                      (i) => i.complete && i.naturalWidth,
                    ),
                  { timeout: 60000 },
                );
                await sleep(500);
                opening = await page.evaluate(() => ({
                  ...window.__paint,
                  fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
                }));
                // One real Next click, not an asset preload or a forced route/DOM replacement.
                await page.evaluate(() =>
                  document.querySelector('dialog[open] .cookie-close')?.click(),
                );
                capture = true;
                await page.evaluate(() =>
                  document.addEventListener(
                    'click',
                    (e) => {
                      if (e.target.closest('[aria-label="Next slide"]'))
                        window.__pig.arrival = performance.now();
                    },
                    { once: true, capture: true },
                  ),
                );
                await page.click('[aria-label="Next slide"]');
                await page.waitForSelector(
                  '.carousel__slide:not([hidden])[data-slide-id="tcc-ux-pig"]',
                  { timeout: 5000 },
                );
              }
              if (visual) {
                await mkdir(`${out}/${id}`, { recursive: true });
                const start = Date.now();
                while (Date.now() - start < 15000) {
                  const state = await page.evaluate(() => ({
                    now: performance.now(),
                    ...window.__pig,
                  }));
                  const file = `snapshot-${String(snapshots.length).padStart(3, '0')}.jpg`;
                  await page.screenshot({
                    path: `${out}/${id}/${file}`,
                    type: 'jpeg',
                    quality: 85,
                  });
                  snapshots.push({ file, at: state.now });
                  if (state.complete !== null && state.now - state.complete > 300) break;
                  await sleep(80);
                }
                await writeFile(`${out}/${id}/snapshots.json`, JSON.stringify(snapshots, null, 2));
              }
              await page.waitForFunction(() => window.__pig.complete !== null, { timeout: 60000 });
              await sleep(180);
              const measured = await page.evaluate(() => ({
                pig: window.__pig,
                paint: window.__paint,
                timeOrigin: performance.timeOrigin,
                sceneRect: document
                  .querySelector('app-tcc-pig-slide .pig-scene')
                  .getBoundingClientRect()
                  .toJSON(),
                fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
                resources: performance
                  .getEntriesByType('resource')
                  .filter((r) => /\/tcc-pig\/|\/pig-sprite\//.test(r.name))
                  .map((r) => ({
                    url: r.name,
                    transfer: r.transferSize,
                    body: r.encodedBodySize,
                    duration: r.duration,
                    start: r.startTime,
                    end: r.responseEnd,
                  })),
                overflow: document.documentElement.scrollWidth > innerWidth,
              }));
              const metrics = Object.fromEntries(
                (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]),
              );
              const trace = await traceStop(cdp);
              const sums = {
                pageDecodeWallMs: 0,
                pageDecodeCpuMs: 0,
                decodeEvents: 0,
                pigPaintCpuMs: 0,
                paintMs: 0,
                rasterMs: 0,
                layoutMs: 0,
              };
              for (const e of trace.traceEvents) {
                if (e.ph !== 'X' || !e.dur) continue;
                if (e.name === 'Decode Image') {
                  sums.pageDecodeWallMs += e.dur / 1000;
                  sums.pageDecodeCpuMs += (e.tdur ?? 0) / 1000;
                  sums.decodeEvents++;
                }
                if (
                  e.name === 'PaintImage' &&
                  /\/tcc-pig\/|\/pig-sprite\//.test(e.args?.data?.url ?? '')
                )
                  sums.pigPaintCpuMs += (e.tdur ?? 0) / 1000;
                if (e.name === 'Paint') sums.paintMs += e.dur / 1000;
                if (e.name === 'RasterTask') sums.rasterMs += e.dur / 1000;
                if (e.name === 'Layout') sums.layoutMs += e.dur / 1000;
              }
              if (rep === 1) {
                await cdp.send('Page.stopScreencast');
                cdp.off('Page.screencastFrame', frame);
                await mkdir(`${out}/${id}`, { recursive: true });
                for (let i = 0; i < frames.length; i++)
                  await writeFile(
                    `${out}/${id}/${String(i).padStart(3, '0')}.jpg`,
                    Buffer.from(frames[i].data, 'base64'),
                  );
                await writeFile(
                  `${out}/${id}/frames.json`,
                  JSON.stringify(
                    frames.map(({ time }, i) => ({
                      file: String(i).padStart(3, '0') + '.jpg',
                      time,
                    })),
                    null,
                    2,
                  ),
                );
                await page.screenshot({ path: `${out}/${id}/complete.png` });
                await writeFile(`${out}/${id}/trace.json.gz`, gzipSync(JSON.stringify(trace)));
              }
              cdp.off('Network.requestWillBeSent', request);
              cdp.off('Network.loadingFinished', response);
              const unique = [...new Map(measured.pig.images.map((i) => [i.src, i])).values()];
              const decoded = await Promise.all(
                unique.map(async (i) => {
                  const [w, h] = dimensions(
                    await readFile(path.join(roots[mode], new URL(i.src).pathname)),
                  );
                  return { src: i.src, w, h };
                }),
              );
              const result = {
                id,
                mode,
                width,
                dpr: width === 390 ? 2 : 1,
                profile,
                rep,
                scenario,
                cache,
                ...measured,
                opening,
                completeAfterVisibleMs: measured.pig.complete - measured.pig.first,
                completeAfterArrivalMs: measured.pig.complete - (measured.pig.arrival ?? 0),
                pigRequests: measured.resources.length,
                pigTransferred: measured.resources.reduce((n, r) => n + r.transfer, 0),
                pigEncodedBytes: measured.resources.reduce((n, r) => n + r.body, 0),
                decoded,
                decodedRgbaBytes: decoded.reduce((n, i) => n + i.w * i.h * 4, 0),
                trace: sums,
                taskMs: metrics.TaskDuration * 1000,
                scriptMs: metrics.ScriptDuration * 1000,
                jsHeap: metrics.JSHeapUsedSize,
                errors,
                filmstripFrames: frames.length,
                snapshots,
              };
              results.push(result);
              await writeFile(
                `${out}/results-${modes.join('-')}${visual ? '-visual' : ''}.json`,
                JSON.stringify(results, null, 2),
              );
              console.log(
                JSON.stringify({
                  id,
                  complete: Math.round(result.completeAfterArrivalMs),
                  visible: Math.round(result.completeAfterVisibleMs),
                  bytes: result.pigTransferred,
                  requests: result.pigRequests,
                  lcp: Math.round(opening?.lcp ?? result.paint.lcp),
                  states: result.pig.states.map((s) => s.state),
                  errors,
                }),
              );
            }
            await context.close();
          }
        }
} finally {
  await browser.close();
  await Promise.all(servers.map(({ server }) => new Promise((r) => server.close(r))));
}
