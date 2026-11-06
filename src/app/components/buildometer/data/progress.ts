export interface ProgressPresentation {
  state: 'current' | 'stale' | 'unverified' | 'unavailable';
  percent: number | null;
  observedAt: string | null;
  label: string | null;
  status: string;
  shipped: number | null;
  total: number | null;
}
export const formatProgressTime = (date: string | number) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(typeof date === 'string' ? Date.parse(date) : date);
/** Observation freshness follows verified eligible releases, never build/fetch age. */
export function progressPresentation(input: unknown, now = Date.now()): ProgressPresentation {
  const unavailable: ProgressPresentation = {
    state: 'unavailable',
    percent: null,
    observedAt: null,
    label: null,
    status: 'Progress observation unavailable.',
    shipped: null,
    total: null,
  };
  if (!input || typeof input !== 'object') return unavailable;
  const p = input as Record<string, unknown>;
  const date = typeof p['observedAt'] === 'string' ? Date.parse(p['observedAt']) : NaN;
  const shipped = p['shipped'],
    total = p['total'];
  if (
    !Number.isFinite(date) ||
    date > now ||
    !Number.isSafeInteger(total) ||
    !Number.isSafeInteger(shipped) ||
    Number(total) <= 0 ||
    Number(shipped) < 0 ||
    Number(shipped) > Number(total)
  )
    return unavailable;
  const release = p['latestEligibleReleaseAt'];
  const releaseTime = typeof release === 'string' ? Date.parse(release) : NaN;
  const state =
    !Number.isFinite(releaseTime) || releaseTime > now
      ? 'unverified'
      : releaseTime > date
        ? 'stale'
        : 'current';
  return {
    state,
    percent: Math.round((Number(shipped) / Number(total)) * 1000) / 10,
    observedAt: new Date(date).toISOString(),
    label: formatProgressTime(date),
    status:
      state === 'stale'
        ? 'Newer production release awaits reconciliation.'
        : state === 'unverified'
          ? 'Release freshness not verified.'
          : 'Reconciled through the latest recorded eligible release.',
    shipped: Number(shipped),
    total: Number(total),
  };
}
