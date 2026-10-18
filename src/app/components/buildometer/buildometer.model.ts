import type { DeploymentHistorySnapshot } from '../deployment-history/deployment-history-snapshot';
import type { ScrumBrief } from '../daily-scrum-brief/brief.model';

/** Explicit committed scope, not the whole backlog. Feed only a complete versioned snapshot. */
export interface ScopedWork {
  readonly scopeVersion: string;
  readonly items: readonly {
    readonly id: string;
    readonly disposition: 'committed' | 'backlog' | 'cancelled' | 'superseded';
    readonly state: 'open' | 'done';
  }[];
}
export interface Completion {
  readonly percent: number;
  readonly completed: number;
  readonly remaining: number;
  readonly scopeVersion: string;
}
export function deriveCompletion(scope: ScopedWork | null): Completion | null {
  if (!scope || !scope.scopeVersion.trim()) return null;
  if (new Set(scope.items.map((i) => i.id)).size !== scope.items.length) return null;
  const active = scope.items.filter((i) => i.disposition === 'committed');
  if (!active.length) return null;
  const completed = active.filter((i) => i.state === 'done').length;
  return {
    percent: Math.round((100 * completed) / active.length),
    completed,
    remaining: active.length - completed,
    scopeVersion: scope.scopeVersion,
  };
}
export interface JournalEntry {
  readonly date: string;
  readonly generatedDate: string;
  readonly publishedDate: string;
  readonly brief: ScrumBrief;
}
export interface ShippingSignal {
  readonly checkedAt: string;
  readonly windowStart: string;
  readonly count: number;
  readonly stale: boolean;
  readonly days: readonly { date: string; count: number; height: number }[];
}
/** Seven exact 24-hour buckets ending at the source check time; never the browser's clock. */
export function deriveShipping(snapshot: DeploymentHistorySnapshot, now: number): ShippingSignal {
  const end = Date.parse(snapshot.checkedAt),
    day = 86_400_000,
    start = end - 7 * day;
  const rows = [...new Map(snapshot.rows.map((r) => [r.id, r])).values()].filter(
    (r) =>
      r.environment === 'production' &&
      r.status === 'succeeded' &&
      r.stage === 'deployed' &&
      Date.parse(r.createdAt) > start &&
      Date.parse(r.createdAt) <= end,
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const a = start + i * day,
      b = a + day;
    return {
      date: new Date(b).toISOString(),
      count: rows.filter((r) => Date.parse(r.createdAt) > a && Date.parse(r.createdAt) <= b).length,
    };
  });
  const peak = Math.max(1, ...days.map((d) => d.count));
  return {
    checkedAt: snapshot.checkedAt,
    windowStart: new Date(start).toISOString(),
    count: rows.length,
    stale: now - end > day || now < end,
    days: days.map((d) => ({ ...d, height: (d.count / peak) * 100 })),
  };
}
export function parseJournal(value: unknown): readonly JournalEntry[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('entries' in value) ||
    !Array.isArray(value.entries)
  )
    throw Error('Invalid journal');
  for (const e of value.entries) {
    if (
      !e ||
      typeof e !== 'object' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      typeof e.generatedDate !== 'string' ||
      typeof e.publishedDate !== 'string' ||
      !e.brief ||
      !Array.isArray(e.brief.sections) ||
      !e.brief.provenance ||
      typeof e.brief.provenance.sourceCommit !== 'string' ||
      !e.brief.sections.every(
        (s: { heading?: unknown; paragraph?: unknown; items?: unknown }) =>
          typeof s.heading === 'string' &&
          (s.paragraph === undefined || typeof s.paragraph === 'string') &&
          (s.items === undefined ||
            (Array.isArray(s.items) && s.items.every((i) => typeof i === 'string'))),
      )
    )
      throw Error('Invalid journal entry');
  }
  return [...(value.entries as JournalEntry[])].sort((a, b) => b.date.localeCompare(a.date));
}
export interface PendingMetric {
  readonly name: string;
  readonly unit: string;
  readonly reason: string;
}
export const DELIVERY_PENDING: readonly PendingMetric[] = [
  {
    name: 'Velocity',
    unit: 'points / week',
    reason: 'Needs estimates and dated completions in a fixed scope. Item counts are not velocity.',
  },
  {
    name: 'Throughput',
    unit: 'items / week',
    reason:
      'Needs work-item completion dates. Deployments and journal bullets are not completed stories.',
  },
  {
    name: 'Burndown',
    unit: 'remaining work',
    reason:
      'Needs scope membership and daily remaining-work snapshots. No trajectory is inferred from commits.',
  },
];
export const BUG_PENDING: readonly PendingMetric[] = [
  {
    name: 'Detected to eliminated',
    unit: 'average elapsed time',
    reason: 'Needs detection and verified elimination timestamps, including reopen history.',
  },
  {
    name: 'Bug creation / elimination',
    unit: 'bugs / week',
    reason: 'Needs classified bugs and lifecycle events in the same observation window.',
  },
  {
    name: 'Bug rate : rework rate',
    unit: 'separate rates',
    reason:
      'Needs an agreed rework classification and denominator. Bug fixes are not automatically rework.',
  },
];

export interface DashboardMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly state: 'ready' | 'unavailable' | 'loading' | 'error';
  readonly level: number | null;
}
/** Presentation-independent signals. Skin code never receives sources or changes calculations. */
export function dashboardMetrics(
  completion: Completion | null,
  shipping: ShippingSignal | null,
  loading: boolean,
  failed: boolean,
): readonly DashboardMetric[] {
  const pending = (id: string, label: string, note: string): DashboardMetric => ({
    id,
    label,
    value: 'Not measured',
    note,
    state: 'unavailable',
    level: null,
  });
  return [
    {
      id: 'completion',
      label: 'Project complete',
      value: completion ? `${completion.percent}%` : '\u2014%',
      note: completion ? 'of committed scope' : 'Scope baseline needed',
      state: completion ? 'ready' : 'unavailable',
      level: completion?.percent ?? null,
    },
    {
      id: 'stories',
      label: 'Done / remaining',
      value: completion ? `${completion.completed} / ${completion.remaining}` : '\u2014 / \u2014',
      note: 'committed stories',
      state: completion ? 'ready' : 'unavailable',
      level: null,
    },
    pending('velocity', 'Velocity', 'points / week'),
    pending('throughput', 'Throughput', 'items / week'),
    {
      id: 'shipping',
      label: 'Deployments',
      value: shipping
        ? String(shipping.count)
        : failed
          ? 'Unavailable'
          : loading
            ? 'Loading'
            : 'No evidence',
      note: shipping
        ? shipping.stale
          ? '7 days / stale snapshot'
          : '7 days / recorded'
        : 'production activations',
      state: shipping ? 'ready' : failed ? 'error' : loading ? 'loading' : 'unavailable',
      level: null,
    },
    pending('scope', 'Scope change', 'dated membership needed'),
    pending('burndown', 'Burndown', 'remaining-work history needed'),
    pending('bugs', 'Bug health', 'lifecycle / rework data needed'),
  ];
}
