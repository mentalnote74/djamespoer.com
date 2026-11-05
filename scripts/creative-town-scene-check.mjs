// Real renderer acceptance check. Native image alpha is measured independently
// of the renderer's cached asset bounds; no synthetic stand-in cast.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const count = Number(process.argv.find((a) => a.startsWith('--seeds='))?.split('=')[1] ?? 500);
assert.ok(Number.isInteger(count) && count >= 1);
const root = path.resolve('public');
const out = path.resolve('tmp/town-evidence');
await fs.mkdir(out, { recursive: true });
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(
    root,
    '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname),
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await fs.readFile(file);
    res
      .writeHead(200, {
        'Content-Type':
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.json': 'application/json',
          }[path.extname(file)] ?? 'application/octet-stream',
      })
      .end(data);
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
const report = {
  seeds: count,
  widths: [1440, 390],
  residentPairsAbove10Percent: 0,
  tableViolations: 0,
  identifyingFeatureCovered: 0,
  torsoEscapes: 0,
  maximumTorsos: 0,
  minimumVisible: Infinity,
  maximumVisible: 0,
  capacityConflicts: {},
  errors: [],
  draws: [],
};
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => report.errors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    let state = 1974;
    const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    Math.random = next;
    crypto.getRandomValues = (a) => {
      for (let i = 0; i < a.length; i++) a[i] = Math.floor(next() * 4294967296);
      return a;
    };
  });
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`http://127.0.0.1:${server.address().port}/creative-town-hero/`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForFunction(() => document.documentElement.dataset.placementReady === 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    const cache = new Map();
    const mask = document.createElement('canvas');
    mask.width = 1664;
    mask.height = 936;
    const paint = mask.getContext('2d', { willReadFrequently: true });
    for (const plate of document.querySelectorAll('img.plate'))
      if (/(?:foreground|bench-front|service-counter-front)\.webp$/.test(plate.src))
        paint.drawImage(plate, 0, 0, 1664, 936);
    const pixels = paint.getImageData(0, 0, 1664, 936).data,
      sums = new Uint32Array(1665 * 937),
      at = (x, y) => sums[y * 1665 + x];
    for (let y = 0; y < 936; y++)
      for (let x = 0; x < 1664; x++)
        sums[(y + 1) * 1665 + x + 1] =
          (pixels[(y * 1664 + x) * 4 + 3] > 8 ? 1 : 0) + at(x + 1, y) + at(x, y + 1) - at(x, y);
    const coveredByScenery = ([x, y, w, h]) => {
      const l = Math.max(0, Math.floor(x)),
        t = Math.max(0, Math.floor(y)),
        r = Math.min(1664, Math.ceil(x + w)),
        b = Math.min(936, Math.ceil(y + h));
      return at(r, b) - at(l, b) - at(r, t) + at(l, t);
    };
    window.checkTown = () => {
      const world = document.getElementById('world'),
        origin = world.getBoundingClientRect(),
        scale = origin.width / 1664;
      const rect = (e) => {
        const r = e.getBoundingClientRect();
        return [
          (r.x - origin.x) / scale,
          (r.y - origin.y) / scale,
          r.width / scale,
          r.height / scale,
        ];
      };
      const overlap = (a, b) =>
        Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) *
        Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
      const nativeBounds = (img) => {
        if (cache.has(img.src)) return cache.get(img.src);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const data = x.getImageData(0, 0, c.width, c.height).data;
        let l = c.width,
          t = c.height,
          r = 0,
          b = 0;
        for (let y = 0; y < c.height; y++)
          for (let xx = 0; xx < c.width; xx++)
            if (data[(y * c.width + xx) * 4 + 3] > 8) {
              l = Math.min(l, xx);
              t = Math.min(t, y);
              r = Math.max(r, xx + 1);
              b = Math.max(b, y + 1);
            }
        const v = [l / c.width, t / c.height, r / c.width, b / c.height];
        cache.set(img.src, v);
        return v;
      };
      const residents = [...document.querySelectorAll('#placed-residents [data-actor]')].map(
        (e) => {
          const img = e.querySelector('img'),
            box = rect(e);
          const ratio = Math.min(box[2] / img.naturalWidth, box[3] / img.naturalHeight),
            w = img.naturalWidth * ratio,
            h = img.naturalHeight * ratio;
          const a = e.dataset.actor === 'sanitation-engineer' ? [0, 0, 1, 1] : nativeBounds(img),
            flipped = getComputedStyle(img).transform.startsWith('matrix(-1');
          let art = [
            box[0] + (box[2] - w) / 2 + w * (flipped ? 1 - a[2] : a[0]),
            box[1] + box[3] - h + h * a[1],
            w * (a[2] - a[0]),
            h * (a[3] - a[1]),
          ];
          for (const detail of e.querySelectorAll('.ticket')) {
            const d = rect(detail),
              l = Math.min(art[0], d[0]),
              t = Math.min(art[1], d[1]);
            art = [
              l,
              t,
              Math.max(art[0] + art[2], d[0] + d[2]) - l,
              Math.max(art[1] + art[3], d[1] + d[3]) - t,
            ];
          }
          return { id: e.dataset.actor, fixture: e.dataset.fixture, box: art };
        },
      );
      const tables = [...document.querySelectorAll('.table-furniture,.chair')].map(rect);
      const pairs = [],
        under = [],
        covered = [],
        escapes = [];
      for (let i = 0; i < residents.length; i++) {
        const a = residents[i];
        for (const b of residents.slice(i + 1)) {
          const area = overlap(a.box, b.box);
          if (area > 1e-5)
            pairs.push({
              a: a.id,
              b: b.id,
              fraction: area / Math.min(a.box[2] * a.box[3], b.box[2] * b.box[3]),
            });
        }
        for (const table of tables) if (overlap(a.box, table) > 1e-5) under.push(a.id);
        // Conservatively protect the entire art, not an assumed face rectangle.
        if (coveredByScenery(a.box) > 0) covered.push(a.id);
        if (
          a.box[0] < -0.001 ||
          a.box[1] < -0.001 ||
          a.box[0] + a.box[2] > 1664.001 ||
          a.box[1] + a.box[3] > 936.001
        )
          covered.push(a.id + ' (clipped by frame)');
        const torso = TOWN_SCENE.halfBodyAssets.includes(a.id) && a.id !== 'sanitation-engineer';
        if (torso) {
          const fixture = townHeroLayout.fixtures.find((f) => f.id === a.fixture);
          if (
            !fixture ||
            a.box[0] < fixture.rect[0] ||
            a.box[0] + a.box[2] > fixture.rect[0] + fixture.rect[2] ||
            a.box[1] + a.box[3] > fixture.lip
          )
            escapes.push(a.id);
        }
      }
      const span =
        Math.max(...residents.map((a) => a.box[0] + a.box[2])) -
        Math.min(...residents.map((a) => a.box[0]));
      return {
        residents,
        pairs,
        under,
        covered,
        escapes,
        span,
        torsos: residents.filter(
          (a) => TOWN_SCENE.halfBodyAssets.includes(a.id) && a.id !== 'sanitation-engineer',
        ).length,
        conflicts: townHeroLayout.conflicts,
        episode: document.documentElement.dataset.episode,
      };
    };
  });
  for (let seed = 1; seed <= count; seed++) {
    const width = seed % 2 ? 1440 : 390;
    await page.setViewport({ width, height: 1000 });
    await page.evaluate((seed) => {
      let state = seed;
      const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
      Math.random = next;
      crypto.getRandomValues = (a) => {
        for (let i = 0; i < a.length; i++) a[i] = Math.floor(next() * 4294967296);
        return a;
      };
      document.getElementById('shuffle').click();
    }, seed);
    await page.waitForFunction(() => document.documentElement.dataset.placementReady === 'true', {
      timeout: 60000,
    });
    const draw = await page.evaluate(() => checkTown());
    report.minimumVisible = Math.min(report.minimumVisible, draw.residents.length);
    report.maximumVisible = Math.max(report.maximumVisible, draw.residents.length);
    report.maximumTorsos = Math.max(report.maximumTorsos, draw.torsos);
    for (const id of draw.conflicts)
      report.capacityConflicts[id] = (report.capacityConflicts[id] ?? 0) + 1;
    report.residentPairsAbove10Percent += draw.pairs.filter((p) => p.fraction > 0.1).length;
    report.tableViolations += draw.under.length;
    report.identifyingFeatureCovered += draw.covered.length + draw.pairs.length;
    report.torsoEscapes += draw.escapes.length;
    report.draws.push({
      seed,
      width,
      visible: draw.residents.length,
      torsos: draw.torsos,
      conflicts: draw.conflicts.length,
    });
    const failures =
      draw.pairs.length ||
      draw.under.length ||
      draw.covered.length ||
      draw.escapes.length ||
      draw.torsos > 2 ||
      !draw.residents.some((r) => r.id === 'pig-prime') ||
      !draw.residents.some((r) => r.id === 'larry');
    if (failures) {
      await fs.writeFile(
        path.join(out, 'failed-draw.json'),
        JSON.stringify({ seed, width, ...draw }, null, 2),
      );
      await page.screenshot({ path: path.join(out, 'failed-draw.png') });
      throw Error('Placement acceptance failed at seed ' + seed);
    }
    assert.ok(draw.residents.length >= 12, 'meaningful scene, not an empty-scene pass');
    assert.ok(draw.span >= 1664 * 0.7, 'residents spread across the scene');
    assert.equal(
      new Set(draw.residents.map((r) => r.id)).size,
      draw.residents.length,
      'no duplicate resident',
    );
    if (seed <= 6) await page.screenshot({ path: path.join(out, `draw-${seed}-${width}.png`) });
    if (seed % 50 === 0) console.log('Checked', seed, 'seeds');
  }
  assert.equal(report.errors.length, 0);
  console.log(JSON.stringify({ ...report, draws: undefined }));
} finally {
  await fs.writeFile(path.join(out, '500-seed-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
}
