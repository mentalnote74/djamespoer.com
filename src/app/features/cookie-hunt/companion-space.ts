// Find room in the rendered page without changing its layout or covering its ink.
export function companionSpace(document: Document): { x: number; y: number } | null {
  const view = document.defaultView;
  if (!view) return null;
  const width = 80,
    height = 156,
    gap = 8;
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
  for (let y = view.innerHeight - height - gap; y >= gap; y -= 16) {
    for (let x = view.innerWidth - width - gap; x >= gap; x -= 16) {
      if (
        visible.every(
          (r) =>
            x + width + gap <= r.left ||
            x - gap >= r.right ||
            y + height + gap <= r.top ||
            y - gap >= r.bottom,
        )
      )
        return { x, y };
    }
  }
  return null;
}
