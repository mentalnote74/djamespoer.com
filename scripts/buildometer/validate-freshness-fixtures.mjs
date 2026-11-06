import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyProject } from '../../server/buildometer/project.ts';
const out = 'tmp/buildometer/browser-fixtures';
await mkdir(out, { recursive: true });
const base = JSON.parse(await readFile('public/data/buildometer-jira.json', 'utf8'));
applyProject(base, JSON.parse(await readFile('public/data/buildometer-project.json', 'utf8')));
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const receipt = [];
try {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument(() => {
    document.cookie = 'portfolio_cookie_preferences=1.0; Path=/';
    localStorage.setItem('rigby.greeting.seen.v1', '1');
  });
  let fixture = base;
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/api/buildometer')
      return r.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...fixture, generatedAt: new Date().toISOString() }),
      });
    if (u.origin !== 'http://127.0.0.1:4371') return r.abort();
    return r.continue();
  });
  for (const state of ['current', 'old', 'missing', 'invalid']) {
    fixture = structuredClone(base);
    if (state === 'old') {
      Object.assign(fixture.supportingFacts.project, {
        observedAt: '2026-10-19T00:10:06.000Z',
        total: 395,
        shipped: 152,
        remaining: 243,
      });
      fixture.metrics.completion.value = 38.5;
      fixture.metrics.done.value = 152;
      fixture.metrics.remaining.value = 243;
    }
    if (state === 'missing') {
      delete fixture.supportingFacts.project;
      for (const key of ['completion', 'done', 'remaining', 'scopeChange', 'burndown'])
        fixture.metrics[key].value = null;
    }
    if (state === 'invalid') fixture.supportingFacts.project.observedAt = 'not-a-date';
    await p.goto('http://127.0.0.1:4371/buildometer', { waitUntil: 'networkidle0' });
    await p.waitForSelector('app-progress-observation');
    await new Promise((r) => setTimeout(r, 250));
    const inspect = () =>
      p.$eval('app-buildometer-dashboard .instrument--primary', (n) => ({
        text: n.textContent,
        date: n.querySelector('time')?.dateTime ?? null,
      }));
    const before = await inspect();
    if (state === 'current') {
      assert(before.text.includes('41.3%'));
      assert(before.text.includes('Reconciled through'));
      assert.equal(before.date, base.supportingFacts.project.observedAt);
    } else if (state === 'old') {
      assert(before.text.includes('38.5%'));
      assert(before.text.includes('Newer production release'));
      assert.equal(before.date, '2026-10-19T00:10:06.000Z');
    } else {
      assert(before.text.includes('Progress observation unavailable.'));
      assert.equal(before.date, null);
      assert(!before.text.includes('0%'));
    }
    await p.reload({ waitUntil: 'networkidle0' });
    const after = await inspect();
    assert.equal(after.date, before.date);
    await p.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
    const axe = await p.evaluate(() =>
      axe.run(document.querySelector('app-buildometer-dashboard')),
    );
    assert.equal(axe.violations.length, 0);
    await p.screenshot({ path: `${out}/${state}-390.png`, fullPage: false });
    receipt.push({ state, date: after.date, axe: 0, reloadPreservesObservation: true });
  }
  await writeFile(out + '/receipt.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await b.close();
}
