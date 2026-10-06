import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseCloudflare as runDiagnostic } from './cloudflare-diagnostic.mjs';
import { createCloudflareReader } from './cloudflare-reader.mjs';

test('complete mocked activation composes reader/verifier and excludes generic failed build', async () => {
  const id = (digit) =>
    `${digit.repeat(8)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(12)}`;
  const configured = {
    ...env,
  };
  const deployment = { id: id('1'), versions: [{ version_id: id('3'), percentage: 100 }] };
  const build = {
    build_uuid: id('4'),
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
      commit_hash: 'c'.repeat(40),
      private: 'do-not-print',
    },
    trigger: { trigger_uuid: id('2'), external_script_id: 'b'.repeat(32) },
    created_on: '2026-10-06T10:00:00Z',
  };
  const result = await diagnoseCloudflare({
    env: configured,
    fetcher: async (url, options) => {
      assert.equal(options.method, 'GET');
      if (url.includes('?page='))
        return response({
          success: true,
          result: { deployments: [deployment] },
          result_info: { page: 1, total_pages: 1 },
        });
      if (url.includes('?version_ids='))
        return response({ success: true, result: { builds: { opaque: build } } });
      if (url.includes('/deployments/')) return response({ success: true, result: deployment });
      if (url.endsWith('c030dba1-047c-47c5-b7b6-e9e263c6a246'))
        return response({
          success: true,
          result: {
            ...build,
            build_uuid: 'c030dba1-047c-47c5-b7b6-e9e263c6a246',
            build_outcome: 'fail',
            build_trigger_metadata: {
              ...build.build_trigger_metadata,
              commit_hash: 'b4384a51d34fbc1a443e3ce727582f40478340e2',
            },
          },
        });
      return response({ success: true, result: build });
    },
  });
  assert.equal(result.result.outcome, 'verified-activation');
  assert.equal(result.result.deploymentId, id('1'));
  assert.equal(result.observations.at(-1).successfullyActivated, false);
  assert.ok(
    result.observations.some(
      (item) =>
        item.resource === 'known-failed-predicate' &&
        item.category === 'build-success-not-established',
    ),
  );
  const serialized = JSON.stringify(result);
  for (const privateValue of [
    configured.CLOUDFLARE_API_TOKEN,
    configured.CLOUDFLARE_ACCOUNT_ID,
    'b'.repeat(32),
    id('2'),
    'do-not-print',
    '2026-10-06T10:00:00Z',
  ])
    assert.ok(!serialized.includes(privateValue));
});

