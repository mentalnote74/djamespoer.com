// Controlled production-host simulation: all requests are intercepted; no public analytics.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('dist/djamespoer/browser'),
  out = resolve('tmp/resume-release/browser');
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const receipt = { checks: [], downloads: [], pageErrors: [], axe: [] };
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};
const hash = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => {
    document.cookie = 'portfolio_analytics_consent=granted; Path=/; Secure';
    document.cookie = 'portfolio_cookie_preferences=1.0; Path=/; Secure';
    localStorage.setItem('rigby.greeting.seen.v1', '1');
  });
  page.on('pageerror', (e) => receipt.pageErrors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    try {
      const u = new URL(req.url());
      if (u.hostname === 'www.googletagmanager.com')
        return req.respond({
          status: 200,
          contentType: 'text/javascript',
          body: `(()=>{window.__qaEvents=[];const apply=a=>{a=Array.from(a);if(a[0]==='event')window.__qaEvents.push(a);if(a[0]==='get')a[3]('1234567890')};const q=window.dataLayer??[];window.gtag=(...a)=>apply(a);q.forEach(apply)})()`,
        });
      if (u.origin !== 'https://djamespoer.com' || u.pathname.startsWith('/test/'))
        return req.abort();
      let name = resolve(root, '.' + decodeURIComponent(u.pathname));
      if (!extname(name)) name = resolve(name, 'index.html');
      let body;
      try {
        body = await readFile(name);
      } catch {
        body = await readFile(resolve(root, 'index.html'));
        name = 'index.html';
      }
      return req.respond({
        status: 200,
        contentType: mime[extname(name)] ?? 'application/octet-stream',
        body,
      });
    } catch {
      if (!req.isInterceptResolutionHandled()) await req.abort();
    }
  });
  const load = async () => {
    await page.goto('https://djamespoer.com/resume', { waitUntil: 'networkidle0' });
    await page.waitForSelector('app-resume a');
    await page.waitForFunction(() => Array.isArray(window.__qaEvents), { timeout: 15000 });
  };
  const events = () => page.evaluate(() => window.__qaEvents ?? []);
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000 });
    await load();
    const choices = await page.$$eval('app-resume a', (as) =>
      as.map((a) => ({
        label: a.querySelector('strong').textContent,
        href: a.getAttribute('href'),
        download: a.hasAttribute('download'),
      })),
    );
    assert.deepEqual(choices, [
      {
        label: 'Full career history',
        href: '/assets/resume/d-james-poer-comprehensive.pdf',
        download: true,
      },
      { label: 'Modern/general', href: '/assets/resume/d-james-poer-resume.pdf', download: true },
      { label: 'Custom for a job', href: '/thingamajob', download: false },
    ]);
    assert.equal(await page.$$eval('main', (n) => n.length), 1);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
    const axe = await page.evaluate(() => axe.run(document.querySelector('app-resume')));
    assert.equal(axe.violations.length, 0);
    receipt.axe.push({ width, violations: 0 });
    await page.screenshot({ path: resolve(out, `selector-${width}.png`), fullPage: true });
    const links = await page.$$('app-resume a');
    await links[0].focus();
    await page.keyboard.press('Tab');
    assert(await links[1].evaluate((n) => n === document.activeElement));
    await page.keyboard.press('Tab');
    assert(await links[2].evaluate((n) => n === document.activeElement));
    receipt.checks.push(
      `${width}px: three native choices, one main, no overflow, Tab order, axe 0`,
    );
  }
  const cdp = await browser.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: out,
    eventsEnabled: true,
  });
  const complete = () =>
    new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error('Download timeout')), 12000);
      const cb = (e) => {
        if (e.state === 'completed') {
          clearTimeout(timer);
          cdp.off('Browser.downloadProgress', cb);
          res();
        }
      };
      cdp.on('Browser.downloadProgress', cb);
    });
  for (const [index, name, id] of [
    [0, 'd-james-poer-comprehensive.pdf', 'public-comprehensive'],
    [1, 'd-james-poer-resume.pdf', 'public-current'],
  ]) {
    const links = await page.$$('app-resume a');
    const done = complete();
    if (index === 1) {
      await links[index].focus();
      await page.keyboard.press('Enter');
    } else await links[index].click();
    await done;
    await sleep(250);
    const actual = await readFile(resolve(out, name)),
      expected = await readFile(resolve('public/assets/resume', name));
    assert.equal(hash(actual), hash(expected));
    const matching = (await events()).filter(
      (e) => e[1] === 'resume_download' && e[2].resume_id === id,
    );
    assert.equal(matching.length, 1);
    assert.equal(matching[0][2].asset_name, id);
    receipt.downloads.push({
      name,
      sha256: hash(actual),
      eventCount: 1,
      input: index ? 'keyboard' : 'pointer',
    });
  }
  const links = await page.$$('app-resume a');
  await links[2].focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('app-thingamajob-product');
  assert.equal(new URL(page.url()).pathname, '/thingamajob');
  assert.equal((await events()).filter((e) => e[1] === 'thingamajob_open').length, 1);
  receipt.checks.push(
    'Custom keyboard activation navigates directly to existing Thingamajob; one event',
  );
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('https://djamespoer.com/about', { waitUntil: 'networkidle0' });
  await page.click('button[aria-controls="about-navigation"]');
  await page.focus('#about-navigation a[href="/resume"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('app-resume');
  receipt.checks.push('Header entry activates selector by keyboard');
  await page.setViewport({ width: 390, height: 1000 });
  await page.goto('https://djamespoer.com/about', { waitUntil: 'networkidle0' });
  await page.click('button[aria-controls="primary-navigation"]');
  await page.click('button[aria-controls="about-navigation"]');
  await page.click('#about-navigation a[href="/resume"]');
  await page.waitForSelector('app-resume');
  receipt.checks.push('Mobile menu entry activates selector by pointer');
  assert.deepEqual(receipt.pageErrors, []);
  await writeFile(resolve(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
}
