import type { JiraFacts, Issue } from './facts.ts';
import type {
  BuildometerData,
  Metric,
  Point,
} from '../../src/app/components/buildometer/data/contract.ts';
const day = 86400000;
export const unknown = (unit: string, reason: string): Metric => ({ value: null, unit, reason });
const metric = (value: number, unit: string): Metric => ({ value, unit, reason: null });
const date = (n: number) => new Date(n).toISOString();
export function emptyData(now: string): BuildometerData {
  const missing = unknown('work items', 'No complete Jira source is available.');
  return {
    schemaVersion: 1,
    generatedAt: now,
    sources: {
      jira: {
        status: 'unavailable',
        fetchedAt: null,
        message: 'Jira runtime credentials are not configured.',
      },
      deployments: {
        status: 'unavailable',
        fetchedAt: null,
        message: 'Deployment evidence unavailable.',
      },
    },
    metrics: {
      completion: unknown('%', 'No approved project committed-scope denominator.'),
      done: missing,
      remaining: missing,
      velocity: unknown('points / period', 'No legitimate estimated delivery periods.'),
      throughput: missing,
      deployments: unknown('activations / 7 days', 'Deployment evidence unavailable.'),
      scopeChange: unknown('items', 'No committed scope membership history.'),
      burndown: unknown('items', 'No reconstructable committed scope.'),
      bugHealth: unknown('open bug-labelled items', 'No classified bug source.'),
      bugCreated: missing,
      bugEliminated: missing,
      bugDuration: unknown('hours', 'No valid detection-to-elimination pairs.'),
      reopens: missing,
      rework: unknown('rate', 'No existing approved rework classification/denominator.'),
    },
    series: {
      burndown: [],
      velocity: [],
      throughput: [],
      deployments: [],
      scope: [],
      bugCreated: [],
      bugEliminated: [],
      bugOpen: [],
      bugLifecycle: [],
    },
    journal: [],
    supportingFacts: {
      inventory: null,
      excludedSamples: null,
      historyComplete: false,
      pointCoverage: 'Unknown',
      scope: 'No approved committed project scope.',
      bugPolicy: 'Bug type or explicit bug label; rework is not inferred.',
      shippingCheckedAt: null,
    },
  };
}
const buckets = (end: number, events: number[], days = 14): Point[] =>
  Array.from({ length: days }, (_, i) => {
    const b = end - (days - 1 - i) * day;
    return { date: date(b), value: events.filter((t) => t > b - day && t <= b).length };
  });
const isBug = (i: Issue) => i.type.toLowerCase() === 'bug' || i.labels.includes('bug');
const history = (i: Issue, field: string) =>
  i.history
    .flatMap((h) =>
      h.changes.filter((c) => c.field === field).map((c) => ({ ...c, at: Date.parse(h.at) })),
    )
    .sort((a, b) => a.at - b.at);
