import { UtcTimestamp } from './utc-timestamp';
describe('Fixed audit UTC timestamps', () => {
  it('preserves the existing audit format independently of local timezone', () => {
    const pipe = new UtcTimestamp();
    expect(pipe.transform(0)).toBe('1970-01-01 00:00:00');
    expect(pipe.transform(Date.parse('2026-10-15T13:45:06Z') / 1000)).toBe('2026-10-15 13:45:06');
    expect(pipe.transform(Number.NaN)).toBe('Unavailable');
  });
});
