import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCoffee } from './coffee.ts';
import {
  normalizeSiteUrl,
  coffeeTally,
  coffeeVerdict,
} from '../../src/app/features/coffee/coffee-contract.ts';

const psi = (scores) => ({
  lighthouseResult: {
    fetchTime: '2026-11-23T15:00:00.000Z',
    categories: {
      performance: { score: scores[0] },
      accessibility: { score: scores[1] },
      'best-practices': { score: scores[2] },
      seo: { score: scores[3] },
    },
  },
});
const post = (body, headers = {}) =>
  new Request('https://djamespoer.com/api/coffee', {
    method: 'POST',
    headers: { Origin: 'https://djamespoer.com', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const deps = (respond, calls = []) => ({
  timeoutMs: 1000,
  fetch: async (url) => {
    const u = new URL(url);
    calls.push(u);
    return respond(u.searchParams.get('url'), u.searchParams.get('strategy'));
  },
});
const SELF = 'https://djamespoer.com/';
const site = (mobile, desktop) => ({
  mobile: mobile && { scores: mobile },
  desktop: desktop && { scores: desktop },
});
const s = (p, a, b, o) => ({ performance: p, accessibility: a, bestPractices: b, seo: o });

test('URL rules accept public sites and reject private, IP, port and credential targets', () => {
  assert.deepEqual(normalizeSiteUrl(' Acme-Widgets.com/pricing?a=1#top '), {
    ok: true,
    url: 'https://acme-widgets.com/pricing?a=1',
    host: 'acme-widgets.com',
  });
  for (const bad of [
    '',
    'ftp://acme.com',
    'javascript:alert(1)',
    'localhost',
    'printer.local',
    'https://127.0.0.1',
    'http://2130706433',
    'http://[::1]/',
    'https://user:pw@acme.com',
    'https://acme.com:8080',
    'acme.test',
  ])
    assert.equal(normalizeSiteUrl(bad).ok, false, bad);
});

test('verdict is a head-to-head tally of 8 matchups, never an average', () => {
  const james = site(s(87, 100, 100, 100), s(97, 100, 100, 100));
  const visitor = site(s(58, 88, 96, 91), s(81, 100, 96, 91));
  const tally = coffeeTally(visitor, james);
  assert.deepEqual(tally, { visitor: 0, james: 7, tied: 1, scored: 8, total: 8 });
  assert.equal(coffeeVerdict(tally), 'visitor_buys');
  assert.equal(coffeeVerdict(coffeeTally(james, visitor)), 'james_buys');
  assert.equal(coffeeVerdict(coffeeTally(james, james)), 'tie');
  assert.equal(coffeeTally(site(null, s(81, 100, 96, 91)), james).scored, 4);
  assert.equal(coffeeVerdict(coffeeTally(visitor, null)), 'no_verdict');
});

test('a challenge runs mobile and desktop for both sites in parallel; scores only', async () => {
  const calls = [];
  const res = await handleCoffee(
    post({ url: 'acme.com' }),
    { PAGESPEED_API_KEY: 'test-only' },
    deps(
      (url, strategy) =>
        Response.json(
          psi(
            url === SELF
              ? [0.9, 1, 1, 1]
              : strategy === 'mobile'
                ? [0.58, 0.88, 0.96, 0.91]
                : [0.81, 1, 0.96, 0.91],
          ),
        ),
      calls,
    ),
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.mode, 'challenge');
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map((c) => c.searchParams.get('strategy')).sort(), [
    'desktop',
    'desktop',
    'mobile',
    'mobile',
  ]);
  for (const call of calls)
    assert.deepEqual(call.searchParams.getAll('category'), [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
    ]);
  assert.deepEqual(body.visitor.mobile.scores, s(58, 88, 96, 91));
  assert.deepEqual(body.visitor.desktop.scores, s(81, 100, 96, 91));
  assert.match(body.visitor.desktop.reportUrl, /form_factor=desktop$/);
  assert.equal(body.james.host, 'djamespoer.com');
  assert.ok(!JSON.stringify(body).includes('test-only'));
  assert.ok(!JSON.stringify(body).includes('overall'));
});

test('solo mode and djamespoer.com as the visitor both scan only my site, twice', async () => {
  for (const input of [
    { mode: 'solo' },
    { url: 'www.djamespoer.com' },
    { url: 'https://djamespoer.com/about' },
  ]) {
    const calls = [];
    const body = await (
      await handleCoffee(post(input), {}, deps(() => Response.json(psi([0.9, 1, 1, 1])), calls))
    ).json();
    assert.equal(body.mode, 'solo', JSON.stringify(input));
    assert.equal(body.visitor, null);
    assert.deepEqual(body.james.desktop.scores, s(90, 100, 100, 100));
    assert.deepEqual(
      calls.map((c) => c.searchParams.get('url')),
      [SELF, SELF],
    );
  }
});

test('SCRUM-215: both sites start together with identical settings except URL, every time', async () => {
  for (const strategy of ['mobile', 'desktop']) {
    const calls = [];
    const releases = [];
    const d = deps(() => new Promise((resolve) => releases.push(resolve)), calls);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = handleCoffee(post({ url: 'acme.com', tests: [strategy] }),
        { PAGESPEED_API_KEY: 'test-only' }, d);
      // No response is resolved until both independent PSI calls have started.
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls.length, (attempt + 1) * 2);
      const pair = calls.slice(-2);
      assert.deepEqual(pair.map((u) => u.searchParams.get('url')).sort(),
        ['https://acme.com/', SELF].sort());
      const settings = pair.map((u) => {
        const copy = new URL(u);
        copy.searchParams.delete('url');
        return copy.href;
      });
      assert.equal(settings[0], settings[1]);
      assert.equal(pair[0].searchParams.get('strategy'), strategy);
      assert.equal(pair[0].searchParams.get('locale'), 'en-US');
      assert.deepEqual(pair[0].searchParams.getAll('category'),
        ['performance', 'accessibility', 'best-practices', 'seo']);
      for (const release of releases.splice(0)) release(Response.json(psi([0.9, 1, 1, 1])));
      const response = await result;
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      const body = await response.json();
      assert.equal(body.james[strategy].scores.performance, 90);
      assert.equal(body.visitor[strategy].scores.performance, 90);
    }
  }
});