function detected(i: Issue): number | null {
  if (!i.historyComplete) return null;
  if (i.type.toLowerCase() === 'bug') return Date.parse(i.created);
  const labels = history(i, 'labels');
  const first = labels.find(
    (c) => !c.fromString?.split(/\s+/).includes('bug') && c.toString?.split(/\s+/).includes('bug'),
  );
  return (
    first?.at ??
    (!labels.length || labels[0].fromString?.split(/\s+/).includes('bug')
      ? Date.parse(i.created)
      : null)
  );
}
export function deriveJira(f: JiraFacts): BuildometerData {
  const result = emptyData(f.fetchedAt),
    end = Date.parse(f.fetchedAt),
    start = end - 7 * day;
  const issues = f.issues.filter(
    (i) => !i.subtask && i.type.toLowerCase() !== 'epic' && !i.labels.includes('onboarding-sample'),
  );
  const complete = f.issues.every((i) => i.historyComplete);
  result.sources.jira = {
    status: 'live',
    fetchedAt: f.fetchedAt,
    message: 'Metric-only Jira acquisition; no issue bodies or people published.',
  };
  result.supportingFacts = {
    ...result.supportingFacts,
    inventory: issues.length,
    excludedSamples: f.issues.filter((i) => i.labels.includes('onboarding-sample')).length,
    historyComplete: complete,
    pointCoverage: `${issues.filter((i) => i.points !== null).length} of ${issues.length} tracked work items estimated`,
  };
  const done = issues.filter((i) => i.category === 'done');
  result.metrics.done = metric(done.length, 'tracked done items');
  result.metrics.remaining = metric(issues.length - done.length, 'tracked open items');
  // Current resolution cohort, explicitly not all historic completion/reopen cycles.
  const resolvedAt = (i: Issue): number | null =>
    i.resolved
      ? Date.parse(i.resolved)
      : i.historyComplete
        ? (history(i, 'status')
            .filter((c) => f.statuses[c.to || ''] === 'done')
            .at(-1)?.at ?? null)
        : null;
  const resolutions = done.map(resolvedAt).filter((t): t is number => t !== null);
  if (resolutions.length === done.length) {
    result.metrics.throughput = metric(
      resolutions.filter((t) => t > start && t <= end).length,
      'currently done items resolved / 7 days',
    );
    result.series.throughput = buckets(end, resolutions);
  } else
    result.metrics.throughput = unknown(
      'items / 7 days',
      'Some done work items have no resolution timestamp.',
    );
  result.metrics.velocity = unknown(
    'points / period',
    issues.some((i) => i.points !== null)
      ? 'No closed estimated sprint with complete estimate history.'
      : 'Story point estimate field exists but no tracked work items are estimated.',
  );
  // A timebox must contain real committed work; an empty or sample-only sprint is not a scope baseline.
  const sprint = f.sprints.find((s) => s.state === 'active' && s.start && s.end);
  if (sprint && complete && f.fields.sprint) {
    const parse = (v: string | null): string[] | null =>
      v === null || v === ''
        ? []
        : /^\d+(\s*,\s*\d+)*$/.test(v)
          ? v.split(',').map((x) => x.trim())
          : null;
    const membership = (i: Issue, t: number): boolean | null => {
      if (Date.parse(i.created) > t) return false;
      let ids: string[] | null = i.sprintIds;
      for (const c of history(i, f.fields.sprint!)
        .filter((c) => c.at > t)
        .reverse()) {
        ids = parse(c.from);
        if (ids === null) return null;
      }
      return ids.includes(sprint.id);
    };
    const from = Date.parse(sprint.start!),
      to = Math.min(end, Date.parse(sprint.end!));
    const ticks = [
      from,
      ...Array.from(
        { length: Math.min(90, Math.floor((to - from) / day)) },
        (_, i) => from + (i + 1) * day,
      ),
      ...(to > from ? [to] : []),
    ];
    const scope: Point[] = [],
      burn: Point[] = [];
    let safe = true;
    for (const t of [...new Set(ticks)]) {
      let total = 0,
        remaining = 0;
      for (const i of issues) {
        const member = membership(i, t);
        if (member === null) {
          safe = false;
          break;
        }
        if (member) {
          total++;
          let state = i.status;
          for (const c of history(i, 'status')
            .filter((c) => c.at > t)
            .reverse())
            state = c.from || state;
          if (!f.statuses[state]) {
            safe = false;
            break;
          }
          if (f.statuses[state] !== 'done') remaining++;
        }
      }
      scope.push({ date: date(t), value: total });
      burn.push({ date: date(t), value: remaining });
    }
    if (safe && scope[0]?.value > 0) {
      result.series.scope = scope;
      result.series.burndown = burn;
      result.metrics.burndown = metric(burn.at(-1)!.value, 'active sprint remaining items');
      result.metrics.scopeChange = metric(
        scope.at(-1)!.value - scope[0].value,
        'active sprint net scope items',
      );
      result.supportingFacts.scope =
        'Active sprint membership reconstructed from complete changelogs; item units, no ideal line.';
    }
  }
  if (!result.series.burndown.length) {
    result.metrics.burndown = unknown(
      'items',
      'No real committed starting cohort can be reconstructed from sprint membership/history.',
    );
    result.metrics.scopeChange = unknown(
      'items',
      'Backlog inventory is not committed scope; sprint history has no defensible real starting cohort.',
    );
  }
  const bugs = issues.filter(isBug);
  result.metrics.bugHealth = metric(
    bugs.filter((i) => i.category !== 'done').length,
    'open bug-labelled work items',
  );
  const detections = bugs.map(detected);
  const pairs = bugs.flatMap((i, index) => {
    const d = detections[index],
      r = i.category === 'done' && i.resolved ? Date.parse(i.resolved) : null;
    return d !== null && r !== null && r >= d ? [{ date: date(r), value: (r - d) / 3600000 }] : [];
  });
  if (bugs.every((i) => i.historyComplete) && detections.every((t) => t !== null)) {
    const detectedEvents = detections as number[],
      eliminations = bugs.flatMap((i) =>
        history(i, 'status')
          .filter((c) => f.statuses[c.to || ''] === 'done' && f.statuses[c.from || ''] !== 'done')
          .map((c) => c.at),
      );
    const reopen = bugs.flatMap((i) =>
      history(i, 'status')
        .filter((c) => f.statuses[c.from || ''] === 'done' && f.statuses[c.to || ''] !== 'done')
        .map((c) => c.at),
    );
    result.series.bugOpen = Array.from({ length: 14 }, (_, n) => {
      const t = end - (13 - n) * day;
      return {
        date: date(t),
        value: bugs.filter((i, index) => {
          if ((detections[index] ?? Infinity) > t) return false;
          let state = i.status;
          for (const c of history(i, 'status')
            .filter((c) => c.at > t)
            .reverse())
            state = c.from || state;
          return f.statuses[state] !== 'done';
        }).length,
      };
    });
    result.metrics.bugCreated = metric(
      detectedEvents.filter((t) => t > start && t <= end).length,
      'newly classified bugs / 7 days',
    );
    result.metrics.bugEliminated = metric(
      eliminations.filter((t) => t > start && t <= end).length,
      'Done transitions / 7 days',
    );
    result.metrics.reopens = metric(
      reopen.filter((t) => t > start && t <= end).length,
      'bug reopen events / 7 days',
    );
    result.series.bugCreated = buckets(end, detectedEvents);
    result.series.bugEliminated = buckets(end, eliminations);
    result.series.bugLifecycle = pairs;
    if (pairs.length)
      result.metrics.bugDuration = metric(
        Math.round((pairs.reduce((n, x) => n + x.value, 0) / pairs.length) * 10) / 10,
        'mean classification to latest Done hours (' + pairs.length + ' resolved pairs)',
      );
  }
  return result;
}
export function applyDeployments(data: BuildometerData, input: unknown): void {
  if (!input || typeof input !== 'object') throw Error('Invalid deployment snapshot');
  const s = input as { schemaVersion?: unknown; checkedAt?: unknown; rows?: unknown };
  if (
    s.schemaVersion !== 4 ||
    typeof s.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(s.checkedAt)) ||
    !Array.isArray(s.rows)
  )
    throw Error('Invalid deployment snapshot');
  const end = Date.parse(s.checkedAt),
    events: number[] = [],
    seen = new Set<string>();
  for (const r of s.rows) {
    if (
      !r ||
      typeof r !== 'object' ||
      typeof r.id !== 'string' ||
      typeof r.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(r.createdAt))
    )
      throw Error('Invalid deployment row');
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (r.environment === 'production' && r.status === 'succeeded' && r.stage === 'deployed')
      events.push(Date.parse(r.createdAt));
  }
  data.metrics.deployments = metric(
    events.filter((t) => t > end - 7 * day && t <= end).length,
    'recorded activations / 7 days',
  );
  data.series.deployments = buckets(end, events, 7);
  data.supportingFacts.shippingCheckedAt = s.checkedAt;
  data.sources.deployments = {
    status: Date.parse(data.generatedAt) - end > day ? 'stale' : 'snapshot',
    fetchedAt: s.checkedAt,
    message: 'Existing sanitized deployment history; window ends at its check timestamp.',
  };
}
