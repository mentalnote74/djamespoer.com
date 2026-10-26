export function warmthAtDistance(distance: number, range: number): number {
  return range > 0 && Number.isFinite(distance)
    ? Math.max(0, Math.min(1, 1 - distance / range))
    : 0;
}
export function distanceToTarget(x: number, y: number, box: DOMRect): number {
  return Math.hypot(
    Math.max(box.left - x, 0, x - box.right),
    Math.max(box.top - y, 0, y - box.bottom),
  );
}
// Authored side-profile sprites face right; scrolling never determines orientation.
export function facingTarget(dogX: number, targetX: number, previous = 1): number {
  return Math.abs(targetX - dogX) < 2 ? previous : targetX > dogX ? 1 : -1;
}
