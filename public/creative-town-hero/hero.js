// Hero presentation only. The saved scene.js selector and cast manifest are unchanged.
(async () => {
  const world = document.getElementById('world');
  const moving = [
    ...document.querySelectorAll(
      '#street-guests > .actor:not(.window-guest), .larry, .pizza, .sanitation, [data-actor="elvis-like"]',
    ),
  ];
  await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  const alpha = new Map();
  function bounds(image) {
    if (alpha.has(image.src)) return alpha.get(image.src);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 96, 96);
    const pixels = context.getImageData(0, 0, 96, 96).data;
    let left = 96,
      top = 96,
      right = 0,
      bottom = 0;
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++)
        if (pixels[(y * 96 + x) * 4 + 3] > 24) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x + 1);
          bottom = Math.max(bottom, y + 1);
        }
    const result = [left / 96, top / 96, right / 96, bottom / 96];
    alpha.set(image.src, result);
    return result;
  }
  function box(node) {
    const origin = world.getBoundingClientRect(),
      scale = origin.width / 1664;
    const image = node.matches('img') ? node : node.querySelector('img');
    const rect = (image || node).getBoundingClientRect();
    let x = (rect.left - origin.left) / scale,
      y = (rect.top - origin.top) / scale,
      w = rect.width / scale,
      h = rect.height / scale;
    if (image?.naturalWidth) {
      const ratio = Math.min(w / image.naturalWidth, h / image.naturalHeight),
        iw = image.naturalWidth * ratio,
        ih = image.naturalHeight * ratio;
      const a = bounds(image);
      const flip = getComputedStyle(image).transform.startsWith('matrix(-1');
      x += (w - iw) / 2 + iw * (flip ? 1 - a[2] : a[0]);
      y += h - ih + ih * a[1];
      w = iw * (a[2] - a[0]);
      h = ih * (a[3] - a[1]);
    }
    return [x, y, w, h];
  }
  const overlap = (a, b) =>
    Math.max(0, Math.min(a[0] + a[2] + 3, b[0] + b[2] + 3) - Math.max(a[0] - 3, b[0] - 3)) *
    Math.max(0, Math.min(a[1] + a[3] + 3, b[1] + b[3] + 3) - Math.max(a[1] - 3, b[1] - 3));
  const fixed = [...document.querySelectorAll('[data-actor]')].filter(
    (node) => !moving.includes(node) && !node.closest('.window-guest'),
  );
  const occupied = [
    ...fixed.map(box),
    ...[...document.querySelectorAll('.showbill,.plans,.queue-guide,.table-furniture')].map(box),
  ];
  const protectedArt = [
    ...document.querySelectorAll('.queue-yak,.showbill,.plans,[data-actor="yak-shaving"]'),
  ].map(box);
  const slots = window.TOWN_SCENE.roamSlots;
  let unresolved = 0,
    relocated = 0;
  // Keep the selected cast. Fit their visible artwork into existing placement slots.
  for (const node of moving.sort((a, b) => {
    const aa = box(a),
      bb = box(b);
    return bb[2] * bb[3] - aa[2] * aa[3];
  })) {
    const original = {
      left: node.style.left,
      top: node.style.top,
      width: node.style.width,
      height: node.style.height,
      zIndex: node.style.zIndex,
    };
    const collision = (b, other) =>
      overlap(b, other) > Math.min(b[2] * b[3], other[2] * other[3]) * 0.035;
    const safe = (b) =>
      b[0] >= 4 &&
      b[1] >= 0 &&
      b[0] + b[2] <= 1660 &&
      b[1] + b[3] <= 932 &&
      !protectedArt.some((other) => collision(b, other));
    const score = (b) =>
      occupied.reduce(
        (total, other) => total + overlap(b, other) / Math.min(b[2] * b[3], other[2] * other[3]),
        0,
      );
    let placed = safe(box(node));
    if (!placed) {
      const width = parseFloat(getComputedStyle(node).width),
        height = parseFloat(getComputedStyle(node).height);
      const roleSlots = window.TOWN_SCENE.roleLocations[node.dataset.actor];
      let best = null,
        bestScore = Infinity;
      const candidates = roleSlots || slots.filter(slot =>
        !window.TOWN_SCENE.windowIneligible.includes(node.dataset.actor) || slot[1] >= 500,
      );
      for (const [x, y, w, h, z] of candidates) {
        const factor = roleSlots ? null : Math.min(1, w / width, h / height);
        const candidate = {
          left: x + 'px',
          top: (roleSlots ? y : y + h - height * factor) + 'px',
          width: (roleSlots ? w : width * factor) + 'px',
          height: (roleSlots ? h : height * factor) + 'px',
          zIndex: roleSlots ? original.zIndex : String(z),
        };
        Object.assign(node.style, candidate);
        const b = box(node);
        if (safe(b) && score(b) < bestScore) {
          best = candidate;
          bestScore = score(b);
        }
      }
      if (best) {
        Object.assign(node.style, best);
        placed = true;
        relocated++;
      }
    }
    if (!placed) {
      Object.assign(node.style, original);
      unresolved++;
    }
    occupied.push(box(node));
  }
  window.townHeroLayout = { relocated, unresolved };
  // Reuse the existing motion switch for background/visibility and live OS preference changes.
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion() {
    const paused = document.hidden || media.matches;
    if (world.classList.contains('paused') !== paused) document.getElementById('motion').click();
  }
  document.addEventListener('visibilitychange', syncMotion);
  media.addEventListener('change', syncMotion);
  syncMotion();
})();
