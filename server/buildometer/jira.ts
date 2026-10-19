import { object, text, validDate, type JiraFacts, type Issue, type Change } from './facts.ts';
export interface JiraConfig {
  JIRA_BASE_URL?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_PROJECT_KEY?: string;
  JIRA_BOARD_ID?: string;
}
/** Read-only POST search and GET endpoints. Never use browser query parameters for provider scope. */
export async function acquireJira(
  config: JiraConfig,
  fetcher: typeof fetch = fetch,
): Promise<JiraFacts> {
  const base = new URL(config.JIRA_BASE_URL || 'https://invalid.local');
  if (
    base.protocol !== 'https:' ||
    !base.hostname.endsWith('.atlassian.net') ||
    base.pathname !== '/' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !config.JIRA_EMAIL ||
    !config.JIRA_API_TOKEN ||
    !/^[A-Z][A-Z0-9_]*$/.test(config.JIRA_PROJECT_KEY || '')
  )
    throw Error('Jira configuration missing');
  const auth = 'Basic ' + btoa(config.JIRA_EMAIL + ':' + config.JIRA_API_TOKEN);
  const read = async (path: string, body?: unknown): Promise<Record<string, unknown>> => {
    const r = await fetcher(new URL(path, base), {
      method: body ? 'POST' : 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: auth,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) throw Error('Jira source unavailable');
    const v: unknown = await r.json();
    return object(v);
  };
  // Discover actual schema IDs; do not assume a customfield number across sites.
  const fieldResponse = await fetcher(new URL('/rest/api/3/field', base), {
    headers: { Authorization: auth, Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  if (!fieldResponse.ok) throw Error('Jira field discovery unavailable');
  const fields: unknown = await fieldResponse.json();
  if (!Array.isArray(fields)) throw Error('Invalid fields');
  const matching = (plugin: string): string | null => {
    const found = fields.map(object).filter((f) => {
      const schema = f.schema ? object(f.schema) : {};
      return schema.custom === plugin;
    });
    if (found.length > 1) throw Error('Ambiguous field mapping');
    return found.length ? text(found[0].id) : null;
  };
  const points = matching('com.pyxis.greenhopper.jira:jsw-story-points'),
    sprint = matching('com.pyxis.greenhopper.jira:gh-sprint');
  const statusR = await fetcher(
    new URL('/rest/api/3/project/' + config.JIRA_PROJECT_KEY + '/statuses', base),
    {
      headers: { Authorization: auth, Accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!statusR.ok) throw Error('Status discovery unavailable');
  const st: unknown = await statusR.json();
  if (!Array.isArray(st)) throw Error('Invalid statuses');
  const statuses: Record<string, string> = {};
  for (const type of st) {
    const v = object(type);
    if (!Array.isArray(v.statuses)) throw Error('Invalid statuses');
    for (const s of v.statuses) {
      const t = object(s);
      statuses[String(t.id)] = String(object(t.statusCategory).key);
    }
  }
  const rows: Record<string, unknown>[] = [];
  let next: string | undefined;
  const tokens = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const r = await read('/rest/api/3/search/jql', {
      jql: 'project = ' + config.JIRA_PROJECT_KEY + ' ORDER BY key ASC',
      fields: [
        'issuetype',
        'status',
        'created',
        'updated',
        'resolution',
        'resolutiondate',
        'parent',
        'labels',
        'components',
        'timeoriginalestimate',
        'timeestimate',
        ...(points ? [points] : []),
        ...(sprint ? [sprint] : []),
      ],
      maxResults: 100,
      ...(next ? { nextPageToken: next } : {}),
    });
    if (!Array.isArray(r.issues)) throw Error('Invalid issue page');
    rows.push(...r.issues.map(object));
    next = text(r.nextPageToken) || undefined;
    if (r.isLast === true) break;
    if (!next) throw Error('Incomplete search pagination');
    if (tokens.has(next) || page === 99) throw Error('Incomplete issue pagination');
    tokens.add(next);
  }
  if (new Set(rows.map((r) => r.key)).size !== rows.length) throw Error('Duplicate issue page');
  const issues: Issue[] = rows.map((r) => {
    const f = object(r.fields),
      t = object(f.issuetype),
      s = object(f.status);
    if (!validDate(f.created) || !validDate(f.updated) || typeof r.key !== 'string')
      throw Error('Invalid issue dates');
    const number = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
    return {
      key: r.key,
      type: String(t.name),
      subtask: t.subtask === true,
      status: String(s.id),
      category: String(object(s.statusCategory).key),
      created: f.created,
      updated: f.updated,
      resolved: validDate(f.resolutiondate) ? f.resolutiondate : null,
      resolution: f.resolution ? text(object(f.resolution).name) : null,
      parent: f.parent ? text(object(f.parent).key) : null,
      labels: Array.isArray(f.labels)
        ? f.labels.filter((x): x is string => typeof x === 'string')
        : [],
      components: Array.isArray(f.components)
        ? f.components.map((x) => String(object(x).name))
        : [],
      points: points ? number(f[points]) : null,
      originalSeconds: number(f.timeoriginalestimate),
      remainingSeconds: number(f.timeestimate),
      sprintIds:
        sprint && Array.isArray(f[sprint])
          ? (f[sprint] as unknown[]).map((x) => String(object(x).id))
          : [],
      history: [],
      historyComplete: false,
    };
  });
  // Bulk, paginated and field-filtered: no one-call-per-metric or truncated expand=changelog.
  const byKey = new Map(issues.map((i) => [i.key, i]));
  const byId = new Map(rows.map((r) => [String(r.id), byKey.get(String(r.key))!]));
  for (let offset = 0; offset < issues.length; offset += 500) {
    let token: string | undefined;
    const seen = new Set<string>();
    for (let page = 0; page < 200; page++) {
      const r = await read('/rest/api/3/changelog/bulkfetch', {
        issueIdsOrKeys: issues.slice(offset, offset + 500).map((i) => i.key),
        fieldIds: [
          'status',
          'resolution',
          'labels',
          'issuetype',
          'project',
          'parent',
          'timeoriginalestimate',
          'timeestimate',
          ...(points ? [points] : []),
          ...(sprint ? [sprint] : []),
        ],
        maxResults: 1000,
        ...(token ? { nextPageToken: token } : {}),
      });
      if (!Array.isArray(r.issueChangeLogs)) throw Error('Invalid changelog page');
      for (const log of r.issueChangeLogs) {
        const l = object(log),
          issue = byId.get(String(l.issueId));
        if (!issue || !Array.isArray(l.changeHistories)) throw Error('Invalid issue changelog');
        for (const h of l.changeHistories) {
          const v = object(h);
          if (!validDate(v.created) || !Array.isArray(v.items)) throw Error('Invalid history');
          issue.history.push({
            at: v.created,
            changes: v.items.map((x) => {
              const i = object(x);
              return {
                field: String(i.fieldId ?? i.field),
                from: text(i.from),
                to: text(i.to),
                fromString: text(i.fromString),
                toString: text(i.toString),
              } satisfies Change;
            }),
          });
        }
      }
      token = text(r.nextPageToken) || undefined;
      if (!token) break;
      if (seen.has(token) || page === 199) throw Error('Incomplete changelog pagination');
      seen.add(token);
    }
    for (const i of issues.slice(offset, offset + 500)) i.historyComplete = true;
  }
  const sprints: JiraFacts['sprints'] = [];
  if (config.JIRA_BOARD_ID) {
    if (!/^\d+$/.test(config.JIRA_BOARD_ID)) throw Error('Invalid board');
    const board = await read('/rest/agile/1.0/board/' + config.JIRA_BOARD_ID + '/configuration');
    const configured = board.estimation ? object(board.estimation) : {};
    if (configured.field && points && object(configured.field).fieldId !== points)
      throw Error('Board estimate mismatch');
    for (let startAt = 0; startAt < 10000;) {
      const r = await read(
        '/rest/agile/1.0/board/' +
          config.JIRA_BOARD_ID +
          '/sprint?startAt=' +
          startAt +
          '&maxResults=50',
      );
      if (!Array.isArray(r.values)) throw Error('Invalid sprints');
      for (const v of r.values) {
        const x = object(v);
        sprints.push({
          id: String(x.id),
          state: String(x.state),
          start: validDate(x.startDate) ? x.startDate : null,
          end: validDate(x.endDate) ? x.endDate : null,
        });
      }
      if (r.isLast === true) break;
      if (!r.values.length) throw Error('Incomplete sprints');
      startAt += r.values.length;
    }
  }
  return {
    fetchedAt: new Date().toISOString(),
    issues,
    statuses,
    fields: { points, sprint },
    sprints,
  };
}
