const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveId = (value) => Number.isSafeInteger(value) && value > 0;

/** Shape/identity validation only, not event authentication or production evidence. */
export function parseCloudflareCheckInput(event, { expectedAppId } = {}) {
  const invalid = () => ({ ok: false });
  if (
    !positiveId(expectedAppId) ||
    !object(event) ||
    event.action !== 'completed' ||
    !object(event.repository) ||
    event.repository.id !== 1402431564 ||
    event.repository.full_name !== 'mentalnote74/djamespoer.com' ||
    !object(event.check_run)
  )
    return invalid();
  const check = event.check_run;
  if (
    !positiveId(check.id) ||
    check.status !== 'completed' ||
    check.name !== 'Workers Builds: djamespoer-com' ||
    !object(check.app) ||
    check.app.id !== expectedAppId ||
    check.app.slug !== 'cloudflare-workers-and-pages' ||
    typeof check.head_sha !== 'string' ||
    check.head_sha.length !== 40 ||
    !/^[0-9a-f]{40}$/.test(check.head_sha) ||
    typeof check.external_id !== 'string' ||
    check.external_id.length !== 36 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(check.external_id)
  )
    return invalid();
  return {
    ok: true,
    input: {
      repository: 'mentalnote74/djamespoer.com',
      checkId: check.id,
      appId: expectedAppId,
      revision: check.head_sha,
      buildId: check.external_id,
    },
  };
}
