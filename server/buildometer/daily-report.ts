import { acquireJira, type JiraConfig } from './jira.ts';
import { completionWindow } from './event-metrics.ts';
import { applyProject } from './project.ts';
import { emptyData } from './derive.ts';
import { PROJECT_MEMBERS } from './project-members.generated.ts';
import { createProductionDeploymentAcquisition } from '../../scripts/deployment-history/production-deployments.mjs';
import type {
  DailyDevReport,
  DailyReportArchive,
} from '../../src/app/components/buildometer/data/daily-report.ts';
import type { BuildometerData, Point } from '../../src/app/components/buildometer/data/contract.ts';
interface StoredObject {
  etag: string;
  json(): Promise<unknown>;
}
export interface ReportBucket {
  get(key: string): Promise<StoredObject | null>;
  put(
    key: string,
    value: string,
    options: {
      onlyIf: { etagMatches?: string; etagDoesNotMatch?: string };
      httpMetadata: { contentType: string };
    },
  ): Promise<unknown | null>;
}
export interface ReportEnv extends JiraConfig {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DAILY_REPORTS?: ReportBucket;
  REPORT_GENERATION_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  DEPLOYMENT_HISTORY_READ_TOKEN?: string;
  CF_VERSION_METADATA?: { id: string; timestamp: string; tag?: string };
}
const key = 'daily-dev-reports/v1.json';
export const easternDate = (time: number) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time));
export const reportDue = (time: number) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(time)),
  ) >= 10;
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid report evidence');
  return v as Record<string, unknown>;
};
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw Error('Unexpected report fields');
};
export function validateArchive(value: unknown): DailyReportArchive {
  const a = record(value);
  onlyKeys(a, ['schemaVersion', 'reports']);
  if (a['schemaVersion'] !== 1 || !Array.isArray(a['reports'])) throw Error('Invalid archive');
  let prior = '';
  for (const raw of a['reports']) {
    const r = record(raw);
    onlyKeys(r, [
      'schemaVersion',
      'trigger',
      'id',
      'date',
      'observedAt',
      'windowStart',
      'previousId',
      'release',
      'project',
      'projectStatus',
      'scopeChange',
      'jira',
      'deployments',
      'evidence',
    ]);
    if (
      r['schemaVersion'] !== 1 ||
      !['manual', 'scheduled'].includes(String(r['trigger'])) ||
      !['approved-snapshot', 'stale', 'unavailable'].includes(String(r['projectStatus']))
    )
      throw Error('Invalid report version/status');
    if (
      typeof r['date'] !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r['date']) ||
      r['date'] <= prior ||
      r['id'] !== 'daily-dev-report:' + r['date'] ||
      !Number.isFinite(Date.parse(String(r['observedAt']))) ||
      !Number.isFinite(Date.parse(String(r['windowStart']))) ||
      Date.parse(String(r['windowStart'])) > Date.parse(String(r['observedAt']))
    )
      throw Error('Invalid archive chronology');
    const release = record(r['release']);
    onlyKeys(release, ['sha', 'workerVersion']);
    if (easternDate(Date.parse(String(r['observedAt']))) !== r['date'])
      throw Error('Invalid report day');
    if (
      release['sha'] !== null &&
      (typeof release['sha'] !== 'string' || !/^[a-f0-9]{40}$/.test(release['sha']))
    )
      throw Error('Invalid release');
    if (r['project'] !== null) {
      const p = record(r['project']);
      onlyKeys(p, [
        'baselineId',
        'total',
        'shipped',
        'remaining',
        'completion',
        'sourceObservedAt',
      ]);
      for (const k of ['total', 'shipped', 'remaining', 'completion'])
        if (typeof p[k] !== 'number' || !Number.isFinite(p[k]))
          throw Error('Invalid project observation');
      if (
        Number(p['total']) <= 0 ||
        Number(p['shipped']) < 0 ||
        Number(p['remaining']) < 0 ||
        Number(p['total']) !== Number(p['shipped']) + Number(p['remaining']) ||
        p['completion'] !== Math.round((Number(p['shipped']) / Number(p['total'])) * 1000) / 10
      )
        throw Error('Inconsistent project observation');
    }
    for (const name of ['jira', 'deployments']) {
      const source = record(r[name]);
      onlyKeys(
        source,
        name === 'jira'
          ? ['completed', 'openBugLabelled', 'status', 'fetchedAt', 'note']
          : ['count', 'status', 'fetchedAt', 'note'],
      );
      if (typeof source['note'] !== 'string') throw Error('Invalid source note');
      for (const k of name === 'jira' ? ['completed', 'openBugLabelled'] : ['count'])
        if (
          source[k] !== null &&
          (typeof source[k] !== 'number' ||
            !Number.isSafeInteger(source[k]) ||
            Number(source[k]) < 0)
        )
          throw Error('Invalid source count');
    }
    const evidence = record(r['evidence']);
    onlyKeys(evidence, ['projectSha256', 'method']);
    if (r['scopeChange'] !== null) {
      const change = record(r['scopeChange']);
      onlyKeys(change, ['net', 'added', 'removed', 'reestimated']);
      for (const k of ['net', 'added', 'removed', 'reestimated'])
        if (typeof change[k] !== 'number' || !Number.isFinite(change[k]))
          throw Error('Invalid scope delta');
    }
    if (prior && r['previousId'] !== 'daily-dev-report:' + prior)
      throw Error('Broken report linkage');
    prior = r['date'];
  }
  return value as DailyReportArchive;
}
export async function readReports(env: ReportEnv): Promise<DailyReportArchive> {
  if (!env.DAILY_REPORTS) throw Error('Report archive unavailable');
  const o = await env.DAILY_REPORTS.get(key);
  return o ? validateArchive(await o.json()) : { schemaVersion: 1, reports: [] };
}
const asset = async (env: ReportEnv, path: string): Promise<unknown> => {
  const r = await env.ASSETS.fetch(new Request('https://djamespoer.com' + path));
  if (!r.ok) throw Error('Evidence unavailable');
  return r.json();
};
export async function generateDailyReport(
  env: ReportEnv,
  dependencies: {
    now?: () => number;
    acquire?: typeof acquireJira;
    deployments?: () => Promise<unknown[]>;
    trigger?: 'scheduled' | 'manual';
  } = {},
): Promise<{ report: DailyDevReport; existing: boolean }> {
  const cutoff = (dependencies.now ?? Date.now)(),
    date = easternDate(cutoff);
  if (!env.DAILY_REPORTS) throw Error('Report archive unavailable');
  const stored = await env.DAILY_REPORTS.get(key);
  const archive = stored
    ? validateArchive(await stored.json())
    : { schemaVersion: 1 as const, reports: [] };
  const existing = archive.reports.find((r) => r.date === date);
  if (existing) return { report: existing, existing: true };
  const previous = archive.reports.at(-1);
  if (previous && previous.date > date) throw Error('Cannot backfill history');
  let projection: unknown,
    project: DailyDevReport['project'] = null,
    projectStatus: DailyDevReport['projectStatus'] = 'unavailable',
    projectHash: string | null = null,
    scopeChange: DailyDevReport['scopeChange'] = null;
  let t0: string | null = null;
  try {
    projection = await asset(env, '/data/buildometer-project.json');
    const data = emptyData(new Date(cutoff).toISOString());
    applyProject(data, projection);
    const p = data.supportingFacts.project!;
    if (Date.parse(p.observedAt) > cutoff) throw Error('Future project evidence');
    project = {
      baselineId: p.baselineId,
      total: p.total,
      shipped: p.shipped,
      remaining: p.remaining,
      completion: data.metrics.completion.value!,
      sourceObservedAt: p.observedAt,
    };
    projectStatus = 'approved-snapshot';
    t0 = p.t0;
    projectHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(projection))),
      ),
    )
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    const source = projection as {
      observations: {
        date: string;
        total: number;
        added: number;
        removed: number;
        reestimated: number;
      }[];
    };
    if (!previous || (previous.projectStatus === 'approved-snapshot' && previous.project)) {
      const after = previous?.project?.sourceObservedAt ?? p.t0;
      const changes = source.observations.filter(
        (o) => Date.parse(o.date) > Date.parse(after) && Date.parse(o.date) <= cutoff,
      );
      scopeChange = {
        net: p.total - (previous?.project?.total ?? source.observations[0].total),
        added: changes.reduce((n, o) => n + o.added, 0),
        removed: changes.reduce((n, o) => n + o.removed, 0),
        reestimated: changes.reduce((n, o) => n + o.reestimated, 0),
      };
    }
  } catch {
    if (previous?.project) {
      project = previous.project;
      projectStatus = 'stale';
    }
  }
  if (!t0 && !previous) throw Error('Opening approved baseline unavailable; history not advanced');
  const windowStart = previous?.observedAt ?? t0!;
  if (Date.parse(windowStart) > cutoff) throw Error('Invalid observation window');
  let sha: string | null = null;
  try {
    const release = record(await asset(env, '/data/buildometer-release.json'));
    if (typeof release['sha'] === 'string' && /^[a-f0-9]{40}$/.test(release['sha']))
      sha = release['sha'];
  } catch {
    /* Explicitly unavailable. */
  }
  const report: DailyDevReport = {
    trigger: dependencies.trigger ?? 'manual',
    schemaVersion: 1,
    id: 'daily-dev-report:' + date,
    date,
    observedAt: new Date(cutoff).toISOString(),
    windowStart,
    previousId: previous?.id ?? null,
    release: { sha, workerVersion: env.CF_VERSION_METADATA?.id ?? null },
    project,
    projectStatus,
    scopeChange,
    jira: {
      completed: null,
      openBugLabelled: null,
      status: 'unavailable',
      fetchedAt: null,
      note: 'Live Jira credentials/acquisition unavailable; retained metrics are not current daily events or current bug labels.',
    },
    deployments: {
      count: null,
      status: 'unavailable',
      fetchedAt: null,
      note: 'Live production deployment acquisition unavailable.',
    },
    evidence: {
      projectSha256: projectHash,
      method:
        'Approved Buildometer project contract; existing Jira completion replay and production deployment adapter. Daily cutoff uses actual collection time, Eastern calendar date; no pre-T0 history or velocity. Approved point snapshot is not inferred from Jira Done.',
    },
  };
  await Promise.all([
    (async () => {
      try {
        const facts = await (dependencies.acquire ?? acquireJira)(env);
        facts.issues = facts.issues.filter((i) =>
          (PROJECT_MEMBERS as readonly string[]).includes(i.key),
        );
        report.jira = {
          completed: completionWindow(facts, windowStart, report.observedAt),
          openBugLabelled: facts.issues.filter(
            (i) =>
              !i.subtask &&
              i.type.toLowerCase() !== 'epic' &&
              !i.labels.includes('onboarding-sample') &&
              i.category !== 'done' &&
              i.labels.includes('bug'),
          ).length,
          status: 'live',
          fetchedAt: facts.fetchedAt,
          note: 'Approved portfolio members only. Completed = evidenced completion cycles in (previous observation, current cutoff]; current bug label is not historical bug-cohort health. Null completion means incomplete history.',
        };
      } catch {
        /* Do not use stale aggregate cohorts as current labels/completions. */
      }
    })(),
    (async () => {
      try {
        const rows = await (
          dependencies.deployments ??
          createProductionDeploymentAcquisition({
            accountId: env.CLOUDFLARE_ACCOUNT_ID,
            getToken: () => env.DEPLOYMENT_HISTORY_READ_TOKEN,
          })
        )();
        const times = rows.map((v) => Date.parse(String(record(v)['createdAt'])));
        if (times.some((t) => !Number.isFinite(t))) throw Error('Invalid deployment evidence');
        report.deployments = {
          count: times.filter((t) => t > Date.parse(windowStart) && t <= cutoff).length,
          status: 'live',
          fetchedAt: new Date((dependencies.now ?? Date.now)()).toISOString(),
          note: 'Existing read-only Cloudflare adapter: unique successful production activation records in the daily observation window; not commits or stories.',
        };
      } catch {
        try {
          const snapshot = record(await asset(env, '/data/deployment-history.json'));
          report.deployments.status = 'stale';
          report.deployments.fetchedAt =
            typeof snapshot['checkedAt'] === 'string' ? snapshot['checkedAt'] : null;
          report.deployments.note =
            'Retained deployment snapshot exists, but daily live acquisition failed; interval count is unavailable, not zero.';
        } catch {
          /* Still unavailable. */
        }
      }
    })(),
  ]);
  const next: DailyReportArchive = { schemaVersion: 1, reports: [...archive.reports, report] };
  validateArchive(next);
  const saved = await env.DAILY_REPORTS.put(key, JSON.stringify(next), {
    onlyIf: stored ? { etagMatches: stored.etag } : { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json' },
  });
  if (!saved) {
    const concurrent = (await readReports(env)).reports.find((r) => r.date === date);
    if (concurrent) return { report: concurrent, existing: true };
    throw Error('Archive changed concurrently; safe to retry');
  }
  return { report, existing: false };
}
export function applyDailyHistory(data: BuildometerData, archive: DailyReportArchive): void {
  data.dailyReports = archive.reports.slice(-30).reverse();
  data.dailyReportsStatus = 'available';
  const valid = archive.reports.filter(
    (r) =>
      r.projectStatus === 'approved-snapshot' &&
      r.project?.baselineId === data.supportingFacts.project?.baselineId,
  );
  const merge = (base: Point[], values: Point[]) =>
    [...new Map([...base, ...values].map((p) => [p.date, p])).values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  data.series.scope = merge(
    data.series.scope,
    valid.map((r) => ({ date: r.observedAt, value: r.project!.total })),
  );
  data.series.burndown = merge(
    data.series.burndown,
    valid.map((r) => ({ date: r.observedAt, value: r.project!.remaining })),
  );
  data.series.projectCompletion = merge(
    data.series.projectCompletion ?? [],
    valid.map((r) => ({
      date: r.observedAt,
      value: r.project!.completion,
    })),
  );
  data.series.projectShipped = merge(
    data.series.projectShipped ?? [],
    valid.map((r) => ({
      date: r.observedAt,
      value: r.project!.shipped,
    })),
  );
}
