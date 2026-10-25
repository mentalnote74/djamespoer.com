// Bounded matched whole-article rendering sample, not Lighthouse or a GPU benchmark.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { startPreview } from './preview.mjs';
const label = process.argv[2] || 'candidate';
const out = 'tmp/evidence/scrum-145/lure-magic';
await mkdir(out, { recursive: true });
const preview = await startPreview();
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-extensions'],
});
const results = [];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: 1000,
      deviceScaleFactor: width === 390 ? 2 : 1,
      hasTouch: width === 390,
    });
    await page.evaluateOnNewDocument(() =>
      localStorage.setItem('portfolio.analytics.internal', '1'),
    );
    await page.goto(preview.base + '/blognostisphere/like-a-big-dumb-bass?internal=1', {
      waitUntil: 'networkidle0',
    });
    await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
    await page.waitForSelector('app-big-dumb-bass-slide .world.ready');
    await page.waitForFunction(
      () =>
        new DOMMatrixReadOnly(
          getComputedStyle(document.querySelector('app-big-dumb-bass-slide .bass')).transform,
        ).m41 === 0,
    );
    const cdp = await page.createCDPSession();
    await cdp.send('Performance.enable');
    const before = (await cdp.send('Performance.getMetrics')).metrics;
    const trace = out + '/' + label + '-' + width + '-trace.json';
    await page.tracing.start({
      path: trace,
      categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc', 'gpu'],
    });
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const gaps = [];
          let first, last;
          const tick = (now) => {
            first ??= now;
            if (last !== undefined) gaps.push(now - last);
            last = now;
            if (now - first < 10000) requestAnimationFrame(tick);
            else resolve(gaps);
          };
          requestAnimationFrame(tick);
        }),
    );
    await page.tracing.stop();
    const after = (await cdp.send('Performance.getMetrics')).metrics;
    const delta = Object.fromEntries(
      [
        'TaskDuration',
        'ScriptDuration',
        'LayoutDuration',
        'RecalcStyleDuration',
        'LayoutCount',
        'RecalcStyleCount',
      ].map((name) => [
        name,
        after.find((m) => m.name === name).value - before.find((m) => m.name === name).value,
      ]),
    );
    const events = JSON.parse(await readFile(trace, 'utf8')).traceEvents;
    const durations = Object.fromEntries(
      ['Paint', 'PrePaint', 'RasterTask', 'UpdateLayerTree', 'Layerize', 'CompositeLayers'].map(
        (name) => {
          const matches = events.filter((e) => e.name === name && e.ph === 'X');
          return [
            name,
            { count: matches.length, ms: matches.reduce((n, e) => n + (e.dur || 0), 0) / 1000 },
          ];
        },
      ),
    );
    const sorted = [...frames].sort((a, b) => a - b);
    results.push({
      width,
      label,
      sampleSeconds: 10,
      delta,
      durations,
      frameGaps: {
        count: frames.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
        max: sorted.at(-1),
        over50ms: frames.filter((n) => n > 50).length,
      },
      images: await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((r) => r.name.includes('/big-dumb-bass/'))
          .map((r) => ({
            url: new URL(r.name).pathname,
            bytes: r.encodedBodySize,
            transfer: r.transferSize,
            delivery: r.deliveryType,
          })),
      ),
    });
    await page.close();
  }
  await writeFile(out + '/' + label + '-cost.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  await preview.close();
}
