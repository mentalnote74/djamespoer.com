import { validateDeploymentSnapshot } from './load-adapter.mjs';
/** Public, pinned archive: clean CI checkouts must retain previously published history too. */
export async function readPublishedHistory(fetcher = fetch) {
  try {
    const response = await fetcher('https://djamespoer.com/data/deployment-history.json', {
      method: 'GET',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok || response.redirected) throw new Error();
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error();
    const result = validateDeploymentSnapshot(JSON.parse(text));
    if (!result.ok) throw new Error();
    return result.snapshot.rows;
  } catch {
    throw new Error('Published history archive unavailable.');
  }
}
