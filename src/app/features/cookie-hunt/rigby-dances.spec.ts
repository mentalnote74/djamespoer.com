import { RIGBY_DANCES, danceEnvelope, DANCE_DURATION } from './rigby-dances';
import { COOKIE_FLAVORS } from './cookie-trail';

describe('Rigby flavor choreographies', () => {
  it('covers all thirteen flavors with distinct articulated sequences', () => {
    expect(RIGBY_DANCES.map((d) => d.flavor)).toEqual([...COOKIE_FLAVORS]);
    expect(new Set(RIGBY_DANCES.map((d) => JSON.stringify(d.steps))).size).toBe(13);
    for (const dance of RIGBY_DANCES) {
      expect(new Set(dance.steps.map((s) => s.pose)).size).toBeGreaterThan(1);
      for (const s of dance.steps) {
        expect(s.pose).toBeGreaterThanOrEqual(0);
        expect(s.pose).toBeLessThan(16);
        // Worst-case square rotation: full 64px cell corners must fit its 128px envelope.
        const radians = (s.turn * Math.PI) / 180;
        const radius = 32 * (Math.abs(Math.sin(radians)) + Math.abs(Math.cos(radians)));
        expect(Math.abs(s.x) + radius).toBeLessThanOrEqual(64);
        expect(Math.abs(s.y) + radius).toBeLessThanOrEqual(64);
      }
    }
    expect(DANCE_DURATION).toBeGreaterThanOrEqual(3000);
    expect(DANCE_DURATION).toBeLessThanOrEqual(5000);
    expect(danceEnvelope(96)).toBe(192);
    expect(danceEnvelope(64)).toBe(128);
  });
  it('returns blue Rigby to orange and includes floor support changes for breakdancing', () => {
    const blue = RIGBY_DANCES[8].steps.map((s) => s.pose);
    expect(blue).toContain(13);
    expect(blue).toContain(14);
    expect(blue.at(-1)).toBe(0);
    expect(RIGBY_DANCES[1].steps.map((s) => s.pose)).toEqual(expect.arrayContaining([2, 4, 5, 6]));
  });
});
