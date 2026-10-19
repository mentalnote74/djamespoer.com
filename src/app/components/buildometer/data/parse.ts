import type { BuildometerData } from './contract';
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid normalized data');
  return v as Record<string, unknown>;
};
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function parseData(input: unknown): BuildometerData {
  const d = record(input);
  if (d['schemaVersion'] !== 1 || !date(d['generatedAt'])) throw Error('Invalid data version/time');
  const metrics = record(d['metrics']),
    series = record(d['series']),
    sources = record(d['sources']),
    facts = record(d['supportingFacts']);
  for (const key of [
    'completion',
    'done',
    'remaining',
    'velocity',
    'throughput',
    'deployments',
    'scopeChange',
    'burndown',
    'bugHealth',
    'bugCreated',
    'bugEliminated',
    'bugDuration',
    'reopens',
    'rework',
  ]) {
    const m = record(metrics[key]);
    if (
      (m['value'] !== null && (typeof m['value'] !== 'number' || !Number.isFinite(m['value']))) ||
      typeof m['unit'] !== 'string' ||
      (m['reason'] !== null && typeof m['reason'] !== 'string')
    )
      throw Error('Invalid metric');
  }
  for (const key of [
    'burndown',
    'velocity',
    'throughput',
    'deployments',
    'scope',
    'bugCreated',
    'bugEliminated',
    'bugOpen',
    'bugLifecycle',
  ]) {
    const points = series[key];
    if (
      !Array.isArray(points) ||
      points.some((p) => {
        const x = record(p);
        return !date(x['date']) || typeof x['value'] !== 'number' || !Number.isFinite(x['value']);
      })
    )
      throw Error('Invalid series');
  }
  for (const key of ['jira', 'deployments']) {
    const s = record(sources[key]);
    if (
      !['live', 'snapshot', 'stale', 'unavailable'].includes(String(s['status'])) ||
      (s['fetchedAt'] !== null && !date(s['fetchedAt'])) ||
      typeof s['message'] !== 'string'
    )
      throw Error('Invalid source');
  }
  if (
    typeof facts['historyComplete'] !== 'boolean' ||
    typeof facts['pointCoverage'] !== 'string' ||
    typeof facts['scope'] !== 'string' ||
    typeof facts['bugPolicy'] !== 'string' ||
    !Array.isArray(d['journal'])
  )
    throw Error('Invalid evidence');
  if (facts['eventSummary'] !== undefined) {
    const summary = record(facts['eventSummary']);
    for (const key of [
      'historyIssuesMissing',
      'throughputEvents',
      'recompletions',
      'ignoredDuplicates',
      'bugCohort',
      'resolvedCycles',
      'resolvedBugItems',
      'openCycles',
    ]) {
      const value = summary[key];
      if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 0))
        throw Error('Invalid event summary');
    }
  }
  if (facts['project'] !== undefined) {
    const p = record(facts['project']);
    if (typeof p['baselineId'] !== 'string' || !date(p['t0']) || !date(p['observedAt']))
      throw Error('Invalid project provenance');
    for (const key of [
      'total',
      'shipped',
      'remaining',
      'observationCount',
      'added',
      'removed',
      'reestimated',
    ])
      if (typeof p[key] !== 'number' || !Number.isSafeInteger(p[key]))
        throw Error('Invalid project points');
    if (
      Number(p['total']) <= 0 ||
      Number(p['shipped']) < 0 ||
      Number(p['remaining']) < 0 ||
      Number(p['total']) !== Number(p['shipped']) + Number(p['remaining'])
    )
      throw Error('Inconsistent project points');
  }
  return input as BuildometerData;
}
