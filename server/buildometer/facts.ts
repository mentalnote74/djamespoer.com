/** Private server-only facts: never returned by the API. No person/body fields requested. */
export interface Change {
  field: string;
  from: string | null;
  to: string | null;
  fromString: string | null;
  toString: string | null;
}
export interface Issue {
  key: string;
  type: string;
  subtask: boolean;
  status: string;
  category: string;
  created: string;
  updated: string;
  resolved: string | null;
  resolution: string | null;
  parent: string | null;
  labels: string[];
  components: string[];
  points: number | null;
  originalSeconds: number | null;
  remainingSeconds: number | null;
  sprintIds: string[];
  history: { at: string; changes: Change[] }[];
  historyComplete: boolean;
}
export interface JiraFacts {
  fetchedAt: string;
  issues: Issue[];
  statuses: Record<string, string>;
  fields: { points: string | null; sprint: string | null };
  sprints: { id: string; state: string; start: string | null; end: string | null }[];
}
export const validDate = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v));
export const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid provider object');
  return v as Record<string, unknown>;
};
export const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);
