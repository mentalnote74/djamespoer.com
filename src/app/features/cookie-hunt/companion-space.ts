// Find room in the rendered page without changing its layout or covering its ink.
export function companionSpace(document: Document): { x: number; y: number } | null {
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
  // Prefer the existing gap above the introduction rather than a separate control stack.
  const introduction = document.querySelector('.home-construction');
  if (introduction) {
    const top = introduction.getBoundingClientRect().top;
    for (const y of [top - height - gap, top - height / 2]) {
      for (let x = view.innerWidth - width - 16; x >= gap; x -= 8) {
        if (clear(x, y)) return { x, y };
      }
    }
  }
  for (let y = view.innerHeight - height - gap; y >= gap; y -= 16) {
    for (let x = view.innerWidth - width - gap; x >= gap; x -= 16) {
      if (clear(x, y)) return { x, y };
    }
  }
  return null;
}
