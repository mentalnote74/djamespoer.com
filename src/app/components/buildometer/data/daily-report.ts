export interface DailyDevReport {
  trigger: 'scheduled' | 'manual';
  schemaVersion: 1;
  id: string;
  date: string;
  observedAt: string;
  windowStart: string;
  previousId: string | null;
  release: { sha: string | null; workerVersion: string | null };
  project: {
    baselineId: string;
    total: number;
    shipped: number;
    remaining: number;
    completion: number;
    sourceObservedAt: string;
  } | null;
  projectStatus: 'approved-snapshot' | 'stale' | 'unavailable';
  scopeChange: { net: number; added: number; removed: number; reestimated: number } | null;
  jira: {
    completed: number | null;
    openBugLabelled: number | null;
    status: 'live' | 'unavailable';
    fetchedAt: string | null;
    note: string;
  };
  deployments: {
    count: number | null;
    status: 'live' | 'stale' | 'unavailable';
    fetchedAt: string | null;
    note: string;
  };
  evidence: { projectSha256: string | null; method: string };
}
export interface DailyReportArchive {
  schemaVersion: 1;
  reports: DailyDevReport[];
}
