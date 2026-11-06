import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve('tmp/buildometer/browser');
await mkdir(out, { recursive: true });
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const projection = JSON.parse(await readFile('public/data/buildometer-project.json', 'utf8'));
const current = projection.observations.at(-1);
const percent = Math.round((current.shipped / current.total) * 1000) / 10;
const status =
  Date.parse(projection.latestEligibleReleaseAt) > Date.parse(projection.observedAt)
    ? 'Newer production release awaits reconciliation.'
    : 'Reconciled through the latest recorded eligible release.';
const result = { checks: [], axe: [], errors: [], externalRequests: 0 };
try {
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('portfolio.analytics.internal', '1');
    document.cookie = 'portfolio_cookie_preferences=1.0; Path=/';
    localStorage.setItem('rigby.greeting.seen.v1', '1');
  });
  p.on('pageerror', (e) => result.errors.push(e.message));
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    if (new URL(r.url()).origin !== 'http://127.0.0.1:4371') {
      result.externalRequests++;
      r.abort();
    } else r.continue();
  });
  let homeDate;
  for (const width of [1440, 390]) {
    await p.setViewport({ width, height: 1000 });
    await p.goto('http://127.0.0.1:4371/', { waitUntil: 'networkidle0' });
    await p.waitForSelector('app-buildometer-teaser');
    await p.$eval('app-buildometer-teaser', (n) => n.scrollIntoView());
    await p.waitForSelector('app-buildometer-teaser app-progress-observation time');
    const home = await p.$eval('app-buildometer-teaser', (n) => ({
      text: n.textContent,
      date: n.querySelector('time').dateTime,
    }));
    homeDate = home.date;
    assert.equal(homeDate, projection.observedAt);
    assert(home.text.includes(percent + '%'));
    assert(home.text.includes(current.shipped + ' / ' + current.total));
    assert(home.text.includes(status));
    await p.screenshot({ path: resolve(out, `home-${width}.png`), fullPage: false });
    await p.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
    let axe = await p.evaluate(() => axe.run(document.querySelector('app-buildometer-teaser')));
    assert.equal(axe.violations.length, 0);
    result.axe.push({ surface: 'home', width, violations: 0 });
    await p.goto('http://127.0.0.1:4371/buildometer', { waitUntil: 'networkidle0' });
    await p.waitForSelector('app-buildometer-dashboard app-progress-observation time');
    const full = await p.$eval('app-buildometer-dashboard', (n) => ({
      text: n.textContent,
      date: n.querySelector('app-progress-observation time').dateTime,
    }));
    assert.equal(full.date, homeDate);
    assert(full.text.includes(percent + '%'));
    assert(full.text.includes(current.shipped + ' / ' + current.total));
    assert(full.text.includes('Last fetched'));
    assert(full.text.includes(status));
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
    axe = await p.evaluate(() => axe.run(document.querySelector('app-buildometer-dashboard')));
    assert.equal(axe.violations.length, 0);
    result.axe.push({ surface: 'dashboard', width, violations: 0 });
    await p.focus('#buildometer-skin');
    await p.keyboard.press('w');
    await p.keyboard.press('Enter');
    await p.select('#buildometer-skin', 'workshop');
    await p.waitForSelector('[data-skin="workshop"]');
    await p.keyboard.press('Escape');
    assert.equal(await p.$eval('app-progress-observation time', (n) => n.dateTime), homeDate);
    await p.screenshot({ path: resolve(out, `dashboard-${width}.png`), fullPage: false });
    await (
      await p.$('.instrument--primary')
    ).screenshot({ path: resolve(out, `completion-${width}.png`) });
    result.checks.push(
      `${width}: home/dashboard same approved observation, numerator/denominator, correct release-based freshness status; no overflow; keyboard skin change preserves data`,
    );
  }
  assert.deepEqual(result.errors, []);
  await writeFile(resolve(out, 'receipt.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await b.close();
}
