/** Node-side only. The injected reader owns future authentication; no default network client. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sha = /^[0-9a-f]{40}$/;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const unknown = () => ({ outcome: 'unverifiable' });
const ineligible = () => ({ outcome: 'ineligible-pipeline' });

function buildContext(build, target, candidate, report) {
  if (!object(build) || build.build_uuid !== candidate.buildId) {
    report('build-uuid-mismatch');
    return 'unknown';
  }
  const metadata = build.build_trigger_metadata;
  const trigger = build.trigger;
  if (!object(metadata) || !object(trigger)) {
    report('build-context-missing');
    return 'unknown';
  }
  const expected = {
    provider_type: 'github',
    provider_account_name: 'mentalnote74',
    repo_name: 'djamespoer.com',
    branch: 'main',
    root_directory: '/',
    build_command: 'npm run build',
    deploy_command: 'npx wrangler deploy',
  };
  for (const [field, value] of Object.entries(expected)) {
    const category = ['provider_type', 'provider_account_name', 'repo_name'].includes(field)
      ? 'repository'
      : field === 'branch'
        ? 'branch'
        : 'production-context';
    if (typeof metadata[field] !== 'string') {
      report(`${category}-evidence-missing`);
      return 'unknown';
    }
    if (metadata[field] !== value) {
      report(`${category}-mismatch`);
      return 'ineligible';
    }
  }
  if (typeof trigger.trigger_uuid !== 'string' || typeof trigger.external_script_id !== 'string') {
    report('production-identity-evidence-missing');
    return 'unknown';
  }
  if (
    trigger.trigger_uuid !== target.triggerId ||
    trigger.external_script_id !== target.workerTag
  ) {
    report(
      trigger.trigger_uuid !== target.triggerId ? 'production-trigger-mismatch' : 'worker-mismatch',
    );
    return 'ineligible';
  }
  if (!sha.test(metadata.commit_hash) || metadata.commit_hash !== candidate.revision) {
    report('exact-revision-mismatch');
    return 'unknown';
  }
  return 'matching';
}

function deployment(value) {
  if (!object(value) || !uuid.test(value.id) || !Array.isArray(value.versions)) return null;
  if (value.versions.length !== 1) return null;
  const version = value.versions[0];
  return object(version) && uuid.test(version.version_id) && version.percentage === 100
    ? { deploymentId: value.id, versionId: version.version_id }
    : null;
}

/**
 * read({method:'GET', path}) returns untrusted Cloudflare JSON, never logs it.
 * target account/tag/trigger are trusted runtime configuration, not event input.
 * candidate.deploymentId optionally selects a specific historical activation.
 * preDeploymentFailure is independent, trusted operator/lifecycle evidence, NOT
 * an invented Cloudflare API field or a check conclusion. The caller must establish
 * its provenance before passing it; generic failed builds never supply it.
 */
