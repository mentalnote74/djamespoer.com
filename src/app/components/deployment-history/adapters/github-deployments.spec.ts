import { adaptGitHubDeployments, GitHubDeploymentHistoryEntry } from './github-deployments';

/** Fictional API-shaped test fixture only; never imported by the consumer. */
const fixture: GitHubDeploymentHistoryEntry = {
  deployment: {
    node_id: 'fixture-opaque-attempt-1',
    description: 'Fixture: improve focus',
    sha: 'a'.repeat(40),
    environment: 'production',
  },
  statuses: [
    { state: 'success', created_at: '2026-10-05T14:32:00Z', environment: 'production' },
    { state: 'in_progress', created_at: '2026-10-05T14:30:00Z' },
    { state: 'queued', created_at: '2026-10-05T14:29:00Z' },
  ],
};

describe('GitHub deployment adapter', () => {
  it.each(['success', 'failure', 'error'])(
    'accepts terminal-only %s without inventing lifecycle dates',
    (state) => {
      const result = adaptGitHubDeployments([
        { ...fixture, statuses: [{ ...fixture.statuses[0]!, state }] },
      ]);
      if (!result.ok) throw new Error('Expected terminal-only deployment');
      expect(result.rows[0]!.statusRecordedAt).toBe('2026-10-05T14:32:00.000Z');
      expect(result.rows[0]).not.toHaveProperty('startedAt');
      expect(result.rows[0]).not.toHaveProperty('completedAt');
    },
  );

  it('does not reinterpret an in-progress status creation time as deployment start', () => {
    const result = adaptGitHubDeployments([{ ...fixture, statuses: [fixture.statuses[1]!] }]);
    if (!result.ok) throw new Error('Expected reported deployment progress');
    expect(result.rows[0]!.statusRecordedAt).toBe('2026-10-05T14:30:00.000Z');
    expect(result.rows[0]).not.toHaveProperty('startedAt');
    expect(
      adaptGitHubDeployments([
        {
          ...fixture,
          statuses: fixture.statuses.map((status) => ({
            ...status,
            created_at: '2026-10-05T14:30:00Z',
          })),
        },
      ]).ok,
    ).toBe(false);
  });

  it('maps production success, the full revision, and status-recording time through normalization', () => {
    const result = adaptGitHubDeployments([fixture]);
    expect(result).toEqual({
      ok: true,
      rows: [
        {
          id: 'fixture-opaque-attempt-1',
          summary: 'Fixture: improve focus',
          statusRecordedAt: '2026-10-05T14:32:00.000Z',
          revision: 'a'.repeat(40),
          environment: 'production',
          status: 'succeeded',
        },
      ],
    });
  });

  it.each([
    ['failure', 'failed'],
    ['error', 'failed'],
    ['in_progress', 'in-progress'],
  ])('maps %s to %s', (state, expected) => {
    const result = adaptGitHubDeployments([
      {
        ...fixture,
        statuses: [fixture.statuses[1]!, { state, created_at: '2026-10-05T14:32:00Z' }],
      },
    ]);
    if (!result.ok) throw new Error('Expected valid fixture');
    expect(result.rows[0]!.status).toBe(expected);
    expect(result.rows[0]!.id).toBe(fixture.deployment.node_id);
  });

  it('uses the latest explicit environment, or the deployment environment when omitted', () => {
    const result = adaptGitHubDeployments([
      {
        ...fixture,
        statuses: [
          fixture.statuses[1]!,
          { state: 'success', created_at: '2026-10-05T14:32:00Z', environment: 'preview' },
        ],
      },
    ]);
    if (!result.ok) throw new Error('Expected valid fixture');
    expect(result.rows[0]!.environment).toBe('preview');
    const fallback = adaptGitHubDeployments([
      {
        ...fixture,
        deployment: { ...fixture.deployment, environment: 'preview' },
        statuses: [fixture.statuses[1]!],
      },
    ]);
    if (!fallback.ok) throw new Error('Expected valid fixture');
    expect(fallback.rows[0]!.environment).toBe('preview');
  });

  it('preserves attempt identity across updates, ordering, and repeated revisions', () => {
    const result = adaptGitHubDeployments([
      fixture,
      {
        ...fixture,
        deployment: { ...fixture.deployment, node_id: 'fixture-opaque-attempt-2' },
        statuses: [...fixture.statuses].reverse(),
      },
    ]);
    if (!result.ok) throw new Error('Expected valid fixtures');
    expect(result.rows.map((row) => row.id)).toEqual([
      'fixture-opaque-attempt-1',
      'fixture-opaque-attempt-2',
    ]);
    expect(result.rows[0]!.revision).toBe(result.rows[1]!.revision);
  });

  it('inherits the last explicit status environment when a later status omits it', () => {
    const result = adaptGitHubDeployments([
      {
        ...fixture,
        statuses: [
          { ...fixture.statuses[0]!, environment: undefined },
          { ...fixture.statuses[1]!, environment: 'preview' },
        ],
      },
    ]);
    if (!result.ok) throw new Error('Expected valid fixture');
    expect(result.rows[0]!.environment).toBe('preview');
  });

  it.each(['pending', 'queued', 'inactive', 'unknown'])(
    'rejects unsupported current state %s',
    (state) => {
      expect(
        adaptGitHubDeployments([
          {
            ...fixture,
            statuses: [fixture.statuses[1]!, { state, created_at: '2026-10-05T14:32:00Z' }],
          },
        ]).ok,
      ).toBe(false);
    },
  );

  it.each([
    { ...fixture, statuses: [] },
    { ...fixture, deployment: { ...fixture.deployment, description: null } },
    { ...fixture, deployment: { ...fixture.deployment, sha: '' } },
    { ...fixture, deployment: { ...fixture.deployment, node_id: '' } },
    {
      ...fixture,
      deployment: { ...fixture.deployment, environment: 'staging' },
      statuses: [fixture.statuses[1]!],
    },
    { ...fixture, statuses: [{ state: 'in_progress', created_at: '2026-02-30T00:00:00Z' }] },
    {
      ...fixture,
      statuses: [
        fixture.statuses[1]!,
        { state: 'success', created_at: fixture.statuses[1]!.created_at },
      ],
    },
  ])('rejects incomplete/malformed facts without returning a partial history', (entry) => {
    const result = adaptGitHubDeployments([fixture, entry]);
    expect(result.ok).toBe(false);
    expect('rows' in result).toBe(false);
  });

  it('rejects duplicate attempts, accepts empty history, and strips provider fields', () => {
    expect(adaptGitHubDeployments([fixture, fixture]).ok).toBe(false);
    expect(adaptGitHubDeployments([])).toEqual({ ok: true, rows: [] });
    const result = adaptGitHubDeployments([fixture]);
    if (!result.ok) throw new Error('Expected valid fixture');
    expect(Object.keys(result.rows[0]!).sort()).toEqual([
      'environment',
      'id',
      'revision',
      'status',
      'statusRecordedAt',
      'summary',
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /node_id|created_at|"sha"|statuses|deployment|in_progress/,
    );
  });
});
