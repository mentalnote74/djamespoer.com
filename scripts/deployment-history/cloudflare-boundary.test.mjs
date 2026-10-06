import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudflareReader } from './cloudflare-reader.mjs';
import { parseCloudflareCheckInput } from './cloudflare-check-input.mjs';
import { verifyCloudflareActivation } from './cloudflare-activation.mjs';

// Fictional provider/check data and credential sentinel; never a real token/account response.
const uuid = (digit) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(12)}`;
const accountId = 'a'.repeat(32);
const token = 'fixture-token-do-not-expose';
const base = `/accounts/${accountId}`;
const buildPath = `${base}/builds/builds/${uuid('1')}`;
const listPath = `${base}/workers/scripts/djamespoer-com/deployments?page=1&per_page=100`;
const target = {
  accountId,
  workerName: 'djamespoer-com',
  workerTag: 'b'.repeat(32),
  triggerId: uuid('2'),
};
const revision = 'c'.repeat(40);
const build = {
  build_uuid: uuid('1'),
  status: 'stopped',
  build_outcome: 'success',
  build_trigger_metadata: {
    provider_type: 'github',
    provider_account_name: 'mentalnote74',
    repo_name: 'djamespoer.com',
    branch: 'main',
    root_directory: '/',
    build_command: 'npm run build',
    deploy_command: 'npx wrangler deploy',
    commit_hash: revision,
    environment_variables: { private: token },
  },
  trigger: {
    trigger_uuid: target.triggerId,
    external_script_id: target.workerTag,
    build_token_uuid: token,
  },
  created_on: '2026-10-06T10:00:00Z',
  author_email: token,
};
const deployment = {
  id: uuid('3'),
  versions: [{ version_id: uuid('4'), percentage: 100, private: token }],
  created_on: '2026-10-06T10:01:00Z',
  author_email: token,
};
const event = {
  action: 'completed',
  repository: { id: 1402431564, full_name: 'mentalnote74/djamespoer.com', private: token },
  check_run: {
    id: 123,
    name: 'Workers Builds: djamespoer-com',
    status: 'completed',
    conclusion: 'success',
    head_sha: revision,
    external_id: uuid('1'),
    app: { id: 456, slug: 'cloudflare-workers-and-pages' },
    output: { summary: token },
    details_url: 'https://untrusted.invalid',
  },
};
const config = { expectedAppId: 456 };
const response = (result, result_info) =>
  new Response(
    JSON.stringify({
      success: true,
      result,
      ...(result_info ? { result_info } : {}),
      messages: [token],
    }),
    { headers: { 'private-header': token } },
  );
const makeReader = (fetcher, options = {}) =>
  createCloudflareReader({ accountId, getToken: () => token, fetcher, ...options });
const request = (path = buildPath, method = 'GET') => ({ path, method });
async function safeRejection(operation) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.message, 'Cloudflare evidence read unavailable.');
    assert.equal(error.cause, undefined);
    assert.doesNotMatch(JSON.stringify(error), /fixture-token|private|untrusted/);
    return true;
  });
}

test('GET pins origin, injects runtime authorization and retains only evidence fields', async () => {
  let options;
  const read = makeReader(async (url, init) => {
    assert.equal(url, `https://api.cloudflare.com/client/v4${buildPath}`);
    options = init;
    return response(build);
  });
  const result = await read(request());
  assert.equal(options.method, 'GET');
  assert.equal(options.headers.Authorization, `Bearer ${token}`);
  assert.equal(options.redirect, 'error');
  assert.equal(options.signal.aborted, false);
  assert.equal(result.result.build_uuid, uuid('1'));
  assert.doesNotMatch(
    JSON.stringify(result),
    /fixture-token|environment_variables|headers|author_email|created_on/,
  );
});

