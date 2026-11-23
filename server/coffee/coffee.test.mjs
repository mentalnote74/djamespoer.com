import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCoffee } from './coffee.ts';
import { normalizeSiteUrl, coffeeVerdict } from '../../src/app/features/coffee/coffee-contract.ts';

const psi = (scores, extra = {}) => ({
  lighthouseResult: {
    finalDisplayedUrl: extra.final,
    fetchTime: '2026-11-23T15:00:00.000Z',
    categories: {
      performance: { score: scores[0] },
      accessibility: { score: scores[1] },
      'best-practices': { score: scores[2] },
      seo: { score: scores[3] },
    },
    ...extra.result,
  },
});
const post = (body, headers = {}) =>
  new Request('https://djamespoer.com/api/coffee', {
    method: 'POST',
    headers: { Origin: 'https://djamespoer.com', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const deps = (respond, calls = []) => ({
  cache: null,
  timeoutMs: 1000,
  fetch: async (url) => {
    calls.push(new URL(url));
    return respond(new URL(url));
  },
});

test('URL rules accept public sites and reject private, IP, port and credential targets', () => {
  assert.deepEqual(normalizeSiteUrl(' Acme-Widgets.com/pricing?a=1#top '), {
    ok: true,
    url: 'https://acme-widgets.com/pricing?a=1',
    host: 'acme-widgets.com',
  });
  assert.equal(normalizeSiteUrl('http://xn--bcher-kva.example.de').ok, true);
  for (const bad of [
    '',
    'ftp://acme.com',
    'javascript:alert(1)',
    'localhost',
    'http://localhost:4200',
    'printer.local',
    'db.internal',
    'https://127.0.0.1',
    'http://2130706433',
    'http://0x7f.1',
    'http://[::1]/',
    'https://user:pw@acme.com',
    'https://acme.com:8080',
    'intranet',
    'acme.test',
    'a'.repeat(2050) + '.com',
  ])
    assert.equal(normalizeSiteUrl(bad).ok, false, bad);
});

test('verdict: the lower overall buys; equal is a tie; a missing side has no verdict', () => {
  const s = (overall) => ({ overall });
  assert.equal(coffeeVerdict({ visitor: s(80), james: s(95) }), 'visitor_buys');
  assert.equal(coffeeVerdict({ visitor: s(99), james: s(95) }), 'james_buys');
  assert.equal(coffeeVerdict({ visitor: s(95), james: s(95) }), 'tie');
  assert.equal(coffeeVerdict({ visitor: s(95), james: null }), 'no_verdict');
});

test('both sites run in parallel on mobile with four categories and only scores return', async () => {
  const calls = [];
  const res = await handleCoffee(
    post({ url: 'acme.com' }),
    { PAGESPEED_API_KEY: 'test-only' },
    deps(
      (u) =>
        Response.json(
          u.searchParams.get('url') === 'https://djamespoer.com/'
            ? psi([0.94, 1, 0.96, 1])
            : psi([0.72, 0.88, 0.96, 0.91], { final: 'https://www.acme.com/' }),
        ),
      calls,
    ),
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.searchParams.get('strategy'), 'mobile');
    assert.deepEqual(call.searchParams.getAll('category'), [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
    ]);
  }
  assert.deepEqual(body.visitor.scores, { performance: 72, accessibility: 88, bestPractices: 96, seo: 91 });
  assert.equal(body.visitor.overall, 87);
  assert.equal(body.visitor.host, 'www.acme.com');
  assert.equal(body.james.overall, 98);
  assert.ok(!JSON.stringify(body).includes('test-only'));
});

test('cross-origin, wrong method and invalid URLs are refused before PSI is called', async () => {
  const calls = [];
  const d = deps(() => Response.json(psi([1, 1, 1, 1])), calls);
  assert.equal((await handleCoffee(post({ url: 'acme.com' }, { Origin: 'https://evil.example' }), {}, d)).status, 403);
  assert.equal((await handleCoffee(new Request('https://djamespoer.com/api/coffee'), {}, d)).status, 405);
  const bad = await handleCoffee(post({ url: 'http://169.254.169.254/' }), {}, d);
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'invalid_url');
  assert.equal(calls.length, 0);
});

test('errors map to plain types: unreachable, rate limited, PSI down, self failed', async () => {
  const limited = await handleCoffee(post({ url: 'acme.com' }), {
    COFFEE_LIMITER: { limit: async () => ({ success: false }) },
  }, deps(() => Response.json(psi([1, 1, 1, 1]))));
  assert.equal((await limited.json()).error, 'rate_limited');
  const lighthouseError = Response.json(
    { error: { message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST.' } },
    { status: 500 },
  );
  const unreachable = await handleCoffee(post({ url: 'acme.com' }), {}, deps((u) =>
    u.searchParams.get('url') === 'https://djamespoer.com/' ? Response.json(psi([1, 1, 1, 1])) : lighthouseError.clone(),
  ));
  assert.equal((await unreachable.json()).error, 'unreachable');
  const down = await handleCoffee(post({ url: 'acme.com' }), {}, deps(() => new Response('quota', { status: 429 })));
  assert.equal((await down.json()).error, 'psi_down');
  const self = await handleCoffee(post({ url: 'acme.com' }), {}, deps((u) =>
    u.searchParams.get('url') === 'https://djamespoer.com/' ? new Response('', { status: 500 }) : Response.json(psi([0.5, 0.5, 0.5, 0.5])),
  ));
  const selfBody = await self.json();
  assert.equal(self.status, 200);
  assert.equal(selfBody.error, 'self_failed');
  assert.equal(selfBody.visitor.overall, 50);
  assert.equal(selfBody.james, null);
});
