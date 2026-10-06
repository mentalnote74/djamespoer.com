const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const unavailable = () => new Error('Cloudflare evidence read unavailable.');

function fields(value, names) {
  if (!object(value)) throw unavailable();
  const result = {};
  for (const name of names) {
    if (!Object.hasOwn(value, name)) continue;
    if (typeof value[name] !== 'string') throw unavailable();
    result[name] = value[name];
  }
  return result;
}
function build(value) {
  const result = fields(value, ['build_uuid', 'status', 'build_outcome']);
  if (!result.build_uuid || !result.status || !result.build_outcome) throw unavailable();
  if (Object.hasOwn(value, 'build_trigger_metadata'))
    result.build_trigger_metadata = fields(value.build_trigger_metadata, [
      'provider_type',
      'provider_account_name',
      'repo_name',
      'branch',
      'root_directory',
      'build_command',
      'deploy_command',
      'commit_hash',
    ]);
  if (Object.hasOwn(value, 'trigger'))
    result.trigger = fields(value.trigger, ['trigger_uuid', 'external_script_id']);
  return result;
}

// Pipeline history has different requirements from the retained activation verifier:
// a queued/running attempt need not have a terminal outcome.
function historyBuild(value) {
  if (!object(value)) return null;
  const pick = (source, names) =>
    Object.fromEntries(
      names
        .filter((name) => object(source) && typeof source[name] === 'string')
        .map((name) => [name, source[name]]),
    );
  return {
    ...pick(value, ['build_uuid', 'status', 'created_on', 'build_outcome']),
    build_trigger_metadata: pick(value.build_trigger_metadata, [
      'provider_type',
      'provider_account_name',
      'repo_name',
      'branch',
      'deploy_command',
      'commit_hash',
      'commit_message',
    ]),
    trigger: pick(value.trigger, ['external_script_id']),
  };
}
function historyPage(body) {
  if (!Array.isArray(body.result) || body.result.length > 200) throw unavailable();
  const info = object(body.result_info) ? body.result_info : {};
  // Optional numeric hints only. Never follow provider URLs or require optional counts.
  const hints = Object.fromEntries(
    ['total_pages', 'per_page']
      .filter((key) => Number.isSafeInteger(info[key]) && info[key] > 0)
      .map((key) => [key, info[key]]),
  );
  return { success: true, result: body.result.map(historyBuild), result_info: hints };
}
function deployment(value) {
  const result = fields(value, ['id']);
  if (!result.id) throw unavailable();
  if (!Array.isArray(value.versions)) throw unavailable();
  result.versions = value.versions.map((version) => {
    const projected = fields(version, ['version_id']);
    if (typeof version.percentage !== 'number' || !Number.isFinite(version.percentage))
      throw unavailable();
    return { ...projected, percentage: version.percentage };
  });
  return result;
}

// These documented list endpoints have no page query parameter. Refuse any
// response indicating partial pagination instead of inventing a follow-up URL.
function completeList(body) {
  if (!Array.isArray(body.result) || body.result.length > 1000) throw unavailable();
  if (Object.hasOwn(body, 'result_info')) {
    const info = body.result_info;
    if (
      !object(info) ||
      info.page !== 1 ||
      info.total_pages !== 1 ||
      info.count !== body.result.length ||
      info.total_count !== body.result.length ||
      Object.keys(info).some(
        (key) => !['page', 'total_pages', 'count', 'total_count', 'per_page'].includes(key),
      )
    )
      throw unavailable();
  }
  return body.result;
}

function worker(value) {
  const result = fields(value, ['id', 'tag']);
  if (
    !result.id ||
    typeof result.tag !== 'string' ||
    result.tag.length !== 32 ||
    !/^[0-9a-f]{32}$/.test(result.tag)
  )
    throw unavailable();
  return result;
}

function trigger(value) {
  const result = fields(value, [
    'trigger_uuid',
    'external_script_id',
    'root_directory',
    'build_command',
    'deploy_command',
  ]);
  if (
    typeof result.trigger_uuid !== 'string' ||
    result.trigger_uuid.length !== 36 ||
    !new RegExp(`^${uuid}$`).test(result.trigger_uuid) ||
    typeof result.external_script_id !== 'string' ||
    result.external_script_id.length !== 32 ||
    !/^[0-9a-f]{32}$/.test(result.external_script_id) ||
    ['root_directory', 'build_command', 'deploy_command'].some((key) => !result[key])
  )
    throw unavailable();
  result.repo_connection = fields(value.repo_connection, [
    'provider_type',
    'provider_account_name',
    'repo_name',
  ]);
  if (Object.values(result.repo_connection).length !== 3) throw unavailable();
  for (const name of ['branch_includes', 'branch_excludes']) {
    if (!Array.isArray(value[name]) || value[name].some((item) => typeof item !== 'string'))
      throw unavailable();
    result[name] = [...value[name]];
  }
  result.active = value.deleted_on == null && value.repo_connection.deleted_on == null;
  return result;
}

