import { DeploymentHistoryRow } from './deployment-history-row';

/** Provider adapters supply only public facts using this vocabulary. */
export interface DeploymentHistoryInput {
  readonly id: string;
  readonly summary: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly statusRecordedAt: string;
  readonly revision: string;
  readonly environment: string;
  readonly status: string;
}

export interface DeploymentHistoryIssue {
  readonly recordIndex: number | null;
  readonly field: keyof DeploymentHistoryInput | 'record' | 'history';
  readonly reason: 'invalid' | 'duplicate-id';
}

export type DeploymentHistoryResult =
  | { readonly ok: true; readonly rows: readonly DeploymentHistoryRow[] }
  | { readonly ok: false; readonly issues: readonly DeploymentHistoryIssue[] };

/** Transport-independent lifecycle. Error details are not public presentation text. */
export type DeploymentHistorySourceState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly records: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonemptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Strict timezone-qualified ISO input; reject rollover dates and lost precision. */
function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const zone = parts[7]!;
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1]! ||
    Number(parts[4]) > 23 ||
    Number(parts[5]) > 59 ||
    Number(parts[6]) > 59 ||
    zone === '-00:00' ||
    (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))
  )
    return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

/** All-or-nothing validation: never present a silently incomplete history. */
export function normalizeDeploymentHistory(input: unknown): DeploymentHistoryResult {
  if (!Array.isArray(input))
    return { ok: false, issues: [{ recordIndex: null, field: 'history', reason: 'invalid' }] };
  const rows: DeploymentHistoryRow[] = [];
  const issues: DeploymentHistoryIssue[] = [];
  const ids = new Set<string>();
  for (let recordIndex = 0; recordIndex < input.length; recordIndex++) {
    const record: unknown = input[recordIndex];
    const invalid = (field: DeploymentHistoryIssue['field']) => {
      issues.push({ recordIndex, field, reason: 'invalid' });
    };
    if (!isRecord(record)) {
      invalid('record');
      continue;
    }
    const { id, summary, startedAt, completedAt, statusRecordedAt, revision, environment, status } =
      record;
    const recorded = normalizeTimestamp(statusRecordedAt);
    const start = normalizeTimestamp(startedAt);
    const completion = normalizeTimestamp(completedAt);
    const issueCount = issues.length;
    if (!nonemptyText(id) || id !== id.trim()) invalid('id');
    if (!nonemptyText(summary)) invalid('summary');
    if (!recorded) invalid('statusRecordedAt');
    if (Object.hasOwn(record, 'startedAt') && (!start || start !== startedAt)) invalid('startedAt');
    if (Object.hasOwn(record, 'completedAt') && (!completion || completion !== completedAt))
      invalid('completedAt');
    if (status === 'in-progress' && Object.hasOwn(record, 'completedAt')) invalid('completedAt');
    if (start && completion && start > completion) invalid('completedAt');
    if (!nonemptyText(revision)) invalid('revision');
    if (environment !== 'production' && environment !== 'preview') invalid('environment');
    if (status !== 'succeeded' && status !== 'failed' && status !== 'in-progress')
      invalid('status');
    if (nonemptyText(id)) {
      if (ids.has(id)) issues.push({ recordIndex, field: 'id', reason: 'duplicate-id' });
      ids.add(id);
    }
    if (
      issues.length === issueCount &&
      nonemptyText(id) &&
      nonemptyText(summary) &&
      nonemptyText(revision) &&
      recorded &&
      (environment === 'production' || environment === 'preview') &&
      (status === 'succeeded' || status === 'failed' || status === 'in-progress')
    ) {
      rows.push({
        id,
        summary: summary.trim(),
        statusRecordedAt: recorded,
        ...(start ? { startedAt: start } : {}),
        ...(completion ? { completedAt: completion } : {}),
        revision: revision.trim(),
        environment,
        status,
      });
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, rows };
}
