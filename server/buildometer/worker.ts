import { parseData } from '../../src/app/components/buildometer/data/parse.ts';
import { acquireJira, type JiraConfig } from './jira.ts';
import { applyDeployments, deriveJira, emptyData } from './derive.ts';
import { applyProject } from './project.ts';
import type { BuildometerData } from '../../src/app/components/buildometer/data/contract.ts';
import {
  readReports,
  generateDailyReport,
  applyDailyHistory,
  reportDue,
  type ReportEnv,
} from './daily-report.ts';
export interface Env extends ReportEnv {
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
        try {
          applyProject(data, await asset('/data/buildometer-project.json'));
        } catch {
          // Never substitute Jira inventory or sprint scope for approved project evidence.
          data.metrics.completion = {
            value: null,
            unit: '%',
            reason: 'Approved project observation unavailable.',
          };
          for (const key of ['done', 'remaining', 'scopeChange', 'burndown'] as const)
            data.metrics[key] = {
              value: null,
              unit: 'story points',
              reason: 'Approved project observation unavailable.',
            };
          data.series.scope = [];
          data.series.burndown = [];
          data.supportingFacts.project = undefined;
        }
        data.generatedAt = now;
        cached = data;
        cachedAt = Date.now();
        return data;
      })().finally(() => {
        pending = undefined;
      });
      await pending;
    }
    const response = structuredClone(cached!);
    try {
      applyDailyHistory(response, await readReports(env));
    } catch {
      response.dailyReports = [];
      response.dailyReportsStatus = 'unavailable';
    }
    return Response.json(response, {
      headers: { 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' },
    });
  };
}
const handle = createHandler();
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/buildometer/reports')) {
      if (url.search) return new Response('No query parameters supported', { status: 400 });
      if (url.pathname === '/api/buildometer/reports/generate') {
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
        if (
          !env.REPORT_GENERATION_TOKEN ||
          request.headers.get('Authorization') !== 'Bearer ' + env.REPORT_GENERATION_TOKEN
        )
          return new Response('Unauthorized', { status: 401 });
        try {
          const result = await generateDailyReport(env);
          return Response.json(
            { id: result.report.id, date: result.report.date, existing: result.existing },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        } catch {
          console.error('Daily report generation failed; retained archive unchanged.');
          return new Response('Report generation failed; previous reports retained', {
            status: 503,
          });
        }
      }
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      const match = /^\/api\/buildometer\/reports(?:\/(\d{4}-\d{2}-\d{2}))?$/.exec(url.pathname);
      if (!match) return new Response('Not found', { status: 404 });
      try {
        const archive = await readReports(env);
        const result = match[1] ? archive.reports.find((r) => r.date === match[1]) : archive;
        return result
          ? Response.json(result, {
              headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
            })
          : new Response('Report not found', { status: 404 });
      } catch {
        return new Response('Report archive unavailable', { status: 503 });
      }
    }
    return handle(request, env);
  },
  async scheduled(controller: { scheduledTime: number }, env: Env): Promise<void> {
    if (!reportDue(controller.scheduledTime)) return;
    try {
      const result = await generateDailyReport(env, { trigger: 'scheduled' });
      console.log(
        JSON.stringify({
          operation: 'daily-dev-report',
          id: result.report.id,
          existing: result.existing,
        }),
      );
    } catch {
      console.error(
        'Daily report scheduled collection failed; prior archive retained. Next hourly trigger retries.',
      );
      throw Error('Daily report collection failed');
    }
  },
};
