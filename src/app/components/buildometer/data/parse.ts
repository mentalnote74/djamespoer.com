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
  return input as BuildometerData;
}
