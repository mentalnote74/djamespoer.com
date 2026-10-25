// Authored regions checked against actual ink and controls; no independent game world.
export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  width: number;
  height: number;
}
export const FOOTPRINT = { width: 88, height: 80 };
export function clearAt(point: Point, blockers: readonly Box[], width: number): boolean {
  return (
    point.x >= 8 &&
    point.x + FOOTPRINT.width <= width - 8 &&
    point.y >= 0 &&
    blockers.every(
      (b) =>
        point.x + FOOTPRINT.width + 6 <= b.x ||
        point.x - 6 >= b.x + b.width ||
        point.y + FOOTPRINT.height + 6 <= b.y ||
        point.y - 6 >= b.y + b.height,
    )
  );
}
export function routeBetween(
  from: Point,
  to: Point,
  blockers: readonly Box[],
  width: number,
): Point[] | null {
  const routes = [
    [from, to],
    [from, { x: 8, y: from.y }, { x: 8, y: to.y }, to],
    [
      from,
      { x: width - FOOTPRINT.width - 8, y: from.y },
      { x: width - FOOTPRINT.width - 8, y: to.y },
      to,
    ],
  ];
  return routes.find((route) => clearPath(route, blockers, width)) ?? null;
}
export function clearPath(
  route: readonly Point[],
  blockers: readonly Box[],
  width: number,
): boolean {
  return route.slice(1).every((end, i) => {
    const start = route[i],
      steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 8));
    for (let n = 0; n <= steps; n++)
      if (
        !clearAt(
          {
            x: start.x + ((end.x - start.x) * n) / steps,
            y: start.y + ((end.y - start.y) * n) / steps,
          },
          blockers,
          width,
        )
      )
        return false;
    return true;
  });
}
export function along(route: readonly Point[], fraction: number): Point {
  const lengths = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.y - route[i].y));
  let remaining = lengths.reduce((a, b) => a + b, 0) * fraction;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const f = lengths[i] ? remaining / lengths[i] : 1;
      return {
        x: Math.round((route[i].x + (route[i + 1].x - route[i].x) * f) / 2) * 2,
        y: Math.round((route[i].y + (route[i + 1].y - route[i].y) * f) / 2) * 2,
      };
    }
    remaining -= lengths[i];
  }
  return route[route.length - 1];
}
export function measureWhitespace(home: HTMLElement): {
  spots: Point[];
  blockers: Box[];
  width: number;
} {
  const bounds = home.getBoundingClientRect(),
    document = home.ownerDocument;
  const box = (r: DOMRect): Box => ({
    x: r.left - bounds.left,
    y: r.top - bounds.top,
    width: r.width,
    height: r.height,
  });
  const blockers: Box[] = [];
  const walker = document.createTreeWalker(home, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode,
      parent = node.parentElement;
    if (
      !parent ||
      !node.textContent?.trim() ||
      parent.closest('app-rigby-encounter,script,style,.visually-hidden,[hidden]') ||
      !parent.checkVisibility()
    )
      continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects())
      if (rect.width && rect.height) blockers.push(box(rect));
  }
  for (const element of home.querySelectorAll<HTMLElement>(
    'img,svg,video,canvas,iframe,button,input,textarea,select,form,table,a,.carousel',
  )) {
    if (!element.closest('app-rigby-encounter') && element.checkVisibility())
      blockers.push(box(element.getBoundingClientRect()));
  }
  const spots: Point[] = [];
  for (const anchor of home.querySelectorAll<HTMLElement>('[data-rigby-anchor]')) {
    const r = box(anchor.getBoundingClientRect());
    const xs = [
      8,
      bounds.width - FOOTPRINT.width - 8,
      r.x + r.width - FOOTPRINT.width - 8,
      r.x + r.width - FOOTPRINT.width - 80,
      r.x - FOOTPRINT.width - 12,
      r.x + r.width + 12,
    ];
    const ys = [r.y - 80, r.y - 64, r.y, r.y + 64, r.y + r.height - FOOTPRINT.height - 8];
    for (const y of ys)
      for (const x of xs) {
        const point = { x: Math.round(x / 2) * 2, y: Math.round(y / 2) * 2 };
        if (
          clearAt(point, blockers, bounds.width) &&
          !spots.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < 40)
        )
          spots.push(point);
      }
  }
  return { spots, blockers, width: bounds.width };
}
