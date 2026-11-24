import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { coffeeService } from '../../scripts/coffee/service.mjs';
import { handleCoffeeJob } from './jobs.ts';
const key = 'fixture-only-32-characters-or-more';
test('service authenticates, validates, returns real result unchanged, and limits concurrent work', async () => {
  let finish;
  const completed = new Promise((r) => (finish = r));
  const service = coffeeService({ key, run: () => completed });
  service.listen(0, '127.0.0.1');
  await once(service, 'listening');
  const base = 'http://127.0.0.1:' + service.address().port;
  const call = (path, method = 'GET', body, auth = true) =>
    fetch(base + path, {
      method,
      headers: {
        ...(auth ? { Authorization: 'Bearer ' + key } : {}),
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    assert.equal((await call('/api/coffee', 'POST', {}, false)).status, 403);
    assert.equal(
      (await call('/api/coffee', 'POST', { url: 'localhost', tests: ['desktop'] })).status,
      400,
    );
    const response = await call('/api/coffee', 'POST', {
      url: 'www.tomjohn.design',
      tests: ['desktop'],
      internal: true,
    });
    assert.equal(response.status, 202);
    const job = await response.json();
    assert.equal(
      (await call('/api/coffee', 'POST', { mode: 'solo', tests: ['desktop'] })).status,
      429,
    );
    finish({
      mode: 'challenge',
      tests: ['desktop'],
      visitor: { desktop: { scores: { performance: 97 } } },
      james: { desktop: { scores: { performance: 98 } } },
      comparable: true,
    });
    await new Promise((r) => setImmediate(r));
    const result = await (await call('/api/coffee/jobs/' + job.id)).json();
    assert.equal(result.state, 'complete');
    assert.equal(result.result.visitor.desktop.scores.performance, 97);
    assert.equal(result.result.james.desktop.scores.performance, 98);
  } finally {
    finish({});
    service.close();
    await once(service, 'close');
  }
});
test('explicit cancellation reaches the runner; failed work is never a zero or stale score', async () => {
  let aborted = false;
  const service = coffeeService({
    key,
    run: (_, options) =>
      new Promise((resolve, reject) =>
        options.signal.addEventListener(
          'abort',
          () => {
            aborted = true;
            reject(Error('canceled'));
          },
          { once: true },
        ),
      ),
  });
  service.listen(0, '127.0.0.1');
  await once(service, 'listening');
  const base = 'http://127.0.0.1:' + service.address().port;
  const call = (path, method = 'GET', body) =>
    fetch(base + path, {
      method,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    const job = await (
      await call('/api/coffee', 'POST', { mode: 'solo', tests: ['desktop'] })
    ).json();
    await call('/api/coffee/jobs/' + job.id, 'DELETE');
    assert.equal(aborted, true);
    const canceled = await (await call('/api/coffee/jobs/' + job.id)).json();
    assert.equal(canceled.state, 'canceled');
    assert.equal(canceled.result, undefined);
  } finally {
    service.close();
    await once(service, 'close');
  }
});
test('Worker forwards only coffee routes and selected headers; never client cookies or an arbitrary destination', async () => {
  const req = new Request('https://djamespoer.com/api/coffee', {
    method: 'POST',
    headers: {
      Origin: 'https://djamespoer.com',
      'Content-Type': 'application/json',
      Cookie: 'private=1',
    },
    body: JSON.stringify({ mode: 'solo', tests: ['desktop'] }),
  });
  let sent;
  const result = await handleCoffeeJob(
    req.clone(),
    { COFFEE_RUNNER_URL: 'https://runner.example/', COFFEE_RUNNER_KEY: key },
    async (url, init) => {
      sent = { url: String(url), init };
      return Response.json({ id: 'fixture', state: 'queued' }, { status: 202 });
    },
  );
  assert.equal(result.status, 202);
  assert.equal(sent.url, 'https://runner.example/api/coffee');
  assert.equal(sent.init.headers.Cookie, undefined);
  assert.equal(sent.init.headers.Authorization, 'Bearer ' + key);
  assert.equal(
    (await handleCoffeeJob(new Request('https://djamespoer.com/api/coffee/jobs/not-a-job'), {}))
      .status,
    404,
  );
  assert.equal((await handleCoffeeJob(req.clone(), {})).status, 503);
});

test('failed audits remain a failed job, never a successful empty comparison', async () => {
  const service = coffeeService({
    key,
    run: async () => ({
      mode: 'solo',
      tests: ['desktop'],
      visitor: null,
      james: null,
      error: 'runner_unavailable',
    }),
  });
  service.listen(0, '127.0.0.1');
  await once(service, 'listening');
  const base = 'http://127.0.0.1:' + service.address().port;
  const headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  try {
    const job = await (
      await fetch(base + '/api/coffee', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'solo', tests: ['desktop'] }),
      })
    ).json();
    await new Promise((r) => setImmediate(r));
    const result = await (await fetch(base + '/api/coffee/jobs/' + job.id, { headers })).json();
    assert.equal(result.state, 'failed');
    assert.equal(result.error, 'runner_unavailable');
    assert.equal(result.result, undefined);
  } finally {
    service.close();
    await once(service, 'close');
  }
});
