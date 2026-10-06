import { normalizeDeploymentHistory } from './deployment-history-data';
const valid = {
  id: 'attempt-' + 'a'.repeat(64),
  revision: 'a'.repeat(7),
  createdAt: '2026-10-05T14:30:00.000Z',
  environment: 'production',
  status: 'failed',
};
describe('pipeline attempt data boundary', () => {
  it('allows repeated revisions with distinct stable IDs and optional summary/stage', () => {
    expect(
      normalizeDeploymentHistory([
        valid,
        {
          ...valid,
          id: 'attempt-' + 'b'.repeat(64),
          summary: 'Fixture change',
          stage: 'deployed',
          status: 'succeeded',
        },
      ]),
    ).toEqual({
      ok: true,
      rows: [
        valid,
        {
          ...valid,
          id: 'attempt-' + 'b'.repeat(64),
          summary: 'Fixture change',
          stage: 'deployed',
          status: 'succeeded',
        },
      ],
    });
  });
  it.each(['queued', 'in-progress', 'succeeded', 'failed', 'cancelled', 'skipped', 'terminated'])(
    'accepts status %s without assuming stage',
    (status) => {
      const result = normalizeDeploymentHistory([{ ...valid, status }]);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.rows[0]).not.toHaveProperty('stage');
    },
  );
  it.each(['deployed'])('accepts evidenced stage %s', (stage) =>
    expect(normalizeDeploymentHistory([{ ...valid, status: 'succeeded', stage }]).ok).toBe(true),
  );
  it.each([
    { createdAt: '2026-10-05T14:30:00Z' },
    { createdAt: '2026-10-05T10:30:00.000-04:00' },
    { createdAt: '2026-02-30T00:00:00.000Z' },
    { summary: undefined },
    { summary: '' },
    { stage: 'unknown' },
    { stage: undefined },
    { status: 'unknown' },
    { rawProvider: {} },
    { token: 'private' },
    { startedAt: '2026-10-05T14:30:00.000Z' },
    { statusRecordedAt: '2026-10-05T14:30:00.000Z' },
    { revision: ' spaced ' },
  ])('rejects malformed/private/extra rows as a whole batch %#', (fields) => {
    const result = normalizeDeploymentHistory([
      valid,
      { ...valid, id: 'attempt-' + 'b'.repeat(64), ...fields },
    ]);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('rows');
  });
  it('accepts unavailable revision without manufacturing it', () => {
    const { revision, ...row } = valid;
    expect(normalizeDeploymentHistory([row])).toEqual({ ok: true, rows: [row] });
  });
  it('rejects deployed stage on an unsuccessful attempt', () =>
    expect(normalizeDeploymentHistory([{ ...valid, stage: 'deployed' }]).ok).toBe(false));
  it('rejects duplicate attempt IDs', () =>
    expect(normalizeDeploymentHistory([valid, valid]).ok).toBe(false));
  it('rejects malformed collections/records', () => {
    for (const input of [null, {}, [null], [{}]])
      expect(normalizeDeploymentHistory(input).ok).toBe(false);
  });
  it('does not mutate source revisions or records', () =>
    expect(normalizeDeploymentHistory([Object.freeze(valid)])).toEqual({
      ok: true,
      rows: [valid],
    }));
});
