import type { BuildometerData } from '../../src/app/components/buildometer/data/contract.ts';
export interface Member {
  key: string;
  title: string;
  points: number;
  shipped: boolean;
  disposition: string;
}
export interface Observation {
  id: string;
  observedAt: string;
  reason: string;
  members: Member[];
}
export interface Ledger {
  schemaVersion: 1;
  project: string;
  baselineId: string;
  sourceCheckpoint: string;
  approvedOpening: { total: number; shipped: number; remaining: number };
  observations: Observation[];
}
export interface ProjectMeasurement {
  schemaVersion: 1;
  baselineId: string;
  t0: string;
  observedAt: string;
  observations: {
    date: string;
    total: number;
    shipped: number;
    remaining: number;
    added: number;
    removed: number;
    reestimated: number;
  }[];
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid project evidence');
  return v as Record<string, unknown>;
};
export function projectMeasurement(input: unknown): ProjectMeasurement {
  const root = object(input);
  if (
    root['schemaVersion'] !== 1 ||
    typeof root['baselineId'] !== 'string' ||
    !Array.isArray(root['observations']) ||
    !root['observations'].length
  )
    throw Error('Invalid project ledger');
  let previous = new Map<string, Member>(),
    last = -Infinity;
  const ids = new Set<string>();
  const observations = root['observations'].map((raw) => {
    const o = object(raw),
      time = Date.parse(String(o['observedAt']));
    if (
      !Number.isFinite(time) ||
      time <= last ||
      time > Date.now() ||
      typeof o['id'] !== 'string' ||
      ids.has(o['id']) ||
      typeof o['reason'] !== 'string' ||
      !o['reason'].trim() ||
      !Array.isArray(o['members']) ||
      !o['members'].length
    )
      throw Error('Invalid observation');
    ids.add(o['id']);
    last = time;
    const current = new Map<string, Member>();
    for (const rawMember of o['members']) {
      const m = object(rawMember);
      if (
        typeof m['key'] !== 'string' ||
        !/^SCRUM-\d+$/.test(m['key']) ||
        current.has(m['key']) ||
        typeof m['title'] !== 'string' ||
        !m['title'].trim() ||
        typeof m['points'] !== 'number' ||
        ![0, 1, 2, 3, 5, 8, 13].includes(m['points']) ||
        typeof m['shipped'] !== 'boolean' ||
        typeof m['disposition'] !== 'string'
      )
        throw Error('Invalid member');
      current.set(m['key'], m as unknown as Member);
    }
    let total = 0,
      shipped = 0,
      added = 0,
      removed = 0,
      reestimated = 0;
    for (const [key, m] of current) {
      total += m.points;
      if (m.shipped) shipped += m.points;
      if (!previous.has(key)) added += m.points;
      else reestimated += m.points - previous.get(key)!.points;
    }
    for (const [key, m] of previous) if (!current.has(key)) removed += m.points;
    if (!previous.size) {
      added = 0;
      removed = 0;
      reestimated = 0;
    }
    previous = current;
    return {
      date: new Date(time).toISOString(),
      total,
      shipped,
      remaining: total - shipped,
      added,
      removed,
      reestimated,
    };
  });
  const opening = object(root['approvedOpening']);
  for (const key of ['total', 'shipped', 'remaining'] as const)
    if (opening[key] !== observations[0][key]) throw Error('Opening approval mismatch');
  return {
    schemaVersion: 1,
    baselineId: root['baselineId'],
    t0: observations[0].date,
    observedAt: observations.at(-1)!.date,
    observations,
  };
}
export function applyProject(data: BuildometerData, input: unknown): void {
  const p = object(input);
  if (
    p['schemaVersion'] !== 1 ||
    typeof p['baselineId'] !== 'string' ||
    !Array.isArray(p['observations']) ||
    !p['observations'].length
  )
    throw Error('Invalid project projection');
  let last = -Infinity;
  const observations = p['observations'].map((raw) => {
    const o = object(raw),
      time = Date.parse(String(o['date']));
    if (!Number.isFinite(time) || time <= last || time > Date.now())
      throw Error('Invalid project date');
    last = time;
    for (const key of ['total', 'shipped', 'remaining', 'added', 'removed', 'reestimated'])
      if (typeof o[key] !== 'number' || !Number.isSafeInteger(o[key]))
        throw Error('Invalid project points');
    if (
      Number(o['total']) <= 0 ||
      Number(o['shipped']) < 0 ||
      Number(o['remaining']) < 0 ||
      Number(o['added']) < 0 ||
      Number(o['removed']) < 0 ||
      Number(o['total']) !== Number(o['shipped']) + Number(o['remaining'])
    )
      throw Error('Inconsistent project points');
    return o as unknown as ProjectMeasurement['observations'][number];
  });
  const first = observations[0],
    current = observations.at(-1)!;
  if (p['t0'] !== first.date || p['observedAt'] !== current.date)
    throw Error('Invalid project reference');
  for (let i = 1; i < observations.length; i++)
    if (
      observations[i].total - observations[i - 1].total !==
      observations[i].added - observations[i].removed + observations[i].reestimated
    )
      throw Error('Inconsistent membership changes');
  const metric = (value: number, unit: string, reason: string | null = null) => ({
    value,
    unit,
    reason,
  });
  data.metrics.completion = metric(
    Math.round((current.shipped / current.total) * 1000) / 10,
    '%',
    'Estimated completion of known scope; future scope growth may reduce this percentage.',
  );
  data.metrics.done = metric(current.shipped, 'shipped story points');
  data.metrics.remaining = metric(current.remaining, 'remaining story points');
  data.metrics.scopeChange = metric(current.total - first.total, 'net points since T0');
  data.metrics.burndown = metric(current.remaining, 'remaining story points');
  data.series.scope = observations.map((o) => ({ date: o.date, value: o.total }));
  data.series.burndown = observations.map((o) => ({ date: o.date, value: o.remaining }));
  data.series.projectCompletion = observations.map((o) => ({
    date: o.date,
    value: Math.round((o.shipped / o.total) * 1000) / 10,
  }));
  data.series.projectShipped = observations.map((o) => ({ date: o.date, value: o.shipped }));
  data.supportingFacts.project = {
    baselineId: p['baselineId'],
    t0: first.date,
    observedAt: current.date,
    total: current.total,
    shipped: current.shipped,
    remaining: current.remaining,
    observationCount: observations.length,
    added: observations.reduce((s, o) => s + o.added, 0),
    removed: observations.reduce((s, o) => s + o.removed, 0),
    reestimated: observations.reduce((s, o) => s + o.reestimated, 0),
  };
  data.supportingFacts.scope =
    'Owner-approved known djamespoer.com scope. Whole-story shipped credit; no fractional completion. Observations begin at T0; no reconstructed history or ideal line. Git-versioned evidence, not live Jira status.';
}
