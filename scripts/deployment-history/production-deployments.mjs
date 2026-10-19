import { createHash } from 'node:crypto';

const unavailable = () => new Error('Production deployment history unavailable.');
/** GET-only, exact production Worker. No author, provider messages, IDs or credentials are published. */
export function createProductionDeploymentAcquisition({ accountId, getToken, fetcher = fetch }) {
  if (!/^[0-9a-f]{32}$/.test(accountId ?? '') || typeof getToken !== 'function')
    throw unavailable();
  return async () => {
    try {
      const records = [];
      let expectedCount;
      for (let page = 1; page <= 100; page++) {
        let body;
        try {
          const token = await getToken();
          if (typeof token !== 'string' || !token.trim()) throw unavailable();
          const response = await fetcher(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/djamespoer-com/deployments?page=${page}&per_page=100`,
            {
              method: 'GET',
              redirect: 'manual',
              signal: AbortSignal.timeout(15000),
              headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
            },
          );
          if (!response.ok || response.redirected) throw unavailable();
          const text = await response.text();
          if (text.length > 2_000_000) throw unavailable();
          body = JSON.parse(text);
        } catch {
          throw unavailable();
        }
        const info = body?.result_info;
        const items = body?.result?.deployments;
        if (
          body.success !== true ||
          !Array.isArray(items) ||
          items.length > 100 ||
          info?.page !== page ||
          info?.per_page !== 100 ||
          !Number.isSafeInteger(info?.total_pages) ||
          info.total_pages < page ||
          info.total_pages > 100 ||
          !Number.isSafeInteger(info.total_count) ||
          info.total_count < 0 ||
          info.total_count > 10000 ||
          info.total_pages !== Math.max(1, Math.ceil(info.total_count / 100)) ||
          (expectedCount !== undefined && expectedCount !== info.total_count) ||
          items.length !== Math.min(100, Math.max(0, info.total_count - (page - 1) * 100)) ||
          info.count !== items.length
        )
          throw unavailable();
        expectedCount = info.total_count;
        for (const item of items) {
          if (
            !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(item?.id ?? '') ||
            typeof item.created_on !== 'string' ||
            !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(item.created_on) ||
            !Number.isFinite(Date.parse(item.created_on)) ||
            new Date(item.created_on).toISOString().slice(0, 19) !== item.created_on.slice(0, 19) ||
            !Array.isArray(item.versions) ||
            !item.versions.length ||
            item.versions.some(
              (v) =>
                typeof v.percentage !== 'number' ||
                !Number.isFinite(v.percentage) ||
                v.percentage <= 0,
            ) ||
            Math.abs(item.versions.reduce((sum, v) => sum + v.percentage, 0) - 100) > 0.001
          )
            throw unavailable();
          records.push({
            id:
              'attempt-' +
              createHash('sha256')
                .update('public-worker-deployment:' + item.id)
                .digest('hex'),
            createdAt: new Date(item.created_on).toISOString(),
            environment: 'production',
            status: 'succeeded',
            stage: 'deployed',
            summary: 'Production deployment',
          });
        }
        if (page === info.total_pages) return records;
      }
      throw unavailable();
    } catch {
      throw unavailable();
    }
  };
}
