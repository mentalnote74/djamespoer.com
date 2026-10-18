import type { Issue, JiraFacts } from './facts.ts';
import type { BuildometerData, Point } from '../../src/app/components/buildometer/data/contract.ts';
const day = 86400000;
const labels = (v: string | null): string[] => (v?.trim() ? v.trim().split(/\s+/) : []);
const bug = (type: string, values: readonly string[]) =>
  type.toLowerCase() === 'bug' || values.includes('bug');
const eligible = (type: string, i: Issue) =>
  !['epic', 'subtask', 'sub-task'].includes(type.toLowerCase()) && !(type === i.type && i.subtask);
const bucket = (end: number, events: readonly number[]): Point[] =>
  Array.from({ length: 14 }, (_, i) => {
    const b = end - (13 - i) * day;
    return {
      date: new Date(b).toISOString(),
      value: events.filter((t) => t > b - day && t <= b).length,
    };
  });
interface Event {
  at: number;
  kind: 'complete' | 'reopen';
  eligible: boolean;
}
interface Timeline {
  valid: boolean;
  excluded: boolean;
  initialCategory: string;
  firstBug: number | null;
  events: Event[];
  duplicates: number;
}
/** Replay category changes, classification and event-time work type; never use resolution as an event. */
function timeline(i: Issue, f: JiraFacts): Timeline {
  const created = Date.parse(i.created),
    end = Date.parse(f.fetchedAt);
  const changes = i.history
    .flatMap((h, index) => h.changes.map((c) => ({ ...c, at: Date.parse(h.at), index })))
    .sort((a, b) => a.at - b.at || a.index - b.index);
  // Explicit sample evidence excludes the whole diagnostic issue, not just its present label state.
  const excluded =
    i.labels.includes('onboarding-sample') ||
    changes.some(
      (c) =>
        c.field === 'labels' &&
        [...labels(c.fromString), ...labels(c.toString)].includes('onboarding-sample'),
    );
  const result: Timeline = {
    valid: i.historyComplete,
    excluded,
    initialCategory: '',
    firstBug: null,
    events: [],
    duplicates: 0,
  };
  if (excluded) return result;
  if (!i.historyComplete || !Number.isFinite(created) || created > end) {
    result.valid = false;
    return result;
  }
  const firstLabels = changes.find((c) => c.field === 'labels'),
    firstType = changes.find((c) => c.field === 'issuetype'),
    firstStatus = changes.find((c) => c.field === 'status');
  let types = firstType ? firstType.fromString : i.type;
  let values = firstLabels ? labels(firstLabels.fromString) : i.labels;
  let category = firstStatus ? f.statuses[firstStatus.from || ''] : f.statuses[i.status];
  if (!types || !category) {
    result.valid = false;
    return result;
  }
  result.initialCategory = category;
  if (eligible(types, i) && bug(types, values)) result.firstBug = created;
  const seen = new Set<string>();
  // Simultaneous label/type/status edits describe one atomic source event. Apply classification first.
  for (const at of [...new Set(changes.map((c) => c.at))]) {
    if (!Number.isFinite(at) || at < created || at > end) {
      result.valid = false;
      break;
    }
    const group = changes.filter((c) => c.at === at);
    for (const c of group.filter((c) => c.field === 'labels' || c.field === 'issuetype')) {
      if (c.field === 'labels') values = labels(c.toString);
      else {
        if (!c.toString) {
          result.valid = false;
          break;
        }
        types = c.toString;
      }
    }
    if (!result.valid) break;
    if (result.firstBug === null && eligible(types, i) && bug(types, values)) result.firstBug = at;
    for (const c of group.filter((c) => c.field === 'status')) {
      const key = [at, c.from, c.to].join('|');
      if (seen.has(key)) {
        result.duplicates++;
        continue;
      }
      seen.add(key);
      const from = f.statuses[c.from || ''],
        to = f.statuses[c.to || ''];
      if (!from || !to) {
        result.valid = false;
        break;
      }
      if (from !== category) {
        // A repeated entry into the already-observed category is not a new cycle.
        if (to === category) {
          result.duplicates++;
          continue;
        }
        result.valid = false;
        break;
      }
      if (category !== 'done' && to === 'done')
        result.events.push({ at, kind: 'complete', eligible: eligible(types, i) });
      else if (category === 'done' && to !== 'done')
        result.events.push({ at, kind: 'reopen', eligible: eligible(types, i) });
      category = to;
    }
    if (!result.valid) break;
  }
  if (category !== i.category) result.valid = false;
  return result;
}
/** Only throughput + bug metrics are modified. Inventory, scope, estimates and deployments stay separate. */
export function applyEventMetrics(data: BuildometerData, f: JiraFacts): void {
  const end = Date.parse(f.fetchedAt),
    start = end - 7 * day;
  const records = f.issues.map((i) => ({ i, t: timeline(i, f) })).filter((r) => !r.t.excluded);
  const invalid = records.filter((r) => !r.t.valid).length;
  const metric = (value: number, unit: string) => ({ value, unit, reason: null });
  const unavailable = (reason: string) => ({ value: null, unit: 'events', reason });
  data.supportingFacts.bugPolicy =
    'Ever classified Bug type or explicit bug label while eligible; label/type removal does not erase membership. Classification is not real-world detection. Rework is not inferred.';
  data.supportingFacts.eventSummary = {
    historyIssuesMissing: invalid,
    throughputEvents: null,
    recompletions: null,
    ignoredDuplicates: records.reduce((n, r) => n + r.t.duplicates, 0),
    bugCohort: null,
    resolvedCycles: null,
    resolvedBugItems: null,
    openCycles: null,
  };
  if (invalid) {
    const reason = `${invalid} issue histories are incomplete, inconsistent or contain unknown status/type evidence; event cohorts cannot be measured completely.`;
    for (const key of [
      'throughput',
      'bugHealth',
      'bugCreated',
      'bugEliminated',
      'bugDuration',
      'reopens',
    ] as const)
      data.metrics[key] = unavailable(reason);
    for (const key of [
      'throughput',
      'bugCreated',
      'bugEliminated',
      'bugOpen',
      'bugLifecycle',
    ] as const)
      data.series[key] = [];
    return;
  }
  const completions: number[] = [];
  let recompletions = 0;
  for (const { t } of records) {
    let afterReopen = false;
    for (const e of t.events) {
      if (e.kind === 'reopen') afterReopen = true;
      else {
        if (e.eligible) {
          completions.push(e.at);
          if (afterReopen) recompletions++;
        }
        afterReopen = false;
      }
    }
  }
  data.metrics.throughput = metric(
    completions.filter((t) => t > start && t <= end).length,
    'completion cycles / 7 days',
  );
  data.series.throughput = bucket(end, completions);
  data.supportingFacts.eventSummary.throughputEvents = completions.length;
  data.supportingFacts.eventSummary.recompletions = recompletions;
  const bugs = records.filter((r) => r.t.firstBug !== null);
  const classifications: number[] = [],
    eliminations: number[] = [],
    reopens: number[] = [],
    pairs: Point[] = [];
  const openAt: number[][] = [];
  let openCycles = 0,
    resolvedBugItems = 0;
  for (const { t } of bugs) {
    const classified = t.firstBug!;
    classifications.push(classified);
    let state = t.initialCategory;
    for (const e of t.events.filter((e) => e.at < classified))
      state = e.kind === 'complete' ? 'done' : 'open';
    let opened: number | null = state === 'done' ? null : classified;
    const stateEvents: number[] = [];
    if (opened !== null) stateEvents.push(opened);
    let resolved = false;
    for (const e of t.events.filter((e) => e.at >= classified)) {
      if (e.kind === 'complete') {
        if (opened !== null) {
          eliminations.push(e.at);
          pairs.push({ date: new Date(e.at).toISOString(), value: (e.at - opened) / 3600000 });
          opened = null;
          resolved = true;
          stateEvents.push(-e.at);
        }
      } else {
        // Only a source Done -> non-Done transition can start a later bug cycle.
        if (opened === null) {
          opened = e.at;
          reopens.push(e.at);
          stateEvents.push(e.at);
        }
      }
    }
    if (opened !== null) openCycles++;
    if (resolved) resolvedBugItems++;
    openAt.push(stateEvents);
  }
  data.metrics.bugHealth = metric(openCycles, 'open issues in historical bug cohort');
  data.metrics.bugCreated = metric(
    classifications.filter((t) => t > start && t <= end).length,
    'first bug classifications / 7 days',
  );
  data.metrics.bugEliminated = metric(
    eliminations.filter((t) => t > start && t <= end).length,
    'completed bug cycles / 7 days',
  );
  data.metrics.reopens = metric(
    reopens.filter((t) => t > start && t <= end).length,
    'evidenced bug reopens / 7 days',
  );
  data.metrics.bugDuration = pairs.length
    ? metric(
        Math.round((pairs.reduce((n, p) => n + p.value, 0) / pairs.length) * 10) / 10,
        `mean cycle hours; n=${pairs.length} resolved cycles across ${resolvedBugItems} issues`,
      )
    : {
        value: null,
        unit: 'cycle hours; n=0',
        reason: 'No evidenced classification/reopen to Done pairs; open cycles are excluded.',
      };
  data.series.bugCreated = bucket(end, classifications);
  data.series.bugEliminated = bucket(end, eliminations);
  data.series.bugLifecycle = pairs;
  data.series.bugOpen = Array.from({ length: 14 }, (_, n) => {
    const t = end - (13 - n) * day;
    return {
      date: new Date(t).toISOString(),
      value: openAt.filter(
        (events) =>
          events.filter((e) => Math.abs(e) <= t).reduce((state, e) => (e > 0 ? 1 : 0), 0) === 1,
      ).length,
    };
  });
  Object.assign(data.supportingFacts.eventSummary, {
    bugCohort: bugs.length,
    resolvedCycles: pairs.length,
    resolvedBugItems,
    openCycles,
  });
}
