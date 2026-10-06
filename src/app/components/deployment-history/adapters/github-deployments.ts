import {
  DeploymentHistoryInput,
  DeploymentHistoryResult,
  normalizeDeploymentHistory,
} from './legacy-v2/deployment-history-data';

/** Minimal projection of GitHub's deployment response, not a workflow run. */
export interface GitHubDeployment {
  readonly node_id: string;
  readonly description: string | null;
  readonly sha: string;
  readonly environment: string;
}

export interface GitHubDeploymentStatus {
  readonly state: string;
  readonly created_at: string;
  readonly environment?: string;
}

/** Supplier joins each deployment with its complete status history. */
export interface GitHubDeploymentHistoryEntry {
  readonly deployment: GitHubDeployment;
  readonly statuses: readonly GitHubDeploymentStatus[];
}

function timestamp(value: unknown): number | null {
  // GitHub's timestamp format is UTC seconds. Reject JavaScript date rollover.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value))
    return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value.replace('Z', '.000Z')
    ? parsed
    : null;
}

function mapEntry(entry: GitHubDeploymentHistoryEntry): DeploymentHistoryInput | null {
  if (!entry || !entry.deployment || !Array.isArray(entry.statuses) || !entry.statuses.length)
    return null;
  const { deployment, statuses } = entry;
  const ordered: { status: GitHubDeploymentStatus; time: number }[] = [];
  for (const status of statuses) {
    if (!status || typeof status.state !== 'string') return null;
    const time = timestamp(status.created_at);
    if (time === null) return null;
    ordered.push({ status, time });
  }
  ordered.sort((a, b) => a.time - b.time);
  let latest: GitHubDeploymentStatus | null = null;
  let latestTime = -Infinity;
  let environment = deployment.environment;
  for (const { status, time } of ordered) {
    // Equal-second conflicting updates cannot be ordered from this projection.
    if (
      time === latestTime &&
      latest &&
      (status.state !== latest.state || status.environment !== latest.environment)
    )
      return null;
    if (time > latestTime) {
      latest = status;
      latestTime = time;
    }
    if (status.environment !== undefined) environment = status.environment;
  }
  if (!latest) return null;
  const states: Readonly<Record<string, string>> = {
    success: 'succeeded',
    failure: 'failed',
    error: 'failed',
    in_progress: 'in-progress',
  };
  const status = Object.hasOwn(states, latest.state) ? states[latest.state] : undefined;
  if (!status) return null;
  // No branch heuristics or assumption that every non-production target is preview.
  if (environment !== 'production' && environment !== 'preview') return null;
  return {
    id: deployment.node_id,
    summary: deployment.description ?? '',
    // Status creation establishes recording time, not actual deployment timing.
    // This projection has no authoritative lifecycle timestamps to populate.
    statusRecordedAt: latest.created_at,
    revision: deployment.sha,
    environment,
    status,
  };
}

/** No fetching or presentation. Both mapped and rejected batches use the neutral result shape. */
export function adaptGitHubDeployments(
  entries: readonly GitHubDeploymentHistoryEntry[],
): DeploymentHistoryResult {
  if (!Array.isArray(entries)) return normalizeDeploymentHistory(entries);
  // null is deliberately invalid at the neutral boundary: no dropped records or fallback facts.
  return normalizeDeploymentHistory(entries.map(mapEntry));
}
