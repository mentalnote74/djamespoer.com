import { distanceToTarget, facingTarget, warmthAtDistance } from './rigby-scent';
describe('Rigby warmer and colder', () => {
  it('faces the cookie on either side and keeps orientation when directly aligned', () => {
    expect(facingTarget(200, 100, 1)).toBe(-1);
    expect(facingTarget(100, 200, -1)).toBe(1);
    expect(facingTarget(100, 101, -1)).toBe(-1);
  });
  it('gets steadily warmer approaching a target and colder retreating', () => {
    const distances = [400, 150, 100, 50, 0];
    const heat = distances.map((distance) => warmthAtDistance(distance, 180));
    expect(heat[0]).toBe(0);
    expect(heat.at(-1)).toBe(1);
    for (let n = 1; n < heat.length; n++) expect(heat[n]).toBeGreaterThan(heat[n - 1]);
    expect(warmthAtDistance(Infinity, 180)).toBe(0);
  });
  it('recognizes pointer entry without requiring a click, including keyboard-equivalent zero distance', () => {
    const rect = { left: 100, right: 200, top: 100, bottom: 140 } as DOMRect;
    expect(distanceToTarget(150, 120, rect)).toBe(0);
    expect(distanceToTarget(50, 120, rect)).toBe(50);
    expect(distanceToTarget(200, 180, rect)).toBe(40);
  });
});