// Synthetic runtime/response fixtures only.
const env = {
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  CLOUDFLARE_API_TOKEN: 'private-fixture-token',
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
test('missing runtime input makes no request', async () => {
  const result = await diagnoseCloudflare({ env: {}, fetcher: () => assert.fail('network') });
  assert.equal(result.reason, 'runtime-credential-or-account-unavailable');
});
test('permission failure is sanitized and stops after one GET', async () => {
  let calls = 0;
  const result = await diagnoseCloudflare({
    env,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, `Bearer ${env.CLOUDFLARE_API_TOKEN}`);
      assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/'));
      return response({ errors: [{ message: env.CLOUDFLARE_API_TOKEN }] }, 403);
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.reason, 'authentication-or-permission-denied');
  assert.ok(!JSON.stringify(result).includes(env.CLOUDFLARE_API_TOKEN));
  assert.ok(!JSON.stringify(result).includes(env.CLOUDFLARE_ACCOUNT_ID));
});
test('real-shape mismatch reports booleans without accepting missing pagination', async () => {
  const result = await diagnoseCloudflare({
    env,
    fetcher: async () =>
      response({ success: true, result: { deployments: [], private: env.CLOUDFLARE_API_TOKEN } }),
  });
  assert.equal(result.result.outcome, 'unverifiable');
  const shape = result.observations.find(
    (item) => item.resource === 'deployment' && 'deploymentArray' in item,
  );
  assert.equal(shape.deploymentArray, true);
  assert.equal(shape.paginationObject, false);
  assert.ok(!JSON.stringify(result).includes('private-fixture-token'));
});
test('does not infer current deployment from list order', async () => {
  const result = await diagnoseCloudflare({
    env,
    fetcher: async () =>
      response({
        success: true,
        result: { deployments: [] },
        result_info: { page: 1, total_pages: 1 },
      }),
  });
  assert.equal(result.reason, 'no-deployments');
});
test('transport and malformed JSON never expose original errors', async () => {
  for (const fetcher of [
    async () => {
      throw new Error(env.CLOUDFLARE_API_TOKEN);
    },
    async () => new Response('not-json'),
  ]) {
    const result = await diagnoseCloudflare({ env, fetcher });
    assert.equal(result.result.outcome, 'unverifiable');
    assert.ok(!JSON.stringify(result).includes(env.CLOUDFLARE_API_TOKEN));
  }
});

test('enumeration rejects incomplete or changed pages before correlation', async () => {
  for (const mode of ['failed-page', 'changed-count']) {
    let requests = 0;
    const result = await diagnoseCloudflare({
      env,
      fetcher: async (url) => {
        requests++;
        assert.ok(url.includes('/deployments?page='));
        if (requests === 2 && mode === 'failed-page') return response({}, 500);
        return response({
          success: true,
          result: { deployments: [] },
          result_info: { page: requests, total_pages: requests === 2 ? 3 : 2 },
        });
      },
    });
    assert.equal(requests, 2);
    assert.equal(result.result.outcome, 'unverifiable');
  }
});

test('API deployment identity conflicts and unsupported traffic fail closed', async () => {
  const id = (digit) =>
    `${digit.repeat(8)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(12)}`;
  for (const deployments of [
    [{ id: id('1'), versions: [{ version_id: id('2'), percentage: 50 }] }],
    [
      { id: id('1'), versions: [{ version_id: id('2'), percentage: 100 }] },
      { id: id('1'), versions: [{ version_id: id('3'), percentage: 100 }] },
    ],
  ]) {
    const result = await diagnoseCloudflare({
      env,
      fetcher: async () =>
        response({
          success: true,
          result: { deployments },
          result_info: { page: 1, total_pages: 1 },
        }),
    });
    assert.equal(result.result.outcome, 'unverifiable');
  }
});

// Independent configuration fixtures; these do not come from any candidate build.
const workerFixture = { id: 'djamespoer-com', tag: 'b'.repeat(32), private: 'hidden' };
const triggerFixture = {
  trigger_uuid: '22222222-2222-2222-2222-222222222222',
  external_script_id: workerFixture.tag,
  root_directory: '/',
  build_command: 'npm run build',
  deploy_command: 'npx wrangler deploy',
  branch_includes: ['main'],
  branch_excludes: [],
  repo_connection: {
    provider_type: 'github',
    provider_account_name: 'mentalnote74',
    repo_name: 'djamespoer.com',
    private: 'hidden',
  },
  build_token_uuid: 'hidden',
  environment_variables: { secret: 'hidden' },
};
function diagnoseCloudflare(options) {
  return runDiagnostic({
    ...options,
    fetcher: async (url, init) => {
      if (url.endsWith('/workers/scripts'))
        return response({ success: true, result: [workerFixture] });
      if (url.endsWith('/triggers')) return response({ success: true, result: [triggerFixture] });
      return options.fetcher(url, init);
    },
  });
}

for (const [name, workers, triggers] of [
  ['no Worker', [], [triggerFixture]],
  ['duplicate Worker', [workerFixture, workerFixture], [triggerFixture]],
  ['malformed Worker tag', [{ ...workerFixture, tag: 'bad' }], [triggerFixture]],
  ['wrong Worker', [{ ...workerFixture, id: 'other' }], [triggerFixture]],
  ['no production trigger', [workerFixture], []],
  ['ambiguous triggers', [workerFixture], [triggerFixture, triggerFixture]],
  [
    'wrong repository',
    [workerFixture],
    [
      {
        ...triggerFixture,
        repo_connection: { ...triggerFixture.repo_connection, repo_name: 'other' },
      },
    ],
  ],
  ['wrong branch', [workerFixture], [{ ...triggerFixture, branch_includes: ['preview'] }]],
  ['broad branch', [workerFixture], [{ ...triggerFixture, branch_includes: ['*'] }]],
  ['excluded main', [workerFixture], [{ ...triggerFixture, branch_excludes: ['main'] }]],
  ['wrong context', [workerFixture], [{ ...triggerFixture, deploy_command: 'other' }]],
  ['wrong tag', [workerFixture], [{ ...triggerFixture, external_script_id: 'c'.repeat(32) }]],
  ['malformed trigger UUID', [workerFixture], [{ ...triggerFixture, trigger_uuid: 'bad' }]],
  ['deleted trigger', [workerFixture], [{ ...triggerFixture, deleted_on: '2026-10-06T00:00:00Z' }]],
])
  test(`independent discovery fails closed: ${name}`, async () => {
    const result = await runDiagnostic({
      env,
      fetcher: async (url) => {
        if (url.endsWith('/workers/scripts')) return response({ success: true, result: workers });
        if (url.endsWith('/triggers')) return response({ success: true, result: triggers });
        assert.fail('discovery must stop before deployment access');
      },
    });
    assert.equal(result.result.outcome, 'unverifiable');
    assert.ok(!JSON.stringify(result).includes('hidden'));
  });

for (const resource of ['worker', 'trigger'])
  test(`${resource} discovery rejects incomplete pagination and API failure`, async () => {
    for (const mode of ['partial', 'malformed', 'failed']) {
      const result = await runDiagnostic({
        env,
        fetcher: async (url) => {
          const isWorker = url.endsWith('/workers/scripts');
          if ((resource === 'worker') === isWorker) {
            if (mode === 'failed') return response({}, 403);
            return response({
              success: true,
              result: isWorker ? [workerFixture] : [triggerFixture],
              result_info:
                mode === 'partial'
                  ? { page: 1, total_pages: 2, count: 1, total_count: 2 }
                  : { page: 1 },
            });
          }
          assert.ok(isWorker);
          return response({ success: true, result: [workerFixture] });
        },
      });
      assert.equal(result.result.outcome, 'unverifiable');
    }
  });

test('complete documented list metadata is accepted; manual target variables are unnecessary', async () => {
  const result = await runDiagnostic({
    env,
    fetcher: async (url, init) => {
      assert.equal(init.method, 'GET');
      assert.equal(init.redirect, 'error');
      if (url.endsWith('/workers/scripts') || url.endsWith('/triggers'))
        return response({
          success: true,
          result: url.endsWith('/triggers') ? [triggerFixture] : [workerFixture],
          result_info: { page: 1, total_pages: 1, count: 1, total_count: 1, per_page: 50 },
        });
      return response({
        success: true,
        result: { deployments: [] },
        result_info: { page: 1, total_pages: 1 },
      });
    },
  });
  assert.equal(result.reason, 'no-deployments');
});

test('new discovery paths reject extra queries, arbitrary URLs and invalid tags before authentication', async () => {
  const read = createCloudflareReader({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    getToken: () => assert.fail('credential lookup'),
    fetcher: () => assert.fail('network'),
  });
  for (const path of [
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`,
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts?page=2`,
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/builds/workers/bad/triggers`,
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/builds/workers/${workerFixture.tag}/triggers?page=2`,
  ])
    await assert.rejects(read({ method: 'GET', path }), /read unavailable/);
});

test('discovery reader strips private configuration and rejects unknown pagination targets', async () => {
  for (const kind of ['workers', 'triggers']) {
    const path =
      kind === 'workers'
        ? `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`
        : `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/builds/workers/${workerFixture.tag}/triggers`;
    const body = { success: true, result: [kind === 'workers' ? workerFixture : triggerFixture] };
    const read = createCloudflareReader({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      getToken: () => env.CLOUDFLARE_API_TOKEN,
      fetcher: async () => response(body),
    });
    const projected = await read({ method: 'GET', path });
    assert.ok(!JSON.stringify(projected).includes('hidden'));
    body.result_info = {
      page: 1,
      total_pages: 1,
      count: 1,
      total_count: 1,
      next: 'https://untrusted.invalid',
    };
    await assert.rejects(read({ method: 'GET', path }), /read unavailable/);
  }
});
