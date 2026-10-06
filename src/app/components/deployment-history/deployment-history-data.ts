import { BuildDeploymentHistoryRow } from './deployment-history-row';

export interface DeploymentHistoryInput {
  readonly id: string;
  readonly revision?: string;
  readonly summary?: string;
  readonly createdAt: string;
  readonly environment: string;
  readonly status: string;
  readonly stage?: string;
}
export interface DeploymentHistoryIssue {
  readonly recordIndex: number | null;
  readonly field: keyof DeploymentHistoryInput | 'record' | 'history';
  readonly reason: 'invalid' | 'duplicate-id';
}
export type DeploymentHistoryResult =
  | { readonly ok: true; readonly rows: readonly BuildDeploymentHistoryRow[] }
  | { readonly ok: false; readonly issues: readonly DeploymentHistoryIssue[] };
export type DeploymentHistorySourceState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly records: unknown };
const statuses: readonly unknown[] = [
  'queued',
  'in-progress',
  'succeeded',
  'failed',
  'cancelled',
  'skipped',
  'terminated',
];
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim();
/** Strict canonical UTC input; no rollover or semantic timestamp substitution. */
export function normalizeDeploymentHistory(input: unknown): DeploymentHistoryResult {
  if (!Array.isArray(input))
    return { ok: false, issues: [{ recordIndex: null, field: 'history', reason: 'invalid' }] };
  const rows: BuildDeploymentHistoryRow[] = [];
  const issues: DeploymentHistoryIssue[] = [];
  const ids = new Set<string>();
  const records: readonly unknown[] = input;
  for (const [recordIndex, candidate] of records.entries()) {
    const invalid = (field: DeploymentHistoryIssue['field']) =>
      issues.push({ recordIndex, field, reason: 'invalid' });
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
      invalid('record');
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const before = issues.length;
    const required = ['id', 'createdAt', 'environment', 'status'];
    if (
      Object.keys(record).some(
        (key) => ![...required, 'summary', 'stage', 'revision'].includes(key),
      ) ||
      required.some((key) => !Object.hasOwn(record, key))
    )
      invalid('record');
    if (typeof record['id'] !== 'string' || !/^attempt-[0-9a-f]{64}$/.test(record['id']))
      invalid('id');
    if (
      Object.hasOwn(record, 'revision') &&
      (typeof record['revision'] !== 'string' || !/^[0-9a-fA-F]{7}$/.test(record['revision']))
    )
      invalid('revision');
    if (
      typeof record['createdAt'] !== 'string' ||
      !Number.isFinite(Date.parse(record['createdAt'])) ||
      new Date(record['createdAt']).toISOString() !== record['createdAt']
    )
      invalid('createdAt');
    if (record['environment'] !== 'production' && record['environment'] !== 'preview')
      invalid('environment');
    if (!statuses.includes(record['status'])) invalid('status');
    if (
      Object.hasOwn(record, 'summary') &&
      (!text(record['summary']) ||
        record['summary'].length > 240 ||
        /[\u0000-\u001f\u007f]/.test(record['summary']))
    )
      invalid('summary');
    if (
      Object.hasOwn(record, 'stage') &&
      (record['stage'] !== 'deployed' || record['status'] !== 'succeeded')
    )
      invalid('stage');
    if (text(record['id'])) {
      if (ids.has(record['id'])) issues.push({ recordIndex, field: 'id', reason: 'duplicate-id' });
      ids.add(record['id']);
    }
    if (issues.length === before)
      rows.push({
        id: record['id'] as string,
        ...(Object.hasOwn(record, 'revision') ? { revision: record['revision'] as string } : {}),
        createdAt: record['createdAt'] as string,
        environment: record['environment'] as BuildDeploymentHistoryRow['environment'],
        status: record['status'] as BuildDeploymentHistoryRow['status'],
        ...(Object.hasOwn(record, 'summary') ? { summary: record['summary'] as string } : {}),
        ...(Object.hasOwn(record, 'stage')
          ? { stage: record['stage'] as BuildDeploymentHistoryRow['stage'] }
          : {}),
      });
  }
  return issues.length ? { ok: false, issues } : { ok: true, rows };
}
