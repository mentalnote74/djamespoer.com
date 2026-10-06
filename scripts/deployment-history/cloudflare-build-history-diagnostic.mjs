import { pathToFileURL } from 'node:url';
import { createCloudflareBuildAcquisition } from './cloudflare-build-history.mjs';

/** Read-only diagnostic: counts/categories only, never provider values or snapshots. */
export async function diagnoseCloudflareBuildHistory({ env, fetcher = fetch, timeoutMs } = {}) {
  const report = { resources: [], counts: {}, outcome: 'unavailable', reason: null, publicRows: 0 };
  if (!env?.CLOUDFLARE_API_TOKEN || !env?.CLOUDFLARE_ACCOUNT_ID) {
    report.reason = 'runtime-configuration';
    return report;
  }
  const safeFetch = async (url, options) => {
    const path = new URL(url).pathname;
    const resource = path.endsWith('/scripts')
      ? 'worker-list'
      : path.endsWith('/triggers')
        ? 'trigger-list'
        : 'build-history';
    try {
      const response = await fetcher(url, options);
      report.resources.push({ resource, httpSuccess: response.ok });
      return response;
    } catch {
      report.resources.push({ resource, httpSuccess: false });
      throw new Error('Read unavailable.');
    }
  };
  try {
    const acquire = createCloudflareBuildAcquisition({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      getToken: () => env.CLOUDFLARE_API_TOKEN,
      fetcher: safeFetch,
      timeoutMs,
      onDiagnostic: (category) => {
        report.counts[category] = (report.counts[category] ?? 0) + 1;
      },
    });
    const rows = await acquire();
    report.publicRows = rows.length;
    report.outcome = 'usable-history';
  } catch (error) {
    const allowed = [
      'scope-discovery',
      'source-validation',
      'no-usable-records',
      'neutral-validation',
      'pagination-limit',
      'acquisition',
    ];
    report.reason = allowed.includes(error?.category) ? error.category : 'acquisition';
  }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await diagnoseCloudflareBuildHistory({ env: process.env });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.outcome === 'usable-history' ? 0 : 1;
}
