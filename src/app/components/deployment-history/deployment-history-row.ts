/** Small public pipeline history; no provider identifiers or full source revisions. */
export interface BuildDeploymentHistoryRow {
  readonly id: string;
  readonly summary?: string;
  readonly createdAt: string;
  readonly environment: 'production' | 'preview';
  readonly status:
    'queued' | 'in-progress' | 'succeeded' | 'failed' | 'cancelled' | 'skipped' | 'terminated';
  readonly stage?: 'deployed';
  readonly revision?: string;
}
