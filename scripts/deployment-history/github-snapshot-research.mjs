/** Legacy schema-v2 GitHub research, not the production pipeline path. */
const repository = 'https://api.github.com/repos/mentalnote74/djamespoer.com';
// Canonical repository ID observed in public GitHub pagination during Chunk 4 research.
const canonicalRepository = '/repositories/1402431564';

async function collection(url, fetcher) {
  const initialPath = new URL(url).pathname;
  const canonicalPath =
    canonicalRepository + initialPath.slice(new URL(repository).pathname.length);
  const records = [];
  const seen = new Set();
  while (url) {
    const target = new URL(url);
    if (
      target.origin !== 'https://api.github.com' ||
      target.username ||
      target.password ||
      (target.pathname !== initialPath && target.pathname !== canonicalPath)
    ) {
      throw new Error('Unexpected acquisition pagination target.');
    }
    if (seen.has(target.href)) throw new Error('Acquisition pagination loop.');
    seen.add(target.href);
    if (seen.size > 100) throw new Error('Acquisition pagination safety limit reached.');
    const response = await fetcher(target.href, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'djamespoer-history-generator',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Deployment history acquisition failed.');
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Invalid deployment history collection.');
    records.push(...page);
    const link = response.headers.get('link');
    const next = link?.split(',').find((part) => /;\s*rel="next"/.test(part));
    if (next && !/^\s*<([^>]+)>/.test(next))
      throw new Error('Invalid acquisition pagination link.');
    url = next ? /^\s*<([^>]+)>/.exec(next)[1] : null;
  }
  return records;
}

export async function createSnapshot({ fetcher = fetch, now = () => new Date() } = {}) {
  const deployments = await collection(`${repository}/deployments?per_page=100`, fetcher);
  const entries = [];
  for (const deployment of deployments) {
    if (!deployment || !Number.isSafeInteger(deployment.id) || deployment.id < 1) {
      throw new Error('Invalid deployment acquisition identity.');
    }
    const statuses = await collection(
      `${repository}/deployments/${deployment.id}/statuses?per_page=100`,
      fetcher,
    );
    entries.push({ deployment, statuses });
  }
  const { adaptGitHubDeployments } = await import('./load-adapter.mjs');
  const result = adaptGitHubDeployments(entries);
  if (!result.ok) throw new Error('Deployment history validation failed.');
  const checkedAt = now().toISOString();
  return {
    schemaVersion: 2,
    checkedAt,
    generatedAt: checkedAt,
    refreshStatus: 'ok',
    rows: result.rows,
  };
}
