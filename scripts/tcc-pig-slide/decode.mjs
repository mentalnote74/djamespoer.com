// Isolate decoder work from the header/other slides; no application/provider calls.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const server = createServer(async (req, res) => {
  try {
    if (!/^\/assets\/(registered-slides\/tcc-pig\/|pig-sprite\/)[a-z0-9/.-]+$/.test(req.url)) {
      res.writeHead(404);
      return res.end();
    }
    const data = await readFile('public' + req.url);
    res.writeHead(200, {
      'Content-Type': req.url.endsWith('avif') ? 'image/avif' : 'image/webp',
      'Cache-Control': 'public,max-age=86400',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  }),
  results = [];
try {
  for (const width of [1440, 768])
    for (let rep = 1; rep <= 3; rep++)
      for (const mode of rep % 2 ? ['baseline', 'sprite'] : ['sprite', 'baseline']) {
        const context = await browser.createBrowserContext(),
          p = await context.newPage(),
          cdp = await p.createCDPSession();
        await cdp.send('Network.enable');
        await cdp.send('Network.clearBrowserCache');
        const urls =
          mode === 'baseline'
            ? ['base', 'eye-open', 'eye-wink', 'mouth-rest', 'mouth-kiss'].map(
                (n) =>
                  `${base}/assets/registered-slides/tcc-pig/${width === 768 ? 'mobile' : 'desktop'}/${n}-${width}.avif`,
              )
            : Array(5).fill(`${base}/assets/pig-sprite/atlas-${width}.avif`);
        for (const cache of ['cold', 'warm']) {
          await cdp.send('Tracing.start', {
            categories: 'disabled-by-default-devtools.timeline',
            transferMode: 'ReturnAsStream',
          });
          const wall = await p.evaluate(async (urls) => {
            const start = performance.now();
            window.images = urls.map((url) => {
              const i = new Image();
              i.src = url;
              return i;
            });
            await Promise.all(window.images.map((i) => i.decode()));
            return performance.now() - start;
          }, urls);
          const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
          await cdp.send('Tracing.end');
          const { stream } = await done;
          let data = '';
          for (;;) {
            const next = await cdp.send('IO.read', { handle: stream });
            data += next.data;
            if (next.eof) break;
          }
          await cdp.send('IO.close', { handle: stream });
          const events = JSON.parse(data).traceEvents.filter(
            (e) => e.name === 'Decode Image' && e.ph === 'X',
          );
          results.push({
            mode,
            width,
            rep,
            cache,
            decodeWallMs: wall,
            coreDecodeCpuMs: events.reduce((n, e) => n + (e.tdur ?? 0) / 1000, 0),
            coreDecodeEventWallMs: events.reduce((n, e) => n + (e.dur ?? 0) / 1000, 0),
            decodeEvents: events.length,
          });
        }
        await context.close();
      }
  await writeFile('tmp/evidence/pig-sprite/decode.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
