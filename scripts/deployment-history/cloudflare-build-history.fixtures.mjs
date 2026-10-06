import assert from 'node:assert/strict';
import { createCloudflareBuildAcquisition } from './cloudflare-build-history.mjs';

// Entirely synthetic provider projections and credential sentinel; not James's history.
const id = (n) => `${n.toString(16).padStart(8, '0')}-1111-2222-3333-444444444444`;
const accountId = 'a'.repeat(32);
const workerTag = 'b'.repeat(32);
const token = 'fixture-private-sentinel';
const revision = 'c'.repeat(40);
const trigger = {
  trigger_uuid: id(2),
  external_script_id: workerTag,
  root_directory: '/',
  build_command: 'npm run build',
  deploy_command: 'npx wrangler deploy',
  repo_connection: {
    provider_type: 'github',
    provider_account_name: 'mentalnote74',
    repo_name: 'djamespoer.com',
  },
  branch_includes: ['main'],
  branch_excludes: [],
  environment_variables: { secret: token },
};
const scope = {
  workerName: 'djamespoer-com',
  provider: 'github',
  owner: 'mentalnote74',
  repository: 'djamespoer.com',
  branch: 'main',
  root: '/',
  buildCommand: 'npm run build',
  deployCommand: 'npx wrangler deploy',
  workerTag,
  triggerId: id(2),
  environment: 'production',
};
const build = (number = 1) => ({
  build_uuid: id(number + 10),
  status: 'stopped',
  build_outcome: 'success',
  created_on: '2026-10-05T14:30:00Z',
  build_trigger_metadata: {
    provider_type: 'github',
    provider_account_name: 'mentalnote74',
    repo_name: 'djamespoer.com',
    branch: 'main',
    root_directory: '/',
    build_command: 'npm run build',
    deploy_command: 'npx wrangler deploy',
    commit_hash: revision,
    commit_message: 'Fixture: improve keyboard navigation',
    environment_variables: { secret: token },
    author: token,
    build_token_uuid: token,
  },
  trigger: { trigger_uuid: id(2), external_script_id: workerTag, private: token },
  private: token,
  stage: 'installing',
  running_on: 'do-not-use',
  stopped_on: 'do-not-use',
});
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
function harness(records = [build()], override = () => undefined) {
  const requests = [];
  const fetcher = async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(new URL(url).origin, 'https://api.cloudflare.com');
    requests.push(url);
    const changed = override(url, options);
    if (changed !== undefined) return changed;
    if (url.endsWith('/workers/scripts'))
      return response([{ id: 'djamespoer-com', tag: workerTag, private: token }]);
    if (url.endsWith('/triggers')) return response([trigger]);
    const page = Number(new URL(url).searchParams.get('page'));
    const slice = records.slice((page - 1) * 100, page * 100);
    return response(slice, {
      page,
      per_page: 100,
      count: slice.length,
      total_count: records.length,
      total_pages: Math.max(1, Math.ceil(records.length / 100)),
    });
  };
  const acquire = createCloudflareBuildAcquisition({ accountId, getToken: () => token, fetcher });
  return { acquire, requests, fetcher };
}
export { harness, token, accountId, build, scope, revision, response };
