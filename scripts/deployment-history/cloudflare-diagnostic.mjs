import { pathToFileURL } from 'node:url';
import { createCloudflareReader } from './cloudflare-reader.mjs';
import { verifyCloudflareActivation } from './cloudflare-activation.mjs';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = (value) =>
  typeof value === 'string' &&
  value.length === 36 &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const sha = (value) =>
  typeof value === 'string' && value.length === 40 && /^[0-9a-f]{40}$/.test(value);
const failedRevision = 'b4384a51d34fbc1a443e3ce727582f40478340e2';
const failedBuild = 'c030dba1-047c-47c5-b7b6-e9e263c6a246';

/** No persistence/logging. Returned diagnostics contain fixed categories and shape booleans only. */
export async function diagnoseCloudflare({ env, fetcher = fetch }) {
  const observations = [];
  let blocked;
  const finish = (reason, result = { outcome: 'unverifiable' }) => ({
    reason,
    observations,
    result,
  });
  if (!env?.CLOUDFLARE_API_TOKEN?.trim() || !env?.CLOUDFLARE_ACCOUNT_ID?.trim())
    return finish('runtime-credential-or-account-unavailable');
  try {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const base = `/accounts/${accountId}`;
    const observedFetch = async (url, options) => {
      // URLs originate exclusively from the existing pinned, allowlisted reader.
      const resource = url.endsWith('/workers/scripts')
        ? 'worker-list'
        : url.endsWith('/triggers')
          ? 'trigger-list'
          : url.includes('/workers/scripts/')
            ? 'deployment'
            : url.includes('?version_ids=')
              ? 'version-build'
              : 'build';
      let response;
      try {
        response = await fetcher(url, options);
      } catch {
        blocked = 'transport-unavailable';
        throw new Error('Read unavailable');
      }
      const status = Number.isInteger(response.status) ? response.status : 0;
      observations.push({ resource, httpStatus: status });
      if (status === 401 || status === 403) blocked = 'authentication-or-permission-denied';
      else if (!response.ok) blocked = 'http-read-failed';
      return {
        ok: response.ok,
        status: response.status,
        redirected: response.redirected,
        async text() {
          const text = await response.text();
          if (text.length <= 2_000_000) {
            try {
              const body = JSON.parse(text);
              observations.push({
                resource,
                successfulEnvelope: object(body) && body.success === true,
                objectResult: object(body?.result),
                deploymentArray: Array.isArray(body?.result?.deployments),
                paginationObject: object(body?.result_info),
                paginationPage: Number.isSafeInteger(body?.result_info?.page),
                paginationTotalPages: Number.isSafeInteger(body?.result_info?.total_pages),
                buildMap: object(body?.result?.builds),
              });
            } catch {
              blocked = 'malformed-json';
            }
          }
          return text;
        },
      };
    };
    const read = createCloudflareReader({
      accountId,
      getToken: () => env.CLOUDFLARE_API_TOKEN,
      fetcher: observedFetch,
    });
    const workers = (await read({ method: 'GET', path: `${base}/workers/scripts` })).result;
    const matchingWorkers = workers.filter((worker) => worker.id === 'djamespoer-com');
    if (matchingWorkers.length !== 1) return finish('worker-identity-missing-or-ambiguous');
    const workerTag = matchingWorkers[0].tag;
    const triggers = (
      await read({ method: 'GET', path: `${base}/builds/workers/${workerTag}/triggers` })
    ).result;
    const matchingTriggers = triggers.filter(
      (trigger) =>
        trigger.active &&
        trigger.external_script_id === workerTag &&
        trigger.repo_connection.provider_type === 'github' &&
        trigger.repo_connection.provider_account_name === 'mentalnote74' &&
        trigger.repo_connection.repo_name === 'djamespoer.com' &&
        trigger.branch_includes.length === 1 &&
        trigger.branch_includes[0] === 'main' &&
        trigger.branch_excludes.length === 0 &&
        trigger.root_directory === '/' &&
        trigger.build_command === 'npm run build' &&
        trigger.deploy_command === 'npx wrangler deploy',
    );
    if (matchingTriggers.length !== 1) return finish('production-trigger-missing-or-ambiguous');
    const target = {
      accountId,
      workerName: 'djamespoer-com',
      workerTag,
      triggerId: matchingTriggers[0].trigger_uuid,
    };
    // Complete enumeration first; cache only sanitized provider projections in memory.
    const cached = new Map();
    const evidenceRead = async (request) => {
      if (!cached.has(request.path)) cached.set(request.path, await read(request));
      return cached.get(request.path);
    };
    const records = new Map();
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
      const response = await evidenceRead({
        method: 'GET',
        path: `${base}/workers/scripts/djamespoer-com/deployments?page=${page}&per_page=100`,
      });
      if (page > 1 && response.result_info.total_pages !== pages)
        return finish('inconsistent-pagination');
      pages = response.result_info.total_pages;
      for (const record of response.result.deployments) {
        if (
          !uuid(record.id) ||
          record.versions.length !== 1 ||
          record.versions[0].percentage !== 100 ||
          !uuid(record.versions[0].version_id)
        )
          return finish('unsupported-traffic-assignment');
        const previous = records.get(record.id);
        if (previous && previous.versions[0].version_id !== record.versions[0].version_id)
          return finish('conflicting-deployment-identity');
        records.set(record.id, record);
      }
    }
    if (records.size === 0) return finish('no-deployments');
    const verified = new Map();
    for (const selected of records.values()) {
      const correlated = await evidenceRead({
        method: 'GET',
        path: `${base}/builds/builds?version_ids=${selected.versions[0].version_id}`,
      });
      const builds = Object.values(correlated.result.builds);
      if (
        builds.length !== 1 ||
        !uuid(builds[0].build_uuid) ||
        !sha(builds[0].build_trigger_metadata?.commit_hash)
      )
        return finish('version-build-correlation-unavailable');
      const build = builds[0];
      // No deployment selector: repeated activations for the same build remain ambiguous.
      const result = await verifyCloudflareActivation({
        target,
        candidate: {
          buildId: build.build_uuid,
          revision: build.build_trigger_metadata.commit_hash,
        },
        read: evidenceRead,
        onDiagnostic: (category) =>
          observations.push({ resource: 'activation-predicate', category }),
      });
      if (blocked) return finish(blocked);
      if (result.outcome === 'unverifiable') return finish('evidence-not-established');
      if (result.outcome === 'verified-activation') verified.set(result.deploymentId, result);
    }
    if (verified.size !== 1)
      return finish(verified.size > 1 ? 'ambiguous-activations' : 'no-eligible-activation');
    const result = [...verified.values()][0];
    // Known failed check supplies a candidate only; no Installing attestation is invented.
    const excluded = await verifyCloudflareActivation({
      target,
      candidate: { buildId: failedBuild, revision: failedRevision },
      read,
      onDiagnostic: (category) =>
        observations.push({ resource: 'known-failed-predicate', category }),
    });
    observations.push({
      resource: 'known-failed-candidate',
      successfullyActivated: excluded.outcome === 'verified-activation',
    });
    if (blocked) return finish(blocked);
    return finish(
      result.outcome === 'verified-activation'
        ? 'exact-activation-verified'
        : 'evidence-not-established',
      result,
    );
  } catch {
    return finish(blocked ?? 'unsupported-response-or-runtime-configuration');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await diagnoseCloudflare({ env: process.env });
  console.log(JSON.stringify(report));
  process.exitCode = report.result.outcome === 'verified-activation' ? 0 : 1;
}