export async function verifyCloudflareActivation({
  target,
  candidate,
  read,
  preDeploymentFailure,
  onDiagnostic,
}) {
  // Diagnostic observation cannot change evidence decisions or escape private values.
  const report = (category) => {
    try {
      if (typeof onDiagnostic === 'function') onDiagnostic(category);
    } catch {
      /* Ignore observer failure. */
    }
  };
  const fail = (category) => {
    report(category);
    return unknown();
  };
  try {
    if (
      !object(target) ||
      !/^[0-9a-f]{32}$/.test(target.accountId) ||
      !/^[0-9a-f]{32}$/.test(target.workerTag) ||
      !uuid.test(target.triggerId) ||
      target.workerName !== 'djamespoer-com' ||
      !object(candidate) ||
      !uuid.test(candidate.buildId) ||
      !sha.test(candidate.revision) ||
      (candidate.deploymentId !== undefined && !uuid.test(candidate.deploymentId)) ||
      typeof read !== 'function'
    )
      return fail('invalid-verification-input');
    const base = `/accounts/${target.accountId}`;
    async function get(path) {
      const response = await read({ method: 'GET', path });
      if (!object(response) || response.success !== true || !object(response.result))
        throw new Error('Unavailable evidence');
      return response;
    }
    const build = (await get(`${base}/builds/builds/${candidate.buildId}`)).result;
    const context = buildContext(build, target, candidate, report);
    if (context === 'unknown') return unknown();
    if (context === 'ineligible') return ineligible();
    if (build.status !== 'stopped' || build.build_outcome !== 'success') {
      if (
        build.status === 'stopped' &&
        build.build_outcome === 'fail' &&
        object(preDeploymentFailure) &&
        preDeploymentFailure.buildId === candidate.buildId &&
        preDeploymentFailure.revision === candidate.revision &&
        ['Initializing', 'Cloning', 'Installing', 'Building'].includes(preDeploymentFailure.stage)
      )
        return ineligible();
      return fail('build-success-not-established');
    }
    const script = `${base}/workers/scripts/${target.workerName}/deployments`;
    const records = new Map();
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
      const response = await get(`${script}?page=${page}&per_page=100`);
      if (!Array.isArray(response.result.deployments)) return fail('deployment-list-malformed');
      const info = response.result_info;
      if (
        !object(info) ||
        info.page !== page ||
        !Number.isSafeInteger(info.total_pages) ||
        info.total_pages < 1 ||
        info.total_pages > 100 ||
        (page > 1 && info.total_pages !== pages)
      )
        return fail('pagination-incomplete-or-inconsistent');
      pages = info.total_pages;
      for (const record of response.result.deployments) {
        const projection = deployment(record);
        // Unsupported/malformed traffic assignments prevent complete verification.
        if (!projection) return fail('deployment-version-traffic-mismatch');
        const previous = records.get(projection.deploymentId);
        if (previous && previous.versionId !== projection.versionId)
          return fail('conflicting-deployment-identity');
        records.set(projection.deploymentId, projection);
      }
    }
    const matches = [];
    const versions = new Map();
    for (const record of records.values()) {
      if (candidate.deploymentId !== undefined && record.deploymentId !== candidate.deploymentId)
        continue;
      if (!versions.has(record.versionId)) {
        const response = await get(`${base}/builds/builds?version_ids=${record.versionId}`);
        if (!object(response.result.builds)) return fail('version-build-correlation-missing');
        // Query one version; do not assume undocumented map-key semantics.
        const builds = Object.values(response.result.builds);
        if (builds.length === 0) return fail('version-build-correlation-empty');
        if (builds.length > 1) return fail('version-build-correlation-multiple');
        if (!object(builds[0]) || !uuid.test(builds[0].build_uuid))
          return fail('version-build-correlation-invalid-build-uuid');
        versions.set(record.versionId, builds[0]);
      }
      const correlated = versions.get(record.versionId);
      if (correlated.build_uuid !== candidate.buildId) {
        report('build-uuid-not-matching-candidate');
        continue;
      }
      if (
        buildContext(correlated, target, candidate, report) !== 'matching' ||
        correlated.status !== 'stopped' ||
        correlated.build_outcome !== 'success'
      )
        return fail('correlated-build-evidence-not-established');
      matches.push(record);
    }
    if (matches.length !== 1)
      return fail(
        matches.length === 0 ? 'no-deployment-candidate-matched' : 'ambiguous-matching-activations',
      );
    const match = matches[0];
    const reread = deployment((await get(`${script}/${match.deploymentId}`)).result);
    if (
      !reread ||
      reread.deploymentId !== match.deploymentId ||
      reread.versionId !== match.versionId
    )
      return fail('confirming-deployment-reread-mismatch');
    // Proves historical activation, never claims this is the current production version.
    return {
      outcome: 'verified-activation',
      deploymentId: match.deploymentId,
      versionId: match.versionId,
      buildId: candidate.buildId,
      revision: candidate.revision,
      target: 'djamespoer-com',
      environment: 'production',
    };
  } catch {
    return fail('evidence-read-or-shape-unavailable');
  }
}
