// SCRUM-184 joint local-artifact verification. No production deployment or collector traffic.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const out = 'tmp/scrum-184';
await mkdir(out, { recursive: true });
const djp = resolve('dist/djamespoer/browser'),
  swv = resolve(process.env.SWV_DIST || 'C:/Dev/shadywhitevan.rocks/dist');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon',
};
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const receipt = {
  parent: [],
  child: [],
  mode: 'Local built artifacts at intercepted virtual production origins; all collector traffic blocked. Positive parent cases explicitly use a memory-only gtag stub after an INTERNAL bootstrap.',
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function profile({
  positive = false,
  denied = false,
  childConsent = null,
  region = 'US',
  fixture = null,
  width = 1440,
} = {}) {
  const context = await browser.createBrowserContext(),
    p = await context.newPage();
  await p.setViewport({ width, height: 950 });
  const requests = [],
    issues = [];
  const cdp = await p.createCDPSession();
  await cdp.send('Audits.enable');
  cdp.on('Audits.issueAdded', (e) => issues.push(e.issue.code));
  await p.evaluateOnNewDocument(
    ({ denied, childConsent, negativeFixture }) => {
      if (
        negativeFixture ||
        ['djamespoer.com', 'shadywhitevan.rocks'].includes(location.hostname)
      ) {
        localStorage.setItem('portfolio.analytics.internal', '1');
        localStorage.setItem('rigby.greeting.seen.v1', '1');
      }
      if (
        location.hostname === 'djamespoer.com' &&
        denied &&
        !document.cookie.includes('portfolio_analytics_consent=')
      )
        document.cookie = 'portfolio_analytics_consent=denied;Path=/';
      if (location.hostname === 'shadywhitevan.rocks' && childConsent)
        localStorage.setItem('swv-analytics-consent', childConsent);
    },
    { denied, childConsent, negativeFixture: process.env.SCRUM_184_NEGATIVE_FIXTURE === '1' },
  );
  await p.setRequestInterception(true);
  p.on('request', async (req) => {
    const u = new URL(req.url());
    requests.push({ url: u.href, frame: req.frame()?.url() ?? '', type: req.resourceType() });
    try {
      if (
        /googletagmanager|google-analytics|cloudflareinsights/.test(u.hostname) ||
        u.pathname === '/cdn-cgi/rum'
      ) {
        await req.respond({ status: 200, contentType: 'text/javascript', body: '' });
        return;
      }
      if (u.pathname === '/cdn-cgi/trace') {
        await req.respond({ status: 200, contentType: 'text/plain', body: `loc=${region}\n` });
        return;
      }
      if (!['djamespoer.com', 'shadywhitevan.rocks'].includes(u.hostname)) {
        await req.abort();
        return;
      }
      if (u.hostname === 'djamespoer.com' && fixture && req.isNavigationRequest()) {
        await req.respond({
          status: 200,
          contentType: 'text/html',
          body: `<!doctype html><html><head><title>Controlled framed SWV</title></head><body><iframe title="SWV test" src="${fixture}" width="900" height="300"></iframe></body></html>`,
        });
        return;
      }
      const root = u.hostname === 'djamespoer.com' ? djp : swv;
      let path = resolve(root, '.' + decodeURIComponent(u.pathname));
      assert(path === root || path.startsWith(root + sep));
      let body;
      for (const candidate of [path, resolve(path, 'index.html'), resolve(root, 'index.html')]) {
        try {
          body = await readFile(candidate);
          path = candidate;
          break;
        } catch {}
      }
      if (!body) {
        await req.respond({ status: 404, body: '' });
        return;
      }
      if (u.hostname === 'djamespoer.com' && extname(path) === '.html') {
        // Dedicated positive analytics exception: tag bootstrap sees INTERNAL first;
        // only then unmark this isolated virtual-origin profile for a memory stub.
        body = Buffer.from(
          body
            .toString('utf8')
            .replace(
              '</body>',
              `<script>window.__qaEvents=[];window.gtag=(...args)=>window.__qaEvents.push(args);${positive ? "localStorage.removeItem('portfolio.analytics.internal');" : ''}</script></body>`,
            ),
        );
      }
      await req.respond({
        status: 200,
        contentType: mime[extname(path)] ?? 'application/octet-stream',
        body,
      });
    } catch (e) {
      await req.abort().catch(() => {});
      console.error('fixture request failed', u.pathname, e.message);
    }
  });
  return { context, p, requests, issues };
}
const events = async (p) => p.evaluate(() => window.__qaEvents.filter((e) => e[0] === 'event'));
const count = async (p, name) => (await events(p)).filter((e) => e[1] === name).length;
async function showVan(p) {
  for (let i = 0; i < 16; i++) {
    if (await p.$('.carousel__slide[data-slide-id="shady-white-van"]:not([aria-hidden="true"])'))
      return;
    await p.$eval('button[aria-label="Next slide"]', (n) => n.click());
    await delay(35);
  }
  throw Error('No SWV slide');
}
try {
  for (const spec of [
    { name: 'allowed-desktop', positive: true, width: 1440 },
    { name: 'allowed-mobile', positive: true, width: 390 },
    { name: 'saved-denial', positive: true, denied: true },
    { name: 'internal', positive: false },
  ]) {
    const { context, p, requests, issues } = await profile(spec);
    await p.goto('https://djamespoer.com/', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('app-swv-slide iframe');
    await p.evaluate(() =>
      document.querySelector('button[aria-label="Pause automatic slide rotation"]')?.click(),
    );
    let loadedChild;
    for (let tries = 0; tries < 100; tries++) {
      loadedChild = p.frames().find((f) => f.url().startsWith('https://shadywhitevan.rocks'));
      if (loadedChild && (await loadedChild.$('#swv-embed-stage'))) break;
      await delay(50);
    }
    assert(loadedChild, 'Child must load before lifecycle checks');
    await loadedChild.waitForFunction(
      () =>
        document.readyState === 'complete' &&
        Math.abs(
          document.querySelector('#swv-embed-stage')?.getBoundingClientRect().top ?? Infinity,
        ) < 1,
    );
    await loadedChild.evaluate(() => document.fonts.ready);
    const childDocumentToken = await loadedChild.evaluate(
      () => (window.__qaDocumentToken = crypto.randomUUID()),
    );
    await p.waitForNetworkIdle({ idleTime: 250 });

    const frame = await p.$('app-swv-slide iframe'),
      src = await frame.evaluate((n) => n.src);
    assert.equal(
      src,
      'https://shadywhitevan.rocks/?embed_source=djamespoer.com&embed_surface=home-carousel#swv-embed-stage',
    );
    assert.equal(await count(p, 'carousel_exposure'), 0);
    assert.equal(await count(p, 'page_view'), spec.positive && !spec.denied ? 1 : 0);
    await p.evaluate(() => {
      window.__frame = document.querySelector('app-swv-slide iframe');
      window.__child = window.__frame.contentWindow;
      scrollTo(0, document.body.scrollHeight);
    });
    await showVan(p);
    await delay(100);
    assert(
      await p.$eval('.swv-scene', (n) => n.getBoundingClientRect().bottom <= 0),
      'Offscreen check requires actual offscreen geometry',
    );
    assert.equal(await count(p, 'carousel_exposure'), 0);
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForFunction(
      () =>
        document
          .querySelector('.carousel__slide[data-slide-id="shady-white-van"]')
          ?.getAttribute('aria-hidden') !== 'true',
    );
    await delay(150);
    assert.equal(
      await p.evaluate(() => localStorage.getItem('portfolio.analytics.internal')),
      spec.positive ? null : '1',
      'Fixture must not re-mark a positive parent through inherited about:blank storage',
    );
    let expected = spec.positive && !spec.denied ? 1 : 0;
    assert.equal(await count(p, 'carousel_exposure'), expected);
    if (spec.denied) {
      await p.evaluate(() => {
        document.cookie = 'portfolio_analytics_consent=granted;Path=/';
        dispatchEvent(new Event('portfolio-analytics-change'));
      });
      await p.waitForFunction(() => window.__qaEvents.some((e) => e[1] === 'carousel_exposure'));
      expected = 1;
    }
    for (let i = 0; i < 2; i++) {
      await p.$eval('button[aria-label="Next slide"]', (n) => n.click());
      await delay(35);
      await showVan(p);
      await p.evaluate(() => {
        scrollTo(0, document.body.scrollHeight);
      });
      await delay(50);
      await p.evaluate(() => {
        scrollTo(0, 0);
        dispatchEvent(new Event('portfolio-analytics-change'));
      });
      await delay(100);
    }
    assert.equal(await count(p, 'carousel_exposure'), expected);
    assert(
      await p.evaluate(
        () =>
          document.querySelector('app-swv-slide iframe') === window.__frame &&
          window.__frame.contentWindow === window.__child,
      ),
    );
    assert.equal(await frame.evaluate((n) => n.src), src);
    assert.equal(
      await loadedChild.evaluate(() => window.__qaDocumentToken),
      childDocumentToken,
      'Carousel cycles must retain the child document',
    );
    assert.equal(
      requests.filter(
        (r) => r.type === 'document' && r.url.startsWith('https://shadywhitevan.rocks/'),
      ).length,
      1,
      'One child navigation before explicit route changes',
    );
    if (spec.name === 'allowed-desktop') {
      await p.click('app-swv-slide a');
      await p.waitForFunction(() => location.pathname === '/case-studies/shady-white-van');
      await p.waitForSelector('app-swv-slide iframe');
      assert(
        (await p.$eval('app-swv-slide iframe', (n) => n.src)).includes(
          'embed_surface=project-hero',
        ),
      );
      const heroChild = await p.waitForFrame((f) =>
        f.url().startsWith('https://shadywhitevan.rocks/'),
      );
      await heroChild.waitForFunction(
        () =>
          document.readyState === 'complete' &&
          Math.abs(
            document.querySelector('#swv-embed-stage')?.getBoundingClientRect().top ?? Infinity,
          ) < 1,
      );
      await p.waitForNetworkIdle({ idleTime: 250 });
      const selector = 'main a[href="https://shadywhitevan.rocks/"]';
      await p.$eval(selector, (n) => n.addEventListener('click', (e) => e.preventDefault()));
      await p.focus(selector);
      assert(await p.$eval(selector, (n) => document.activeElement === n));
      await p.keyboard.press('Enter');
      assert.equal(await count(p, 'external_project_click'), 1);
      assert.equal(await count(p, 'carousel_cta_click'), 1);
      await p.goBack();
      await p.waitForFunction(() => location.pathname === '/');
      await p.waitForSelector('app-swv-slide iframe');
      await showVan(p);
      await p.evaluate(() => scrollTo(0, 0));
      await delay(100);
      assert.equal(await count(p, 'carousel_exposure'), 1);
      assert.equal(await count(p, 'page_view'), 3);
    }
    let children = p.frames().filter((f) => f.url().startsWith('https://shadywhitevan.rocks'));
    for (const child of children) {
      const cookies = await child.evaluate(() => document.cookie);
      assert(!/(?:^|;\s*)_ga(?:=|_)/.test(cookies));
    }
    const childGa = requests.filter((r) => /googletagmanager|google-analytics/.test(r.url));
    assert.deepEqual(childGa, []);
    assert(!issues.includes('CookieIssue'));
    receipt.parent.push({
      name: spec.name,
      events: await events(p),
      stableUrl: src,
      childGaRequests: childGa.length,
      cookieIssues: issues.filter((x) => x === 'CookieIssue').length,
    });
    await writeFile(`${out}/joint-browser.json`, JSON.stringify(receipt, null, 2));
    console.log('PASS parent', spec.name);
    await context.close();
  }
  // Child standalone behavior is exercised only against local built artifacts;
  // any expected GA script is intercepted, never downloaded or collected.
  for (const spec of [
    { name: 'standalone-granted', consent: 'granted', ga: 1 },
    { name: 'standalone-denied', consent: 'denied', ga: 0 },
    {
      name: 'standalone-embed-labels',
      consent: 'granted',
      ga: 1,
      query: '?embed_source=djamespoer.com&embed_surface=home-carousel',
    },
    { name: 'standalone-US-unset', region: 'US', ga: 1 },
    { name: 'standalone-GB-unset', region: 'GB', ga: 0 },
    { name: 'embedded-legacy', framed: true, consent: 'granted', ga: 0 },
    {
      name: 'embedded-unrecognized',
      framed: true,
      consent: 'granted',
      ga: 0,
      query: '?embed_source=unknown&embed_surface=unknown',
    },
  ]) {
    const url =
      'https://shadywhitevan.rocks/' + (spec.query ?? '') + (spec.framed ? '#swv-embed-stage' : '');
    const { context, p, requests } = await profile({
      childConsent: spec.consent ?? null,
      region: spec.region ?? 'US',
      fixture: spec.framed ? url : null,
    });
    await p.goto(spec.framed ? 'https://djamespoer.com/fixture' : url, {
      waitUntil: 'networkidle0',
    });
    await delay(300);
    const ga = requests.filter((r) => r.url.includes('googletagmanager.com/gtag/js'));
    assert.equal(ga.length, spec.ga, spec.name);
    receipt.child.push({ name: spec.name, gaScriptRequests: ga.length, allIntercepted: true });
    console.log('PASS child', spec.name);
    await context.close();
  }
  const { context, p, requests } = await profile({
    childConsent: 'denied',
    fixture: 'https://shadywhitevan.rocks/cookies/',
  });
  await p.goto('https://djamespoer.com/fixture', { waitUntil: 'networkidle0' });
  const child = p.frames().find((f) => f.url().startsWith('https://shadywhitevan.rocks'));
  await child.waitForSelector('button');
  const buttons = await child.$$('button');
  let changed = false;
  for (const button of buttons) {
    if ((await button.evaluate((n) => n.textContent)).includes('Turn it on')) {
      await button.click();
      changed = true;
      break;
    }
  }
  assert(changed);
  await delay(200);
  assert.equal(
    await child.evaluate(() => localStorage.getItem('swv-analytics-consent')),
    'granted',
  );
  assert.equal(requests.filter((r) => /googletagmanager|google-analytics/.test(r.url)).length, 0);
  receipt.child.push({
    name: 'embedded-later-consent-grant',
    gaScriptRequests: 0,
    consentSaved: true,
  });
  await context.close();
  await writeFile(`${out}/joint-browser.json`, JSON.stringify(receipt, null, 2));
  console.log('PASS embedded later grant; joint browser complete');
} finally {
  await browser.close();
}
