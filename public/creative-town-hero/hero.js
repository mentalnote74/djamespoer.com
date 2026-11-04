// Hero presentation only. The saved scene.js selector and cast manifest are unchanged;
// placement.js decides where the roaming cast stands (SCRUM-102 personal-space rule).
(async () => {
  const world = document.getElementById('world');
  // Activity groups, building windows, the sky and fixed set pieces keep their authored spots.
  const authored =
    '.window-guest, [data-actor="superman"], [data-actor="yak-shaving"], [data-actor="desktop-sally"], [data-actor="bigfoot"], [data-actor="internet-fairy"]';
  // Spectators are torso-only cutouts that only read by standing behind a table, so they sit out.
  document.querySelectorAll('.table-spectator').forEach((node) => node.remove());
  const moving = [...document.querySelectorAll('.actor[data-actor]')].filter(
    (node) => !node.matches(authored),
  );
  moving.forEach((node) => (node.style.visibility = 'hidden'));
  // Decode off the main thread so measuring the sprites is not a long task. A backgrounded tab
  // may hold decodes until it is shown, so loaded pixels are used after a short wait instead.
  const loaded = (image) =>
    image.complete
      ? null
      : new Promise((done) => {
          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
        });
  await Promise.race([
    Promise.all([...document.images].map((image) => image.decode().catch(() => loaded(image)))),
    new Promise((done) => setTimeout(done, 3000)).then(() =>
      Promise.all([...document.images].map(loaded)),
    ),
  ]);
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
  function rectOf(node) {
    const origin = world.getBoundingClientRect(),
      scale = origin.width / 1664,
      rect = node.getBoundingClientRect();
    return [
      (rect.left - origin.left) / scale,
      (rect.top - origin.top) / scale,
      rect.width / scale,
      rect.height / scale,
    ];
  }
  function box(node) {
    const image = node.matches('img') ? node : node.querySelector('img');
    let [x, y, w, h] = rectOf(image || node);
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
  const union = (boxes) => {
    const x = Math.min(...boxes.map((b) => b[0])),
      y = Math.min(...boxes.map((b) => b[1]));
    return [
      x,
      y,
      Math.max(...boxes.map((b) => b[0] + b[2])) - x,
      Math.max(...boxes.map((b) => b[1] + b[3])) - y,
    ];
  };
  // Players drawn behind a table read as seated: nothing of them may show below the tabletop,
  // or their legs appear under the table. Cut them at the top's lower edge, read from the art.
  // A player too short to clear the tabletop would stand between the legs, so they take a seat
  // behind it instead, raised until most of them shows above the top.
  for (const furniture of document.querySelectorAll('.table-furniture')) {
    const table = rectOf(furniture);
    const behind = Number(getComputedStyle(furniture).zIndex);
    const surface = table[1] + table[3] * 0.09;
    for (const player of furniture.parentElement.querySelectorAll('.participant,.performer')) {
      const seat = box(player);
      const within =
        Math.min(seat[0] + seat[2], table[0] + table[2]) - Math.max(seat[0], table[0]);
      // Mostly beside the table: stand in front of its end rather than tucked behind it.
      if (within < seat[2] * 0.25) {
        if (Number(getComputedStyle(player).zIndex) < behind) player.style.zIndex = String(behind + 1);
        continue;
      }
      if (seat[1] < surface) continue;
      player.style.zIndex = String(behind - 1);
      player.style.translate = `0 ${-(seat[1] - (surface - seat[3] * 0.6))}px`;
    }
  }
  for (const furniture of document.querySelectorAll('.table-furniture')) {
    const art = document.createElement('canvas');
    art.width = 170;
    art.height = 95;
    const context = art.getContext('2d');
    context.drawImage(furniture, 0, 0, 170, 95);
    const pixels = context.getImageData(0, 0, 170, 95).data;
    const solid = (x, y) => pixels[(y * 170 + x) * 4 + 3] > 24;
    const topEdge = (x) => {
      let y = 0;
      while (y < 95 && !solid(x, y)) y++;
      while (y < 95 && solid(x, y)) y++;
      return y;
    };
    const table = rectOf(furniture);
    const behind = Number(getComputedStyle(furniture).zIndex);
    for (const player of furniture.parentElement.querySelectorAll('.participant,.performer')) {
      if (Number(getComputedStyle(player).zIndex) >= behind) continue;
      const seat = box(player);
      const from = Math.max(0, Math.floor(((seat[0] - table[0]) / table[2]) * 170));
      const to = Math.min(169, Math.ceil(((seat[0] + seat[2] - table[0]) / table[2]) * 170));
      let edge = 95;
      for (let x = from; x <= to; x++) edge = Math.min(edge, topEdge(x));
      const cut = rectOf(player)[1] + rectOf(player)[3] - (table[1] + (edge / 95) * table[3]);
      if (cut > 0) {
        player.querySelector('img').style.clipPath = `inset(0 0 ${cut}px 0)`;
        player.dataset.seated = 'behind-table';
      }
    }
  }
  // NO TRESPASSING: each table's top, legs, the floor between them and its seated players.
  const groups = [...document.querySelectorAll('.table-group')];
  const tables = groups.map((group) =>
    union([...group.querySelectorAll('.table-furniture,.participant,.performer')].map(box)),
  );
  // The lipsticked pig is in every scene: her front-left pen, in front of the committee and clear
  // of the planter, then the bike-shed parking bay (a snug corner of it when Gargamel's there).
  const pigSpots = [
    { x: 210, y: 786, w: 190, h: 144 },
    { x: 4, y: 600, w: 150, h: 120 },
    { x: 4, y: 614, w: 126, h: 104 },
  ];
  // SVG props are drawn letterboxed inside their element; measure the drawing itself.
  const drawn = (svg) => {
    const [x, y, w, h] = rectOf(svg);
    const view = svg.viewBox.baseVal;
    const scale = Math.min(w / view.width, h / view.height);
    return [
      x + (w - view.width * scale) / 2,
      y + (h - view.height * scale) / 2,
      view.width * scale,
      view.height * scale,
    ];
  };
  const obstacles = [
    ...[...document.querySelectorAll('[data-actor],[data-prop]')]
      .filter(
        (node) =>
          !moving.includes(node) &&
          !node.closest('.table-group,.window-guest') &&
          node.dataset.actor !== 'superman',
      )
      .map(box),
    ...[...document.querySelectorAll('.showbill,.window-guest')].map(rectOf),
    ...[...document.querySelectorAll('.plans,.queue-guide')].map(drawn),
  ];
  // Opaque planters, bench and counter fronts would cover anyone standing behind them.
  const cell = 4,
    cols = 1664 / cell,
    rows = 936 / cell;
  const mask = document.createElement('canvas');
  mask.width = cols;
  mask.height = rows;
  const paint = mask.getContext('2d', { willReadFrequently: true });
  for (const name of ['foreground', 'bench-front', 'service-counter-front']) {
    const plate = document.querySelector(`img.plate[src$="${name}.webp"]`);
    if (plate) paint.drawImage(plate, 0, 0, cols, rows);
  }
  const opaque = paint.getImageData(0, 0, cols, rows).data;
  const sums = new Uint32Array((cols + 1) * (rows + 1));
  const at = (x, y) => sums[y * (cols + 1) + x];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      sums[(y + 1) * (cols + 1) + x + 1] =
        (opaque[(y * cols + x) * 4 + 3] > 40 ? 1 : 0) + at(x + 1, y) + at(x, y + 1) - at(x, y);
  const blocked = ([x, y, w, h]) => {
    const x0 = Math.max(0, Math.floor(x / cell)),
      y0 = Math.max(0, Math.floor(y / cell));
    const x1 = Math.min(cols, Math.ceil((x + w) / cell)),
      y1 = Math.min(rows, Math.ceil((y + h) / cell));
    if (x1 <= x0 || y1 <= y0) return 0;
    return (at(x1, y1) - at(x0, y1) - at(x1, y0) + at(x0, y0)) / ((x1 - x0) * (y1 - y0));
  };
  const first = [
    'pig-prime',
    'emotional-support-donkey',
    'larry',
    'elvis-like',
    'pizza-courier',
    'sanitation-engineer',
  ];
  const rank = (node) => {
    const index = first.indexOf(node.dataset.actor);
    return index < 0 ? first.length : index;
  };
  const actors = moving
    .sort(
      (a, b) =>
        rank(a) - rank(b) || b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight,
    )
    .map((node) => {
      const image = node.querySelector('img');
      const current = {
        x: node.offsetLeft,
        y: node.offsetTop,
        w: node.offsetWidth,
        h: node.offsetHeight,
      };
      const id = node.dataset.actor;
      // Role spots first. Humanoids may also take a free raised roam slot (balcony, rooftop);
      // open ground is covered by the solver's own grid at the right perspective size.
      const raised = ['pig-prime', 'emotional-support-donkey', 'sanitation-engineer'].includes(id) ||
        window.TOWN_SCENE.windowIneligible.includes(id)
        ? []
        : window.TOWN_SCENE.roamSlots.filter((slot) => slot[1] < 500);
      const spots = [...(window.TOWN_SCENE.roleLocations[id] || []), ...raised].map(([x, y, w, h]) => ({
        x,
        y,
        w,
        h,
      }));
      return {
        id,
        node,
        aspect: image.naturalWidth / image.naturalHeight,
        alpha: bounds(image),
        base: { w: current.w, h: current.h },
        baseFoot: current.y + current.h,
        maxH: id === 'pig-prime' ? 200 : 260,
        core: rank(node) < first.length,
        prefer: id === 'pig-prime' ? [...pigSpots, current] : [current, ...spots],
      };
    });
  const { shifts, zones, placed, conflicts } = await window.TownPlacement.arrangeInSlices({
    tables,
    actors,
    obstacles,
    blocked,
    core: first,
    shifts: [0, 20, 40, 60, 80, 100, 120, 140, 160, -20, -40, -60],
  });
  groups.forEach((group, i) => (group.style.left = group.offsetLeft + shifts[i] + 'px'));
  for (const { id, layout } of placed) {
    const node = actors.find((actor) => actor.id === id).node;
    const foot = layout.y + layout.h;
    Object.assign(node.style, {
      left: layout.x + 'px',
      top: layout.y + 'px',
      width: layout.w + 'px',
      height: layout.h + 'px',
      zIndex: String(Math.round(61 + 36 * Math.min(1, Math.max(0, (foot - 560) / 376)))),
      visibility: '',
    });
  }
  // A full plaza is reported, never solved by crowding or hiding someone.
  for (const id of conflicts) actors.find((actor) => actor.id === id).node.remove();
  document.documentElement.dataset.capacityConflicts = conflicts.join(' ');
  window.townHeroLayout = {
    placed: placed.map(({ id, box }) => ({ id, box })),
    conflicts,
    actors: actors.map(({ node, ...actor }) => actor),
    shifts,
    zones,
    obstacles,
    blocked,
    gap: window.TownPlacement.GAP,
  };
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
