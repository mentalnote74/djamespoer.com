import { createHash } from 'node:crypto';
import { createCloudflareReader } from './cloudflare-reader.mjs';
import { normalizeDeploymentHistory } from './load-adapter.mjs';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const tag = (value) => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
const failure = (category) =>
  Object.assign(new Error('Cloudflare build history unavailable.'), { category });
const production = Object.freeze({
  workerName: 'djamespoer-com',
  provider: 'github',
  owner: 'mentalnote74',
  repository: 'djamespoer.com',
  branch: 'main',
  root: '/',
  buildCommand: 'npm run build',
});

/** Independent GET discovery; candidate build metadata never establishes trusted scope. */
export async function discoverProductionBuildScope({ accountId, read }) {
  const base = `/accounts/${accountId}`;
  const workers = (await read({ method: 'GET', path: `${base}/workers/scripts` })).result;
  if (!Array.isArray(workers)) throw failure('scope-discovery');
  const matches = workers.filter((worker) => object(worker) && worker.id === production.workerName);
  if (matches.length !== 1 || !tag(matches[0].tag)) throw failure('scope-discovery');
  const workerTag = matches[0].tag;
  const triggers = (
    await read({ method: 'GET', path: `${base}/builds/workers/${workerTag}/triggers` })
  ).result;
  if (!Array.isArray(triggers)) throw failure('scope-discovery');
  const selected = triggers.filter(
    (trigger) =>
      object(trigger) &&
      trigger.active === true &&
      trigger.external_script_id === workerTag &&
      trigger.repo_connection?.provider_type === production.provider &&
      trigger.repo_connection?.provider_account_name === production.owner &&
      trigger.repo_connection?.repo_name === production.repository &&
      Array.isArray(trigger.branch_includes) &&
      trigger.branch_includes.length === 1 &&
      trigger.branch_includes[0] === production.branch &&
      Array.isArray(trigger.branch_excludes) &&
      trigger.branch_excludes.length === 0 &&
      trigger.root_directory === production.root &&
      trigger.build_command === production.buildCommand,
  );
  if (
    selected.length !== 1 ||
    !uuid(selected[0].trigger_uuid) ||
    typeof selected[0].deploy_command !== 'string' ||
    !selected[0].deploy_command.trim()
  )
    throw failure('scope-discovery');
  return Object.freeze({
    ...production,
    workerTag,
    triggerId: selected[0].trigger_uuid,
    deployCommand: selected[0].deploy_command,
    environment: 'production',
  });
}

function createdAt(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) return null;
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  return Number.isFinite(Date.parse(canonical)) && new Date(canonical).toISOString() === canonical
    ? canonical
    : null;
}
function statusOf(record) {
  if (record.status === 'queued') return 'queued';
  if (record.status === 'initializing' || record.status === 'running') return 'in-progress';
  if (record.status !== 'stopped') return null;
  const outcomes = {
    success: 'succeeded',
    fail: 'failed',
    cancelled: 'cancelled',
    skipped: 'skipped',
    terminated: 'terminated',
  };
  return typeof record.build_outcome === 'string' && Object.hasOwn(outcomes, record.build_outcome)
    ? outcomes[record.build_outcome]
    : null;
}
function notify(observer, category) {
  try {
    observer?.(category);
  } catch {
    /* Reporting cannot change acquisition. */
  }
}

