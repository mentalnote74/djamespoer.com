/** Public deployment attempt metadata; never provider credentials or raw build logs. */
export interface DeploymentHistoryRow {
  /** Stable attempt identity, independent of revision, status, and display order. */
  readonly id: string;
  readonly summary: string;
  /** Evidenced actual deployment start; canonical UTC, omitted when unknown. */
  readonly startedAt?: string;
  /** Evidenced actual deployment completion/termination; never status-recording time. */
  readonly completedAt?: string;
  /** Time the authoritative evidence source recorded the current deployment status. */
  readonly statusRecordedAt: string;
  readonly revision: string;
  readonly environment: 'production' | 'preview';
  readonly status: 'succeeded' | 'failed' | 'in-progress';
}
