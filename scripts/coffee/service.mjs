// [Larry] SCRUM-215: portable Node/Chrome service; no Google/Actions compute dependency.
import { createServer } from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { compare } from './compare.mjs';
import {
  normalizeSiteUrl,
  isSelfHost,
  parseTests,
} from '../../src/app/features/coffee/coffee-contract.ts';
export function coffeeService({ key, executablePath, run = compare, now = Date.now } = {}) {
  if (!key || key.length < 32)
    throw Error('Set a random COFFEE_RUNNER_KEY of at least32 characters');
  const jobs = new Map();
  let active = null;
  const ttl = 6 * 60000;
  const server = createServer(async (req, res) => {
    const send = (body, status = 200) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/health' && req.method === 'GET') return send({ ready: true });
    const supplied = Buffer.from(req.headers.authorization ?? '');
    const expected = Buffer.from('Bearer ' + key);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return send({ error: 'runner_unavailable' }, 403);
    // Expire transient in-memory jobs; restarts never substitute historical data.
    for (const [id, job] of jobs)
      if (now() - job.createdAt > ttl) {
        job.controller.abort();
        jobs.delete(id);
        if (active === id) active = null;
      }
    try {
      if (req.url === '/api/coffee' && req.method === 'POST') {
        if (active) return send({ error: 'rate_limited' }, 429);
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 4096) return send({ error: 'invalid_url' }, 413);
        }
        let body;
        try {
          body = JSON.parse(raw);
        } catch {
          return send({ error: 'invalid_url' }, 400);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body))
          return send({ error: 'invalid_url' }, 400);
        const parsed = body.mode === 'solo' ? null : normalizeSiteUrl(body.url);
        const tests = parseTests(body.tests);
        if ((parsed && !parsed.ok) || tests.length !== 1)
          return send({ error: 'invalid_url' }, 400);
        const id = randomUUID();
        const job = {
          id,
          createdAt: now(),
          state: 'queued',
          url: parsed?.ok && !isSelfHost(parsed.host) ? parsed.url : null,
          tests,
          internal: body.internal === true,
          controller: new AbortController(),
        };
        jobs.set(id, job);
        active = id;
        send({ id, state: 'queued' }, 202);
        // Work continues independently of the short creation request; only explicit cancel aborts it.
        const timer = setTimeout(() => job.controller.abort(), 180000);
        Promise.resolve()
          .then(async () => {
            job.state = 'running';
            const result = await run(job, { executablePath, signal: job.controller.signal });
            if (job.controller.signal.aborted) return;
            for (const side of ['visitor', 'james'])
              for (const test of tests)
                if (result[side]?.[test]) result[side][test].reportUrl = '/api/coffee/jobs/' + id;
            if (!result.visitor && !result.james) {
              job.state = 'failed';
              job.error = result.error ?? 'runner_unavailable';
              return;
            }
            job.result = result;
            job.state = 'complete';
          })
          .catch(() => {
            if (job.state !== 'canceled') {
              job.state = 'failed';
              job.error = job.controller.signal.aborted ? 'timeout' : 'runner_unavailable';
            }
          })
          .finally(() => {
            clearTimeout(timer);
            if (active === id) active = null;
          });
        return;
      }
      const match = /^\/api\/coffee\/jobs\/([0-9a-f-]{36})$/.exec(req.url ?? '');
      const job = match ? jobs.get(match[1]) : null;
      if (!job) return send({ error: 'timeout' }, 404);
      if (req.method === 'DELETE') {
        if (!['complete', 'failed', 'canceled'].includes(job.state)) {
          job.state = 'canceled';
          job.controller.abort();
        }
        return send({ state: job.state });
      }
      if (req.method !== 'GET') return send({ error: 'invalid_url' }, 405);
      send({
        id: job.id,
        state: job.state,
        ...(job.result ? { result: job.result } : {}),
        ...(job.error ? { error: job.error } : {}),
      });
    } catch {
      send({ error: 'runner_unavailable' }, 500);
    }
  });
  server.on('close', () => {
    for (const job of jobs.values()) job.controller.abort();
  });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Readiness is a real Chrome handshake, not an assumed warm endpoint.
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  const session = await browser.target().createCDPSession();
  await session.send('Browser.getVersion');
  await browser.close();
  coffeeService({
    key: process.env.COFFEE_RUNNER_KEY,
    executablePath: process.env.CHROME_PATH,
  }).listen(Number(process.env.PORT ?? 8788), '0.0.0.0', () =>
    console.log('Controlled Lighthouse service ready.'),
  );
}