/** Small public projection. Optional historical facts degrade; unsafe required records are omitted. */
export function adaptCloudflareBuilds(records, scope, onDiagnostic) {
  if (
    !Array.isArray(records) ||
    !object(scope) ||
    !tag(scope.workerTag) ||
    scope.environment !== 'production'
  )
    throw failure('source-validation');
  const rows = [];
  for (const record of records) {
    notify(onDiagnostic, 'records-observed');
    const metadata = record?.build_trigger_metadata;
    if (!object(record) || !uuid(record.build_uuid) || !object(metadata)) {
      notify(onDiagnostic, 'omitted-structural-record');
      continue;
    }
    if (
      metadata.provider_type !== scope.provider ||
      metadata.provider_account_name !== scope.owner ||
      metadata.repo_name !== scope.repository ||
      metadata.branch !== scope.branch ||
      (record.trigger?.external_script_id && record.trigger.external_script_id !== scope.workerTag)
    ) {
      notify(onDiagnostic, 'omitted-outside-production-scope');
      continue;
    }
    const time = createdAt(record.created_on);
    const status = statusOf(record);
    if (!time || !status) {
      notify(onDiagnostic, !time ? 'omitted-invalid-timestamp' : 'omitted-unknown-outcome');
      continue;
    }
    const sourceRevision = metadata.commit_hash;
    const revision =
      typeof sourceRevision === 'string' &&
      /^[0-9a-fA-F]{7,40}$/.test(sourceRevision) &&
      sourceRevision.length <= 40 &&
      sourceRevision === sourceRevision.trim()
        ? sourceRevision.slice(0, 7)
        : undefined;
    if (!revision) notify(onDiagnostic, 'revision-unavailable');
    // Public summary is an optional bounded first line, never a log/status fallback.
    const subject =
      typeof metadata.commit_message === 'string'
        ? metadata.commit_message.split(/\r?\n/, 1)[0].trim()
        : '';
    const summary =
      subject && !/[\u0000-\u001f\u007f]/.test(subject)
        ? subject.slice(0, 240).replace(/[\uD800-\uDBFF]$/, '')
        : undefined;
    const deployed =
      status === 'succeeded' &&
      scope.deployCommand === 'npx wrangler deploy' &&
      metadata.deploy_command === 'npx wrangler deploy';
    rows.push({
      id:
        'attempt-' +
        createHash('sha256')
          .update('public-build-attempt:' + record.build_uuid)
          .digest('hex'),
      createdAt: time,
      environment: 'production',
      status,
      ...(revision ? { revision } : {}),
      ...(summary ? { summary } : {}),
      ...(deployed ? { stage: 'deployed' } : {}),
    });
  }
  if (records.length && !rows.length) throw failure('no-usable-records');
  const normalized = normalizeDeploymentHistory(rows);
  if (!normalized.ok) throw failure('neutral-validation');
  return normalized.rows;
}

/** Out-of-browser only. External credentials; acquisition itself never writes. */
export function createCloudflareBuildAcquisition({
  accountId,
  getToken,
  fetcher,
  timeoutMs,
  onDiagnostic,
}) {
  const read = createCloudflareReader({ accountId, getToken, fetcher, timeoutMs });
  return async () => {
    try {
      const scope = await discoverProductionBuildScope({ accountId, read });
      const records = [];
      let ended = false;
      for (let page = 1; page <= 100; page++) {
        const response = await read({
          method: 'GET',
          path: `/accounts/${accountId}/builds/workers/${scope.workerTag}/builds?page=${page}&per_page=100`,
        });
        notify(onDiagnostic, 'pages-read');
        records.push(...response.result);
        if (records.length > 10000) throw failure('pagination-limit');
        const hints = response.result_info;
        if (hints.total_pages > 100) throw failure('pagination-limit');
        const pageSize = hints.per_page && hints.per_page <= 200 ? hints.per_page : 100;
        if (
          !response.result.length ||
          (hints.total_pages ? page >= hints.total_pages : response.result.length < pageSize)
        ) {
          ended = true;
          break;
        }
      }
      if (!ended) throw failure('pagination-limit');
      return adaptCloudflareBuilds(records, scope, onDiagnostic);
    } catch (error) {
      const categories = [
        'scope-discovery',
        'source-validation',
        'no-usable-records',
        'neutral-validation',
        'pagination-limit',
      ];
      throw failure(categories.includes(error?.category) ? error.category : 'acquisition');
    }
  };
}
