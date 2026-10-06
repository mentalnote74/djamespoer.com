import { normalizeDeploymentHistory } from './deployment-history-data';
import { BuildDeploymentHistoryRow } from './deployment-history-row';

export interface DeploymentHistoryFreshness {
  readonly checkedAt: string;
  readonly generatedAt: string;
  readonly refreshStatus: 'ok';
}

export interface DeploymentHistorySnapshot extends DeploymentHistoryFreshness {
  readonly schemaVersion: 4;
  readonly rows: readonly BuildDeploymentHistoryRow[];
}

export type SnapshotValidation =
  { readonly ok: true; readonly snapshot: DeploymentHistorySnapshot } | { readonly ok: false };

function canonicalUtc(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

/** Shared browser/generator validation of an already-sanitized version-4 snapshot. */
export function validateDeploymentSnapshot(input: unknown): SnapshotValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false };
  const value = input as Record<string, unknown>;
  const keys = ['schemaVersion', 'checkedAt', 'generatedAt', 'refreshStatus', 'rows'];
  const { schemaVersion, checkedAt, generatedAt, refreshStatus, rows } = value;
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key)) ||
    schemaVersion !== 4 ||
    refreshStatus !== 'ok' ||
    !canonicalUtc(checkedAt) ||
    !canonicalUtc(generatedAt) ||
    Date.parse(checkedAt) > Date.parse(generatedAt) ||
    !Array.isArray(rows)
  )
    return { ok: false };
  const result = normalizeDeploymentHistory(rows);
  if (
    !result.ok ||
    rows.some((row: unknown, index: number) => {
      if (typeof row !== 'object' || row === null) return true;
      const fields = row as Record<string, unknown>;
      return (
        Object.keys(fields).length !== Object.keys(result.rows[index]!).length ||
        Object.entries(result.rows[index]!).some(([key, field]) => fields[key] !== field)
      );
    })
  )
    return { ok: false };
  return {
    ok: true,
    snapshot: { schemaVersion, checkedAt, generatedAt, refreshStatus, rows: result.rows },
  };
}
