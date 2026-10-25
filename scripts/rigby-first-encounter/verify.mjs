// Focused built-site check. No provider calls or public deployment.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const out = 'docs/evidence/rigby-first-encounter';
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-extensions'],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const root = 'app-rigby-encounter';
async function open(width, media = [], fail = false) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures(media);
  if (fail) {
    await page.setRequestInterception(true);
    page.on('request', (req) =>
      req.url().includes('/assets/rigby/') ? req.abort() : req.continue(),
    );
  }
  await page.goto('http://127.0.0.1:8849/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
  await page.$eval(root, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(
    () =>
      !document.querySelector('app-rigby-encounter .feed')?.disabled ||
      document
        .querySelector('app-rigby-encounter [role=status]')
        ?.textContent.includes('could not load'),
  );
  await wait(700);
  // Recenter after the lazy sprite/arrival before measuring its stationary button.
  await page.$eval(root, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await wait(500);
  return { page, context, errors };
}
const pose = (page) =>
  page.$eval(root, (el) => ({
    dog: el.querySelector('.dog').style.transform,
    frame: el.querySelector('img').style.transform,
    revealed: el.querySelector('.dog').classList.contains('revealed'),
    status: el.querySelector('[role=status]').textContent,
    button: (() => {
      const r = el.querySelector('.feed').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })(),
  }));
try {
  for (const width of [1440, 390]) {
    const { page, context, errors } = await open(width);
    await page.focus(root + ' .feed');
    await page.screenshot({ path: `${out}/${width}-waiting.png` });
    const before = await pose(page);
    assert(before.revealed);
    await page.keyboard.press(width === 390 ? 'Space' : 'Enter');
    const samples = [];
    for (let i = 0; i < 7; i++) {
      await wait(100);
      samples.push(await pose(page));
      await page.screenshot({ path: `${out}/${width}-bounce-${i}.png` });
    }
    assert(samples.some((p) => p.dog !== before.dog));
    assert(new Set(samples.map((p) => p.frame)).size === 2);
    samples.forEach((p) => assert.deepEqual(p.button, before.button));
    assert.equal(new URL(page.url()).pathname, '/');
    await page.focus(root + ' button[aria-pressed]');
    await page.keyboard.press('Space');
    await wait(100);
    const paused = await pose(page);
    await wait(400);
    assert.equal((await pose(page)).dog, paused.dog);
    assert.equal((await pose(page)).frame, paused.frame);
    await page.keyboard.press('Space');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await wait(150);
    const off = await pose(page);
    await wait(350);
    assert.equal((await pose(page)).dog, off.dog);
    await page.$eval(root, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await wait(2500);
    const settled = await pose(page);
    await wait(350);
    assert.equal((await pose(page)).dog, settled.dog);
    assert.equal(settled.dog, 'translate(0px, 0px)');
    await page.screenshot({ path: `${out}/${width}-settled.png` });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.addScriptTag({
      content: await readFile('node_modules/axe-core/axe.min.js', 'utf8'),
    });
    const axe = await page.evaluate(async () =>
      (await axe.run('app-rigby-encounter')).violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      })),
    );
    assert.deepEqual(axe, []);
    await page.focus(root + ' a');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/case-studies/tcc');
    assert.deepEqual(errors, []);
    results.push({
      width,
      keyboard: width === 390 ? 'Space' : 'Enter',
      stationaryTarget: true,
      poses: [...new Set(samples.map((s) => s.frame))],
      bounded: true,
      paused: true,
      offscreenFrozen: true,
      nativeEvidenceLink: true,
      overflow: false,
      axe,
      errors,
    });
    await context.close();
  }
  for (const media of [
    [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    [{ name: 'forced-colors', value: 'active' }],
  ]) {
    const { page, context } = await open(390, media);
    await page.focus(root + ' .feed');
    await page.keyboard.press('Enter');
    await wait(100);
    const before = await pose(page);
    await wait(800);
    const after = await pose(page);
    assert.equal(before.dog, after.dog);
    assert.equal(before.frame, after.frame);
    assert(after.status.includes('loved that biscuit'));
    await page.screenshot({ path: `${out}/390-${media[0].name}.png` });
    await page.focus(root + ' button:nth-child(2)');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval(root + ' a', (a) => document.activeElement === a), true);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() =>
      document
        .querySelector('app-rigby-encounter [role=status]')
        ?.textContent.includes('dismissed'),
    );
    results.push({
      media: media[0],
      staticEquivalent: true,
      dismissFocus: true,
      sessionDismissal: true,
    });
    await context.close();
  }
  const { page, context } = await open(390, [], true);
  assert.equal((await pose(page)).revealed, false);
  assert(await page.$(root + ' a'));
  results.push({ failedImage: true, inert: true, evidenceAvailable: true });
  await context.close();
  await writeFile(`${out}/browser-results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