for (const path of [
  'https://untrusted.invalid/data',
  `https://api.cloudflare.com/client/v4${buildPath}`,
  `//api.cloudflare.com${buildPath}`,
  `${base}/../other`,
  `${buildPath}?next=https://untrusted.invalid`,
  `${base}/workers/scripts/other/deployments?page=1&per_page=100`,
  `${base}/workers/scripts/djamespoer-com/deployments?page=101&per_page=100`,
  `${base}/workers/scripts/djamespoer-com/deployments?page=1&per_page=100&next=2`,
  `${buildPath}%0a`,
  `${buildPath}\n`,
]) {
  test(`rejects non-allowlisted request path ${path}`, async () => {
    let called = false;
    await safeRejection(
      makeReader(async () => {
        called = true;
      })(request(path)),
    );
    assert.equal(called, false);
  });
}
test('only GET and configured account are allowed', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'get'])
    await safeRejection(makeReader(() => assert.fail())(request(buildPath, method)));
  await safeRejection(
    makeReader(() => assert.fail())(request(buildPath.replace(accountId, 'd'.repeat(32)))),
  );
});
test('missing credential is rejected at execution, never sourced implicitly', async () => {
  const read = makeReader(() => assert.fail(), { getToken: undefined });
  await safeRejection(read(request()));
  for (const supplied of [null, '', ' '])
    await safeRejection(makeReader(() => assert.fail(), { getToken: () => supplied })(request()));
});
test('runtime/fetch errors containing the token lose their cause and private text', async () => {
  await safeRejection(
    makeReader(async () => {
      throw new Error(token);
    })(request()),
  );
  await safeRejection(
    makeReader(() => assert.fail(), {
      getToken: () => {
        throw new Error(token);
      },
    })(request()),
  );
});
test('timeout aborts fetch and bounds an uncooperative mock', async () => {
  let signal;
  const read = makeReader(
    async (_url, options) => {
      signal = options.signal;
      return new Promise(() => {});
    },
    { timeoutMs: 10 },
  );
  await safeRejection(read(request()));
  assert.equal(signal.aborted, true);
});
test('timeout also bounds body reading and late credential resolution sends no request', async () => {
  await safeRejection(
    makeReader(async () => ({ ok: true, status: 200, text: () => new Promise(() => {}) }), {
      timeoutMs: 10,
    })(request()),
  );
  let release;
  const credential = new Promise((resolve) => {
    release = resolve;
  });
  let called = false;
  await safeRejection(
    makeReader(
      async () => {
        called = true;
      },
      { timeoutMs: 10, getToken: () => credential },
    )(request()),
  );
  release(token);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(called, false);
});
test('redirects and non-success HTTP never expose their bodies/headers', async () => {
  for (const status of [302, 401, 403, 429, 500])
    await safeRejection(
      makeReader(
        async () =>
          new Response(token, { status, headers: { Location: 'https://untrusted.invalid' } }),
      )(request()),
    );
  await safeRejection(
    makeReader(async () => ({
      ok: true,
      status: 200,
      redirected: true,
      text: () => assert.fail(),
    }))(request()),
  );
});
test('malformed JSON/envelopes/shapes fail safely', async () => {
  for (const text of [
    'not JSON',
    'null',
    '[]',
    '{}',
    JSON.stringify({ success: false, result: build }),
    JSON.stringify({ success: true, result: {} }),
  ])
    await safeRejection(makeReader(async () => new Response(text))(request()));
});
test('pagination metadata is projected, bounded and cannot select request URLs', async () => {
  const read = makeReader(async () =>
    response(
      { deployments: [deployment] },
      { page: 1, total_pages: 2, next: 'https://untrusted.invalid', private: token },
    ),
  );
  const result = await read(request(listPath));
  assert.deepEqual(result.result_info, { page: 1, total_pages: 2 });
  assert.doesNotMatch(JSON.stringify(result), /fixture-token|untrusted|created_on|author_email/);
  for (const info of [
    undefined,
    {},
    { page: 2, total_pages: 2 },
    { page: 1, total_pages: 101 },
    { page: 1, total_pages: 1.5 },
  ])
    await safeRejection(
      makeReader(async () => response({ deployments: [] }, info))(request(listPath)),
    );
});
test('opaque version-map keys and private fields never escape', async () => {
  const result = await makeReader(async () => response({ builds: { [token]: build } }))(
    request(`${base}/builds/builds?version_ids=${uuid('4')}`),
  );
  assert.deepEqual(Object.keys(result.result.builds), ['0']);
  assert.doesNotMatch(JSON.stringify(result), /fixture-token|environment_variables/);
});
test('valid check parser retains no conclusion, URLs, output, or private event fields', () => {
  assert.deepEqual(parseCloudflareCheckInput(event, config), {
    ok: true,
    input: {
      repository: 'mentalnote74/djamespoer.com',
      checkId: 123,
      appId: 456,
      revision,
      buildId: uuid('1'),
    },
  });
});
test('wrong repository/check/app and missing or malformed check evidence are rejected', () => {
  for (const bad of [
    null,
    {},
    { ...event, action: 'created' },
    { ...event, repository: { id: 1402431564, full_name: 'other/repo' } },
    { ...event, repository: { ...event.repository, id: 1 } },
    ...[
      { head_sha: 'abc123' },
      { head_sha: `${revision}\n` },
      { head_sha: 'x'.repeat(40) },
      { external_id: undefined },
      { external_id: `${uuid('1')}\n` },
      { external_id: 'https://untrusted.invalid' },
      { name: 'Other check' },
      { id: undefined },
      { status: 'in_progress' },
      { app: { id: 456, slug: 'other' } },
      { app: { id: 999, slug: 'cloudflare-workers-and-pages' } },
    ].map((fields) => ({ ...event, check_run: { ...event.check_run, ...fields } })),
  ])
    assert.deepEqual(parseCloudflareCheckInput(bad, config), { ok: false });
  assert.deepEqual(parseCloudflareCheckInput(event), { ok: false });
});

function composedReader({ empty = false, failedSecondPage = false } = {}) {
  return makeReader(async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith(`/builds/builds/${uuid('1')}`)) return response(build);
    if (path.endsWith('/deployments')) {
      if (failedSecondPage && new URL(url).searchParams.get('page') === '2')
        return new Response(token, { status: 503 });
      return response(
        { deployments: empty ? [] : [deployment] },
        { page: 1, total_pages: failedSecondPage ? 2 : 1 },
      );
    }
    if (new URL(url).searchParams.has('version_ids'))
      return response({ builds: { opaque: build } });
    if (path.endsWith(`/deployments/${uuid('3')}`)) return response(deployment);
    throw new Error(token);
  });
}
test('parser/HTTP/verifier compose without changing deployment evidence rules', async () => {
  const parsed = parseCloudflareCheckInput(event, config);
  assert.equal(parsed.ok, true);
  const result = await verifyCloudflareActivation({
    target,
    candidate: parsed.input,
    read: composedReader(),
  });
  assert.equal(result.outcome, 'verified-activation');
  assert.equal(result.deploymentId, uuid('3'));
  assert.doesNotMatch(
    JSON.stringify(result),
    /fixture-token|startedAt|completedAt|statusRecordedAt/,
  );
  assert.deepEqual(
    await verifyCloudflareActivation({
      target,
      candidate: parsed.input,
      read: composedReader({ empty: true }),
    }),
    { outcome: 'unverifiable' },
  );
});
test('incomplete pagination cannot publish a partially verified activation', async () => {
  const result = await verifyCloudflareActivation({
    target,
    candidate: { buildId: uuid('1'), revision },
    read: composedReader({ failedSecondPage: true }),
  });
  assert.deepEqual(result, { outcome: 'unverifiable' });
});
