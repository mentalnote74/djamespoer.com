import { progressPresentation } from './progress';
describe('SCRUM-173 progress provenance and freshness', () => {
  const now = Date.parse('2026-11-06T20:00:00Z');
  const sample = {
    observedAt: '2026-10-19T00:10:06Z',
    shipped: 152,
    total: 395,
    latestEligibleReleaseAt: '2026-11-06T17:43:39Z',
  };
  it('keeps the real date and value while identifying a newer verified eligible release', () => {
    const p = progressPresentation(sample, now);
    expect(p.percent).toBe(38.5);
    expect(p.state).toBe('stale');
    expect(p.observedAt).toBe('2026-10-19T00:10:06.000Z');
    expect(p.label).toContain('Oct 18, 2026');
    expect(p.label).toContain('EDT');
  });
  it('is reconciled only through the recorded release, never arbitrary elapsed age', () => {
    expect(progressPresentation({ ...sample, observedAt: '2026-11-06T18:00:00Z' }, now).state).toBe(
      'current',
    );
    expect(
      progressPresentation({ ...sample, latestEligibleReleaseAt: '2026-10-18T10:00:00Z' }, now)
        .state,
    ).toBe('current');
    expect(progressPresentation({ ...sample, latestEligibleReleaseAt: undefined }, now).state).toBe(
      'unverified',
    );
  });
  it.each([
    null,
    {},
    { ...sample, observedAt: 'invalid' },
    { ...sample, observedAt: '2027-01-01' },
    { ...sample, total: 0 },
    { ...sample, shipped: 396 },
    { ...sample, shipped: -1 },
    { ...sample, shipped: 1.5 },
  ])('shows neutral unavailable values for missing/invalid observation %j', (input) => {
    const p = progressPresentation(input, now);
    expect(p.percent).toBeNull();
    expect(p.observedAt).toBeNull();
    expect(p.state).toBe('unavailable');
  });
  it('repeated fetches and rebuilds cannot advance the observed date', () => {
    const first = progressPresentation(sample, now),
      later = progressPresentation(sample, now + 86400000);
    expect(later.observedAt).toBe(first.observedAt);
    expect(later.percent).toBe(first.percent);
    expect(sample.observedAt).toBe('2026-10-19T00:10:06Z');
  });
});
