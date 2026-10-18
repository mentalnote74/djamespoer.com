import { parseData } from '../../src/app/components/buildometer/data/parse.ts';
import { acquireJira, type JiraConfig } from './jira.ts';
import { applyDeployments, deriveJira, emptyData } from './derive.ts';
import type { BuildometerData } from '../../src/app/components/buildometer/data/contract.ts';
export interface Env extends JiraConfig {
  ASSETS: { fetch(request: Request): Promise<Response> };
}
export function createHandler(acquire = acquireJira) {
  let pending: Promise<BuildometerData> | undefined,
    cached: BuildometerData | undefined,
    cachedAt = 0;
  return async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname !== '/api/buildometer') return env.ASSETS.fetch(request);
    if (request.method !== 'GET')
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
    if (url.search) return new Response('No query parameters supported', { status: 400 });
    const asset = async (path: string): Promise<unknown> => {
      const r = await env.ASSETS.fetch(new Request(new URL(path, url)));
      if (!r.ok) throw Error('Evidence unavailable');
      return r.json();
    };
    if (!cached || Date.now() - cachedAt > 900000) {
      pending ??= (async () => {
        const now = new Date().toISOString();
        let data = emptyData(now);
        try {
          data = deriveJira(await acquire(env));
        } catch {
          try {
            const fallback = parseData(await asset('/data/buildometer-jira.json'));
            if (
              fallback.schemaVersion !== 1 ||
              !fallback.sources?.jira?.fetchedAt ||
              !fallback.metrics ||
              !fallback.series
            )
              throw Error('Invalid retained metrics');
            data = structuredClone(fallback);
            data.generatedAt = now;
            data.sources.jira.status =
              Date.now() - Date.parse(data.sources.jira.fetchedAt!) > 86400000
                ? 'stale'
                : 'snapshot';
            data.sources.jira.message =
              'Retained connector capture; live Jira runtime is unavailable. Values retain their original source date.';
          } catch {
            /* Missing source stays unavailable, never zero. */
          }
        }
        await Promise.all([
          asset('/data/deployment-history.json')
            .then((v) => applyDeployments(data, v))
            .catch(() => {
              data.sources.deployments = {
                status: 'unavailable',
                fetchedAt: null,
                message: 'Deployment evidence unavailable.',
              };
              data.metrics.deployments = {
                value: null,
                unit: 'activations / 7 days',
                reason: 'Deployment source could not be read.',
              };
              data.series.deployments = [];
            }),
          asset('/data/product-journal.json')
            .then((v) => {
              const j = v as { entries?: BuildometerData['journal'] };
              if (Array.isArray(j.entries)) data.journal = j.entries;
            })
            .catch(() => {
              data.journal = [];
            }),
        ]);
        data.generatedAt = now;
        cached = data;
        cachedAt = Date.now();
        return data;
      })().finally(() => {
        pending = undefined;
      });
      await pending;
    }
    return Response.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' },
    });
  };
}
const handle = createHandler();
export default { fetch: handle };
