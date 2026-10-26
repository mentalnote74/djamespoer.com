// Find room in the rendered page without changing its layout or covering its ink.
export function companionSpace(
  document: Document,
  target?: { x: number; y: number },
): { x: number; y: number } | null {
  const view = document.defaultView;
  if (!view) return null;
  const width = 64,
    height = 64,
    gap = 2;
  const blockers: DOMRect[] = [];
  const excluded = '.companion,.visually-hidden,script,style,[hidden]';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode,
      parent = node.parentElement;
    if (
      !node.textContent?.trim() ||
      !parent ||
      parent.closest(excluded) ||
      !parent.checkVisibility()
    )
      continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    blockers.push(...Array.from(range.getClientRects()));
  }
  for (const element of document.querySelectorAll<HTMLElement>(
    'a,button,input,textarea,select,img,svg,video,canvas,iframe,.carousel__viewport,header',
  )) {
    if (!element.closest(excluded) && element.checkVisibility())
      blockers.push(element.getBoundingClientRect());
  }
  const visible = blockers.filter(
    (r) => r.width && r.height && r.bottom > 0 && r.top < view.innerHeight,
  );
  const clear = (x: number, y: number) =>
    x >= gap &&
    y >= gap &&
    x + width <= view.innerWidth - gap &&
    y + height <= view.innerHeight - gap &&
    visible.every(
      (r) =>
        x + width + gap <= r.left ||
        x - gap >= r.right ||
        y + height + gap <= r.top ||
        y - gap >= r.bottom,
    );
  // Choose whitespace near the cookie throughout the viewport, never a dedicated lane.
  const goal = {
    x: Math.max(
      gap,
      Math.min(view.innerWidth - width - gap, (target?.x ?? view.innerWidth / 2) - width / 2),
    ),
    y: Math.max(
      gap,
      Math.min(
        view.innerHeight - height - gap,
        (target?.y ?? view.innerHeight * 0.65) - height / 2,
      ),
    ),
  };
  let best: { x: number; y: number } | null = null;
  let score = Infinity;
  const consider = (x: number, y: number) => {
    const distance = Math.hypot(x - goal.x, y - goal.y);
    if (distance < score && clear(x, y)) {
      best = { x, y };
      score = distance;
    }
  };
  const introduction = document.querySelector('.home-construction');
  if (introduction) {
    const top = introduction.getBoundingClientRect().top;
    for (const y of [top - height - gap, top - height / 2]) {
      for (let x = view.innerWidth - width - 16; x >= gap; x -= 8) {
        consider(x, y);
      }
    }
  }
  for (let y = view.innerHeight - height - gap; y >= gap; y -= 16) {
    for (let x = view.innerWidth - width - gap; x >= gap; x -= 16) {
      consider(x, y);
    }
  }
  return best;
}
