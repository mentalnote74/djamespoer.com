// Asset metadata only; regenerate after editing a resident WebP. No dependencies added.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root = path.resolve('public/creative-town-hero/assets');
const names = (await fs.readdir(root)).filter(
  (n) =>
    n.endsWith('.webp') &&
    ![
      'background.webp',
      'foreground.webp',
      'bench-front.webp',
      'service-counter-front.webp',
    ].includes(n),
);
const server = http.createServer(async (req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }).end(await fs.readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  const records = {};
  for (const name of names) {
    records[name] = await page.evaluate(async (url) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = url;
      await image.decode();
      const c = document.createElement('canvas');
      c.width = image.naturalWidth;
      c.height = image.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let l = c.width,
        t = c.height,
        r = 0,
        b = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (data[(y * c.width + x) * 4 + 3] > 0) {
            l = Math.min(l, x);
            t = Math.min(t, y);
            r = Math.max(r, x + 1);
            b = Math.max(b, y + 1);
          }
      return {
        width: c.width,
        height: c.height,
        alpha: [l / c.width, t / c.height, r / c.width, b / c.height],
      };
    }, `http://127.0.0.1:${server.address().port}/${name}`);
  }
  await fs.writeFile(
    'public/creative-town-hero/placement-bounds.json',
    JSON.stringify(records) + '\n',
  );
  console.log('Measured', names.length, 'unchanged source assets');
} finally {
  await browser.close();
  server.close();
}
