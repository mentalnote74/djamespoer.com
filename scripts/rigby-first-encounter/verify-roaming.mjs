// Built local loop; no paid calls, private content capture or external APIs.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const out = 'docs/evidence/rigby-roaming';
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--disable-extensions'],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function open(width, media = []) {
  const context = await browser.createBrowserContext(),
    page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures(media);
  await page.goto('http://127.0.0.1:8849/#rigby-start', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('dialog[open] .cookie-close')?.click());
  return { context, page, errors };
}
const state = (page) =>
  page.$eval('.rover', (el) => ({
    pose: el.dataset.pose,
    position: el.style.transform,
    frame: el.querySelector('img').style.transform,
    lift: el.querySelector('.dog').style.transform,
    shown: el.classList.contains('shown'),
    button: el.querySelector('button').getBoundingClientRect().toJSON(),
  }));
const begging = (page) =>
  page.waitForFunction(
    () => document.querySelector('.rover.shown')?.getAttribute('data-pose') === 'begging',
    { timeout: 15000 },
  );
async function unobstructed(page) {
  return page.evaluate(() => {
    const dog = document.querySelector('.rover').getBoundingClientRect(),
      home = document.querySelector('app-home');
    const overlaps = (r) =>
      dog.left < r.right && dog.right > r.left && dog.top < r.bottom && dog.bottom > r.top;
    const bad = [];
    const walker = document.createTreeWalker(home, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode,
        parent = node.parentElement;
      if (
        !node.textContent.trim() ||
        parent.closest('app-rigby-encounter,script,style,.visually-hidden,[hidden]') ||
        !parent.checkVisibility()
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if ([...range.getClientRects()].some(overlaps)) bad.push(parent.tagName);
    }
    for (const el of home.querySelectorAll(
      'button,input,textarea,select,form,table,img,svg,video,canvas,a',
    )) {
      if (
        !el.closest('app-rigby-encounter') &&
        el.checkVisibility() &&
        overlaps(el.getBoundingClientRect())
      )
        bad.push(el.tagName);
    }
    return bad;
  });
}
try {
  for (const width of [1440, 390]) {
    const { page, context, errors } = await open(width);
    await begging(page);
    assert.deepEqual(await unobstructed(page), []);
    const start = await state(page);
    await wait(350);
    assert.deepEqual((await state(page)).button, start.button);
    await page.screenshot({ path: `${out}/${width}-begging.png` });
    const visits = [start.position];
    const samples = [];
    for (let feed = 0; feed < 2; feed++) {
      await begging(page);
      const before = await state(page);
      await page.click('.local-biscuit');
      assert.equal(new URL(page.url()).pathname, '/');
      await page.waitForFunction(
        () => document.querySelector('.rover').dataset.pose === 'celebrating',
      );
      for (let n = 0; n < 5; n++) {
        await wait(100);
        const sample = await state(page);
        samples.push(sample);
        assert.equal(sample.position, before.position);
        assert.deepEqual(await unobstructed(page), []);
      }
      if (feed === 0) await page.screenshot({ path: `${out}/${width}-pogo.png` });
      await page.waitForFunction(
        (previous) => {
          const r = document.querySelector('.rover');
          return r.dataset.pose === 'roaming' && r.style.transform !== previous;
        },
        { timeout: 10000 },
        before.position,
      );
      for (let n = 0; n < 3; n++) {
        await wait(70);
        assert.deepEqual(await unobstructed(page), []);
      }
      await begging(page);
      visits.push((await state(page)).position);
    }
    assert(new Set(visits).size >= 2);
    assert(new Set(samples.map((s) => s.frame)).size === 2);
    await page.screenshot({ path: `${out}/${width}-relocated.png` });
    // Entry into an actual JD textarea suppresses the overlay and preserves its position.
    await page.focus('app-thingamajob textarea');
    await wait(100);
    const entry = await state(page);
    await wait(350);
    assert.equal((await state(page)).position, entry.position);
    assert.equal((await state(page)).shown, false);
    await page.$eval('app-thingamajob textarea', (el) => el.blur());
    await page.$eval('#rigby-start', (el) =>
      el.scrollIntoView({ block: 'start', behavior: 'instant' }),
    );
    await begging(page);
    // Pause through keyboard controls, then return to the dog without resetting the pause.
    await page.focus('.controls button[aria-pressed]');
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () =>
        document.querySelector('.controls button[aria-pressed]').getAttribute('aria-pressed') ===
        'true',
    );
    assert.equal(
      await page.$eval('.controls button[aria-pressed]', (el) => el.getAttribute('aria-pressed')),
      'true',
    );
    await page.$eval('#rigby-start', (el) =>
      el.scrollIntoView({ block: 'start', behavior: 'instant' }),
    );
    const paused = await state(page);
    await wait(400);
    assert.deepEqual(await state(page), paused);
    await page.focus('.controls button[aria-pressed]');
    await page.keyboard.press('Space');
    await page.focus('.controls .feed');
    const control = await page.$('.controls .feed');
    for (let n = 0; n < 2; n++) {
      const previous = await page.$eval(
        'app-rigby-encounter [role=status]',
        (el) => el.textContent,
      );
      await page.keyboard.press(n ? 'Space' : 'Enter');
      await page.waitForFunction(
        (previous) =>
          document.querySelector('app-rigby-encounter [role=status]').textContent !== previous,
        {},
        previous,
      );
      assert.equal(await page.evaluate((el) => document.activeElement === el, control), true);
    }
    assert(
      await page.$eval('app-rigby-encounter [role=status]', (el) =>
        el.textContent.includes('biscuit'),
      ),
    );
    assert.equal(await page.$eval('.controls .feed', (el) => el.disabled), false);
    await page.focus(width === 390 ? '.site-header__menu' : '.site-header__group > button');
    await page.keyboard.press('Enter');
    await wait(100);
    const menu = await state(page);
    await wait(250);
    assert.equal((await state(page)).shown, false);
    assert.equal((await state(page)).position, menu.position);
    await page.keyboard.press('Escape');
    await page.addScriptTag({
      content: await readFile('node_modules/axe-core/axe.min.js', 'utf8'),
    });
    const axe = await page.evaluate(async () => {
      const r = await axe.run('app-rigby-encounter');
      return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
    });
    assert.deepEqual(axe, []);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    await page.focus('.controls button:last-of-type');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () =>
        document.querySelector('.controls button:last-of-type').getAttribute('aria-disabled') ===
        'true',
    );
    assert.equal((await state(page)).shown, false);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(() =>
      document.querySelector('.controls button:last-of-type').textContent.includes('dismissed'),
    );
    results.push({
      width,
      visits,
      repeatFeeds: true,
      stationaryBiscuit: true,
      unobstructed: true,
      formSuppression: true,
      menuSuppression: true,
      keyboardPause: true,
      stableKeyboardFeed: true,
      dismissSession: true,
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
    await page.waitForFunction(() => !document.querySelector('.controls .feed').disabled);
    await page.focus('.controls .feed');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    const still = await state(page);
    await wait(500);
    assert.deepEqual(await state(page), still);
    assert.equal(await page.$eval('.controls .feed', (el) => el.disabled), false);
    await page.screenshot({ path: `${out}/390-${media[0].name}.png` });
    results.push({ media: media[0].name, repeatable: true, static: true });
    await context.close();
  }
  await writeFile(`${out}/browser-results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
