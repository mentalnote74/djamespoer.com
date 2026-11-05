// Controlled production-host simulation. Every request is intercepted; nothing reaches GA or a Worker.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist/djamespoer/browser');
const evidence = resolve('tmp/scrum-169-141-browser');
await mkdir(evidence, { recursive: true });
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--disable-background-networking'],
});
const receipt = { checks: [], events: [], blockedExternal: 0, pageErrors: [] };
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};
const shim = `(()=>{const queue=window.dataLayer??[];const apply=(args)=>{args=Array.from(args);if(args[0]==='get'){args[3](sessionStorage.getItem('qa.ga.session')??'1234567890');return;}if(args[0]==='event')window.__qaEvents.push(args);};window.__qaEvents=[];window.gtag=(...args)=>apply(args);for(const args of queue)apply(args);})()`;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', (error) => receipt.pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url());
      if (url.hostname === 'www.googletagmanager.com')
        return request.respond({ status: 200, contentType: 'text/javascript', body: shim });
      if (url.origin !== 'https://djamespoer.com') {
        receipt.blockedExternal++;
        return request.abort();
      }
      if (url.pathname.startsWith('/test/thingamajob/')) {
        if (url.pathname.endsWith('/jd-input'))
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              method: 'text',
              sourceLabel: 'Fictional fixture',
              jobDescription: 'Fictional normalized job description.',
              notices: [],
              removedLines: 0,
              originalCharacters: 40,
            }),
          });
        if (url.pathname.endsWith('/evaluate'))
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              state: 'complete',
              summary: 'Fictional evaluation result for local QA only.',
              evaluationId: 'fixture',
              evaluatedAt: '2026-11-05',
            }),
          });
        return request.respond({ status: 200, contentType: 'application/json', body: '{}' });
      }
      let filename = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!filename.startsWith(root)) return request.abort();
      if (!extname(filename)) filename = resolve(filename, 'index.html');
      let body;
      try {
        body = await readFile(filename);
      } catch {
        body = await readFile(resolve(root, 'index.html'));
        filename = 'index.html';
      }
      return request.respond({
        status: 200,
        contentType: mime[extname(filename)] ?? 'application/octet-stream',
        body,
      });
    } catch {
      if (!request.isInterceptResolutionHandled()) await request.abort();
    }
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const events = () => page.evaluate(() => window.__qaEvents ?? []);
  const clickText = async (text, keyboard = false) => {
    const handles = await page.$$('button,summary,a');
    let target;
    for (const h of handles) {
      if ((await h.evaluate((n) => n.textContent.trim())) === text) {
        const box = await h.boundingBox();
        if (box) {
          target = h;
          break;
        }
      }
    }
    assert(target, `Visible control: ${text}`);
    await target.evaluate((n) => n.scrollIntoView({ block: 'center' }));
    if (keyboard) {
      await target.focus();
      await page.keyboard.press('Enter');
    } else await target.click();
    await wait(180);
  };
  const jar = async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(350);
    await clickText('Cookie Jar');
    await page.waitForSelector('app-cookie-preferences dialog[open]');
  };
  const load = async (path = '/about') => {
    await page.goto('https://djamespoer.com' + path, { waitUntil: 'networkidle0' });
    await wait(400);
  };
  await load();
  assert.equal((await events()).length, 0);
  receipt.checks.push('fresh browser: no analytics queue/tag without consent');
  // Acknowledged fun choices suppress the unrelated first-visit dialog; no tracking consent implied.
  await page.evaluate(() => {
    document.cookie = 'portfolio_cookie_preferences=1.0; Path=/; Secure';
    localStorage.setItem('rigby.greeting.seen.v1', '1');
  });
  await load();
  await jar();
  const nav = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await clickText('Allow analytics');
  await nav;
  await wait(600);
  assert((await events()).some((e) => e[1] === 'page_view'));
  receipt.checks.push('explicit consent starts exactly controlled local GA shim');
  // Save an existing opt-in without a greeting, to exercise the companion and native controls.
  await page.evaluate(() => localStorage.setItem('rigby.enabled.v1', 'on'));
  await load();
  await page.waitForSelector('app-rigby-guide .companion:not(.hidden)', { timeout: 15000 });
  await wait(400);
  assert.equal(
    (await events()).filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'shown').length,
    1,
  );
  receipt.checks.push('visible Rigby exposure emitted once');
  await clickText("Rigby's Doghouse");
  await page.evaluate(() => sessionStorage.setItem('qa.ga.session', '1234567891'));
  await clickText('Sit');
  await clickText('Shake', true);
  await clickText('Feed Rigby a biscuit', true);
  let e = await events();
  assert.equal(e.filter((e) => e[1] === 'rigby_play' && e[2].action === 'sit').length, 1);
  assert.equal(e.filter((e) => e[1] === 'rigby_play' && e[2].action === 'shake').length, 1);
  assert.equal(e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'fed').length, 1);
  assert.equal(
    e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'shown').length,
    2,
    'new native GA session gets a new visible denominator after meaningful activity',
  );
  receipt.checks.push('pointer Sit and keyboard Shake/feed: one action emission each');
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(300);
  const cookie = await page.$('app-hidden-cookie button');
  assert(cookie);
  await cookie.evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await cookie.focus();
  await page.keyboard.press('Enter');
  await wait(300);
  e = await events();
  assert.equal(e.filter((e) => e[1] === 'rigby_cookie' && e[2].action === 'collected').length, 1);
  assert.equal(e.filter((e) => e[1] === 'rigby_cookie' && e[2].action === 'fed').length, 1);
  receipt.checks.push('keyboard cookie discovery and successful delivery separated');
  await clickText('Turn Rigby off', true);
  e = await events();
  assert.equal(
    e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'dismissed').length,
    1,
  );
  receipt.events.push(...e);
  await load();
  e = await events();
  assert.equal(
    e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'saved_off').length,
    1,
  );
  assert.equal(
    e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'dismissed').length,
    0,
  );
  receipt.checks.push('saved-off reload is not another dismissal');
  await jar();
  await clickText('Play with Rigby', true);
  await wait(400);
  e = await events();
  assert.equal(
    e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'brought_back').length,
    1,
  );
  assert.equal(
    e.filter((e) => e[1] === 'rigby_encounter' && e[2].action === 'shown').length,
    0,
    'native-session exposure dedup across reload/bring-back',
  );
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('rigby.cookie-jar.v1')).collected.includes('about'),
    ),
    true,
  );
  receipt.checks.push(
    'explicit bring-back emitted once; exposure and saved progress survive reload without new collection',
  );
  // Close the greeting using the existing play control, then inspect changed settings with axe.
  const greeting = await page.$('app-rigby-greeting dialog[open]');
  if (greeting) {
    await clickText('Do you want to play with me?', true);
    await wait(3400);
  }
  await jar();
  await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
  const axe = await page.evaluate(
    async () =>
      await axe.run(document.querySelector('app-cookie-preferences dialog'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      }),
  );
  receipt.axe = axe.violations.map((v) => ({ id: v.id, impact: v.impact }));
  assert.equal(receipt.axe.length, 0);
  await page.screenshot({ path: resolve(evidence, 'settings-desktop.png') });
  await page.setViewport({ width: 390, height: 844 });
  await wait(300);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: resolve(evidence, 'settings-mobile.png') });
  receipt.checks.push('settings desktop/mobile reflow and scoped axe zero');
  await clickText('Internal browser setting');
  let reload = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await clickText('Mark this browser as internal', true);
  await reload;
  await wait(400);
  assert.equal((await events()).length, 0);
  await load('/engineering');
  await clickText("Rigby's Doghouse");
  await clickText('Sit', true);
  assert.equal((await events()).length, 0);
  receipt.checks.push(
    'internal marking suppresses page views/custom events across navigation and reload',
  );
  await jar();
  await clickText('Internal browser setting');
  reload = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await clickText('Unmark this internal browser', true);
  await reload;
  await wait(8500);
  assert((await events()).some((e) => e[1] === 'page_view'));
  receipt.checks.push('unmark restores collection while keeping consent/Rigby/progress');
  await jar();
  reload = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await clickText('Do not allow analytics', true);
  await reload;
  assert.equal((await events()).length, 0);
  receipt.checks.push('revocation reload stops collection');
  await jar();
  reload = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await clickText('Allow analytics');
  await reload;
  await load('/thingamajob');
  await wait(8500);
  await page.waitForSelector('app-jd-evaluation textarea');
  await page.type(
    'app-jd-evaluation textarea',
    'Fictional complete job description for controlled local analytics validation.',
  );
  await clickText('Evaluate', true);
  await page.waitForSelector('.evaluation-summary');
  await wait(600);
  e = await events();
  for (const name of [
    'evaluation_submitted',
    'evaluation_input_prepared',
    'evaluation_completed',
    'evaluation_result_viewed',
  ])
    assert.equal(e.filter((e) => e[1] === name).length, 1, name);
  assert(!JSON.stringify(e).match(/Fictional|fixture|job description/));
  receipt.events.push(...e);
  receipt.checks.push(
    'fictional intake/evaluation/result-view: one emission each, no private input',
  );
  assert.equal(receipt.pageErrors.length, 0);
  console.log(
    JSON.stringify(
      {
        checks: receipt.checks,
        axe: receipt.axe,
        events: receipt.events.length,
        pageErrors: receipt.pageErrors,
      },
      null,
      2,
    ),
  );
} finally {
  await writeFile(resolve(evidence, 'validation.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
}