test('one scan is one rate-limit unit; refusals and failures map to plain types', async () => {
  let units = 0;
  const limiter = { limit: async () => ({ success: ++units <= 1 }) };
  const ok = deps(() => Response.json(psi([1, 1, 1, 1])));
  const first = await handleCoffee(post({ url: 'acme.com' }), { COFFEE_LIMITER: limiter }, ok);
  assert.equal(first.status, 200);
  assert.equal(units, 1);
  const second = await handleCoffee(post({ url: 'acme.com' }), { COFFEE_LIMITER: limiter }, ok);
  assert.equal((await second.json()).error, 'rate_limited');
  const foreign = post({ url: 'acme.com' }, { Origin: 'https://evil.example' });
  assert.equal((await handleCoffee(foreign, {}, ok)).status, 403);
  const metadata = await handleCoffee(post({ url: 'http://169.254.169.254/' }), {}, ok);
  assert.equal((await metadata.json()).error, 'invalid_url');
  const lighthouseError = () =>
    Response.json(
      { error: { message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST.' } },
      { status: 500 },
    );
  const unreachable = await handleCoffee(
    post({ url: 'acme.com' }),
    {},
    deps((url) => (url === SELF ? Response.json(psi([1, 1, 1, 1])) : lighthouseError())),
  );
  assert.equal((await unreachable.json()).error, 'unreachable');
  const self = await (
    await handleCoffee(
      post({ url: 'acme.com' }),
      {},
      deps((url) =>
        url === SELF ? new Response('', { status: 500 }) : Response.json(psi([0.5, 0.5, 0.5, 0.5])),
      ),
    )
  ).json();
  assert.equal(self.error, 'self_failed');
  assert.equal(self.visitor.mobile.scores.seo, 50);
});

test('one failed test still returns the other, marked null rather than zero', async () => {
  const body = await (
    await handleCoffee(
      post({ url: 'acme.com' }),
      {},
      deps((url, strategy) =>
        url !== SELF && strategy === 'mobile'
          ? new Response('', { status: 503 })
          : Response.json(psi([0.8, 0.8, 0.8, 0.8])),
      ),
    )
  ).json();
  assert.equal(body.visitor.mobile, null);
  assert.equal(body.visitor.desktop.scores.performance, 80);
  assert.equal(coffeeTally(body.visitor, body.james).scored, 4);
});

test('SCRUM-218: a scan runs only the requested test; matchups count only that test', async () => {
  for (const test of ['mobile', 'desktop']) {
    const calls = [];
    const body = await (
      await handleCoffee(
        post({ url: 'acme.com', tests: [test] }),
        {},
        deps((url) => Response.json(psi(url === SELF ? [0.9, 1, 1, 1] : [0.5, 1, 0.9, 1])), calls),
      )
    ).json();
    assert.deepEqual(body.tests, [test]);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((c) => c.searchParams.get('strategy') === test));
    const other = test === 'mobile' ? 'desktop' : 'mobile';
    assert.equal(body.visitor[other], null);
    const tally = coffeeTally(body.visitor, body.james, body.tests);
    assert.deepEqual(tally, { visitor: 0, james: 2, tied: 2, scored: 4, total: 4 });
  }
  const solo = await (
    await handleCoffee(post({ mode: 'solo', tests: ['desktop'] }), {}, deps(() => Response.json(psi([1, 1, 1, 1]))))
  ).json();
  assert.deepEqual(solo.tests, ['desktop']);
  assert.equal(solo.james.mobile, null);
  assert.equal(solo.james.desktop.scores.seo, 100);
});

test('SCRUM-218: unknown tests are ignored; no tests means both (older clients)', async () => {
  const calls = [];
  const body = await (
    await handleCoffee(post({ url: 'acme.com', tests: ['tablet', 42] }), {}, deps(() => Response.json(psi([1, 1, 1, 1])), calls))
  ).json();
  assert.deepEqual(body.tests, ['mobile', 'desktop']);
  assert.equal(calls.length, 4);
});

test('SCRUM-218 v2: the connection picks the first test; unknown asks instead of guessing', async () => {
  const { connectionTest } = await import('../../src/app/features/coffee/coffee-contract.ts');
  assert.equal(connectionTest({ type: 'cellular', effectiveType: '4g' }), 'mobile');
  assert.equal(connectionTest({ type: 'wifi' }), 'desktop');
  assert.equal(connectionTest({ type: 'ethernet' }), 'desktop');
  assert.equal(connectionTest({ effectiveType: '3g' }), 'mobile');
  assert.equal(connectionTest({ effectiveType: 'slow-2g' }), 'mobile');
  assert.equal(connectionTest({ effectiveType: '4g' }), 'desktop');
  assert.equal(connectionTest({ type: 'wifi', saveData: true }), 'mobile');
  // Safari, Firefox and every iPhone expose no navigator.connection.
  assert.equal(connectionTest(undefined), null);
  assert.equal(connectionTest({}), null);
  assert.equal(connectionTest({ type: 'unknown' }), null);
});

test('SCRUM-220: the tested URL keeps path and query and drops only the fragment', async () => {
  const { displayUrl } = await import('../../src/app/features/coffee/coffee-contract.ts');
  assert.equal(displayUrl('https://officepride.com/indianapolis-carmel/'), 'officepride.com/indianapolis-carmel/');
  assert.equal(displayUrl('https://example.org/'), 'example.org');
  assert.equal(displayUrl('https://acme.com/p?ref=x'), 'acme.com/p?ref=x');
  // normalizeSiteUrl already drops the #fragment before the scan.
  assert.equal(displayUrl(normalizeSiteUrl('acme.com/p?ref=x#top').url), 'acme.com/p?ref=x');
});

test('SCRUM-215: a failed fresh self run is not retried or replaced with earlier scores', async () => {
  const calls = [];
  let fail = false;
  const d = deps((url) => url === SELF && fail
    ? Response.json({ error: { message: 'Lighthouse returned error: Something went wrong.' } }, { status: 500 })
    : Response.json(psi([0.9, 1, 1, 1])), calls);
  const first = await (await handleCoffee(post({ url: 'acme.com', tests: ['desktop'] }), {}, d)).json();
  assert.equal(first.james.desktop.scores.performance, 90);
  fail = true;
  const second = await (await handleCoffee(post({ url: 'acme.com', tests: ['desktop'] }), {}, d)).json();
  assert.equal(calls.length, 4);
  assert.equal(second.james, null);
  assert.equal(second.error, 'self_failed');
  assert.equal(second.visitor.desktop.scores.performance, 90);
  assert.equal(coffeeVerdict(coffeeTally(second.visitor, second.james, second.tests)), 'no_verdict');
});