/** Pinned-origin, GET-only transport. Credentials exist only in the external getter/runtime. */
export function createCloudflareReader({
  accountId,
  getToken,
  fetcher = fetch,
  timeoutMs = 15000,
}) {
  if (
    typeof accountId !== 'string' ||
    accountId.length !== 32 ||
    !/^[0-9a-f]{32}$/.test(accountId) ||
    typeof fetcher !== 'function' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 15000
  )
    throw unavailable();
  const base = `/accounts/${accountId}`;
  function resource(request) {
    if (
      !object(request) ||
      request.method !== 'GET' ||
      typeof request.path !== 'string' ||
      /[\s%#\\]/.test(request.path)
    )
      throw unavailable();
    if (request.path === `${base}/workers/scripts`)
      return { path: `${base}/workers/scripts`, kind: 'workers' };
    let match = new RegExp(`^${base}/builds/workers/([0-9a-f]{32})/triggers$`).exec(request.path);
    if (match) return { path: `${base}/builds/workers/${match[1]}/triggers`, kind: 'triggers' };
    match = new RegExp(
      `^${base}/builds/workers/([0-9a-f]{32})/builds\\?page=([1-9][0-9]{0,2})&per_page=100$`,
    ).exec(request.path);
    if (match && Number(match[2]) <= 100)
      return {
        path: `${base}/builds/workers/${match[1]}/builds?page=${Number(match[2])}&per_page=100`,
        kind: 'history',
        page: Number(match[2]),
      };
    match = new RegExp(`^${base}/builds/builds/(${uuid})$`).exec(request.path);
    if (match) return { path: `${base}/builds/builds/${match[1]}`, kind: 'build' };
    match = new RegExp(`^${base}/builds/builds\\?version_ids=(${uuid})$`).exec(request.path);
    if (match) return { path: `${base}/builds/builds?version_ids=${match[1]}`, kind: 'versions' };
    match = new RegExp(`^${base}/workers/scripts/djamespoer-com/deployments/(${uuid})$`).exec(
      request.path,
    );
    if (match)
      return {
        path: `${base}/workers/scripts/djamespoer-com/deployments/${match[1]}`,
        kind: 'deployment',
      };
    match = new RegExp(
      `^${base}/workers/scripts/djamespoer-com/deployments\\?page=([1-9][0-9]{0,2})&per_page=100$`,
    ).exec(request.path);
    if (match && Number(match[1]) <= 100)
      return {
        path: `${base}/workers/scripts/djamespoer-com/deployments?page=${Number(match[1])}&per_page=100`,
        kind: 'page',
        page: Number(match[1]),
      };
    throw unavailable();
  }
  return async function read(request) {
    let timer;
    const controller = new AbortController();
    try {
      const selected = resource(request);
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(unavailable());
        }, timeoutMs);
      });
      return await Promise.race([
        timeout,
        (async () => {
          const token = typeof getToken === 'function' ? await getToken() : undefined;
          if (controller.signal.aborted || typeof token !== 'string' || !token.trim())
            throw unavailable();
          const response = await fetcher(`https://api.cloudflare.com/client/v4${selected.path}`, {
            method: 'GET',
            redirect: 'error',
            signal: controller.signal,
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          });
          if (
            !response ||
            !response.ok ||
            response.status < 200 ||
            response.status >= 300 ||
            response.redirected
          )
            throw unavailable();
          const text = await response.text();
          if (text.length > 2_000_000) throw unavailable();
          const body = JSON.parse(text);
          if (!object(body) || body.success !== true) throw unavailable();
          if (selected.kind === 'history') return historyPage(body, selected.page);
          if (selected.kind === 'workers' || selected.kind === 'triggers') {
            const values = completeList(body);
            return {
              success: true,
              result: values.map(selected.kind === 'workers' ? worker : trigger),
            };
          }
          if (!object(body.result)) throw unavailable();
          let result;
          let result_info;
          if (selected.kind === 'build') result = build(body.result);
          else if (selected.kind === 'deployment') result = deployment(body.result);
          else if (selected.kind === 'versions') {
            if (!object(body.result.builds)) throw unavailable();
            // Opaque response-map keys are not needed by the verifier and may carry arbitrary text.
            result = {
              builds: Object.fromEntries(
                Object.values(body.result.builds).map((value, index) => [
                  String(index),
                  build(value),
                ]),
              ),
            };
          } else {
            const info = body.result_info;
            if (
              !object(info) ||
              info.page !== selected.page ||
              !Number.isSafeInteger(info.total_pages) ||
              info.total_pages < selected.page ||
              info.total_pages > 100 ||
              !Array.isArray(body.result.deployments) ||
              body.result.deployments.length > 100
            )
              throw unavailable();
            result = { deployments: body.result.deployments.map(deployment) };
            result_info = { page: info.page, total_pages: info.total_pages };
          }
          return { success: true, result, ...(result_info ? { result_info } : {}) };
        })(),
      ]);
    } catch {
      controller.abort();
      // Do not retain the original cause, token, response body/headers, or private URL data.
      throw unavailable();
    } finally {
      clearTimeout(timer);
    }
  };
}
