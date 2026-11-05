// Selection belongs to scene.js; all residents share the placement.js geometry pass.
(() => {
  'use strict';
  const world = document.getElementById('world'),
    placement = window.TownPlacement;
  const { width: W, height: H, maskCell: cell } = placement.LAYOUT;
  const metrics = new Map();
  let assetBounds = {};
  const boundsReady = fetch(new URL('placement-bounds.json', document.baseURI))
    .then(response => response.ok ? response.json() : {})
    .then(records => { assetBounds = records; })
    .catch(() => {});
  let generation = 0,
    scenery;
  const rect = (node) => {
    const origin = world.getBoundingClientRect(),
      scale = origin.width / W,
      b = node.getBoundingClientRect();
    return {
      x: (b.x - origin.x) / scale,
      y: (b.y - origin.y) / scale,
      w: b.width / scale,
      h: b.height / scale,
    };
  };
  function alpha(image) {
    if (metrics.has(image.src)) return metrics.get(image.src);
    const measured = assetBounds[new URL(image.src).pathname.split('/').at(-1)];
    if (measured?.width === image.naturalWidth && measured.height === image.naturalHeight) {
      metrics.set(image.src, measured.alpha);
      return measured.alpha;
    }
    const c = document.createElement('canvas');
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let l = c.width,
      t = c.height,
      r = 0,
      b = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (data[(y * c.width + x) * 4 + 3] > 0) {
          l = Math.min(l, x);
          t = Math.min(t, y);
          r = Math.max(r, x + 1);
          b = Math.max(b, y + 1);
        }
    const result = [l / c.width, t / c.height, r / c.width, b / c.height];
    metrics.set(image.src, result);
    return result;
  }
  function raster(image) {
    const c = document.createElement('canvas');
    c.width = W / cell;
    c.height = H / cell;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, c.width, c.height);
    return { data: ctx.getImageData(0, 0, c.width, c.height).data, cols: c.width, rows: c.height };
  }
  // Derive usable fixture spans from opaque pixels, not a transparent plate's full box.
  function fixture(image, id) {
    const { data, cols, rows } = raster(image),
      heights = new Uint16Array(cols);
    let best = [0, 0, 0, 0],
      lip = rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const solid = data[(y * cols + x) * 4 + 3] > 200;
        heights[x] = solid ? heights[x] + 1 : 0;
        if (solid) lip = Math.min(lip, y);
      }
      const stack = [];
      for (let x = 0; x <= cols; x++) {
        const h = x === cols ? 0 : heights[x];
        let left = x;
        while (stack.length && stack.at(-1)[1] > h) {
          const [start, height] = stack.pop();
          left = start;
          if ((x - start) * height > best[2] * best[3])
            best = [start, y - height + 1, x - start, height];
        }
        if (h && (!stack.length || stack.at(-1)[1] < h)) stack.push([left, h]);
      }
    }
    return { id, rect: best.map((v) => v * cell), lip: lip * cell };
  }
  function environment() {
    if (scenery) return scenery;
    const plates = [...world.querySelectorAll('img.plate')].filter((i) =>
      /(?:foreground|bench-front|service-counter-front)\.webp$/.test(i.src),
    );
    const c = document.createElement('canvas');
    c.width = W / cell;
    c.height = H / cell;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    for (const p of plates) ctx.drawImage(p, 0, 0, c.width, c.height);
    const pixels = ctx.getImageData(0, 0, c.width, c.height).data,
      cols = c.width,
      rows = c.height;
    const sums = new Uint32Array((cols + 1) * (rows + 1)),
      at = (x, y) => sums[y * (cols + 1) + x];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        sums[(y + 1) * (cols + 1) + x + 1] =
          (pixels[(y * cols + x) * 4 + 3] > 0 ? 1 : 0) + at(x + 1, y) + at(x, y + 1) - at(x, y);
    const blocked = ([x, y, w, h]) => {
      const x0 = Math.max(0, Math.floor(x / cell)),
        y0 = Math.max(0, Math.floor(y / cell)),
        x1 = Math.min(cols, Math.ceil((x + w) / cell)),
        y1 = Math.min(rows, Math.ceil((y + h) / cell));
      if (x1 <= x0 || y1 <= y0) return 1;
      return (at(x1, y1) - at(x0, y1) - at(x1, y0) + at(x0, y0)) / ((x1 - x0) * (y1 - y0));
    };
    scenery = {
      blocked,
      fixtures: plates
        .filter((p) => !p.src.endsWith('/foreground.webp'))
        .map((p, i) => fixture(p, 'fixture-' + i)),
    };
    return scenery;
  }
  async function layout() {
    const version = ++generation;
    world.querySelector('#placed-residents')?.setAttribute('hidden', '');
    delete window.townHeroLayout;
    document.documentElement.dataset.placementReady = 'false';
    const originals = [...world.querySelectorAll('[data-actor]')].filter(
      (n) => n.dataset.actor !== 'argument-committee' && !n.closest('#placed-residents'),
    );
    // Until SCRUM-105 supplies collision-safe motion envelopes, freeze moving paths.
    // The sanitation sprite remains the sole self-contained ambient animation (maximum two).
    for (const n of originals) {
      n.style.setProperty('animation', 'none', 'important');
      n.style.visibility = 'hidden';
      n.dataset.placementSource = 'true';
      n.setAttribute('aria-hidden', 'true');
    }
    await Promise.all([boundsReady, ...[...document.images].map((i) => i.decode().catch(() => {}))]);
    if (version !== generation) return;
    world.querySelector('#placed-residents')?.remove();
    const root = document.createElement('div');
    root.id = 'placed-residents';
    world.append(root);
    const priority = [
      ...new Set([
        'james-balloon',
        'internet-fairy',
        'bigfoot',
        'superman',
        'scope-creep-watcher',
        'pig-prime',
        'larry',
        'yak-shaving',
        'sanitation-engineer',
        'emotional-support-donkey',
        'elvis-like',
        'pizza-courier',
        ...window.TOWN_SCENE.fixedDynamicCast,
      ]),
    ];
    const standingHeight = window.TOWN_SCENE.roamSlots.find((s) => s[1] >= 650)[3];
    const actors = originals
      .map((node) => {
        const source = node.matches('img') ? node : node.querySelector('img');
        if (!source?.naturalWidth) return null;
        const image = source.cloneNode(true);
        node.style.visibility = 'hidden';
        const current = rect(node),
          id = node.dataset.actor;
        const ground =
          ![
            'james-balloon',
            'superman',
            'internet-fairy',
            'bigfoot',
            'scope-creep-watcher',
          ].includes(id) && !node.matches('.window-guest,.shaving');
        const holder = document.createElement('div');
        holder.className = 'actor';
        holder.dataset.actor = id;
        holder.style.visibility = 'hidden';
        if (node.closest('.table-group'))
          holder.dataset.game = node.closest('.table-group').dataset.game;
        const facing = image.style.transform;
        image.removeAttribute('style');
        image.removeAttribute('class');
        image.removeAttribute('id');
        image.removeAttribute('data-actor');
        image.style.transform = facing;
        image.style.clipPath = 'none';
        image.alt = '';
        holder.append(image);
        root.append(holder);
        // A resident's existing ticket is part of their identifying prop, not disposable decoration.
        for (const detail of node.querySelectorAll('.ticket'))
          holder.append(detail.cloneNode(true));
        const torso = window.TOWN_SCENE.halfBodyAssets.includes(id) && id !== 'sanitation-engineer';
        const registered = [
          ...(window.TOWN_SCENE.roleLocations[id] || []),
          ...(window.TOWN_SCENE.windowIneligible.includes(id) ||
          [
            'pig-prime',
            'sanitation-engineer',
            'emotional-support-donkey',
            'james-balloon',
          ].includes(id)
            ? []
            : window.TOWN_SCENE.roamSlots.filter((s) => s[1] < 500)),
        ].map(([x, y, w, h]) => ({ x, y, w, h, registered: true }));
        const resident = window.TOWN_SCENE.alwaysResidents.find((r) => r.id === id);
        if (resident)
          registered.push(
            ...resident.spots.map(([x, y]) => ({
              x,
              y,
              w: resident.w,
              h: resident.h,
              registered: true,
            })),
          );
        const size = ground || torso ? Math.min(1, standingHeight / current.h) : 1;
        return {
          id,
          node: holder,
          aspect: source.naturalWidth / source.naturalHeight,
          alpha:
            id === 'sanitation-engineer' || node.querySelector('.ticket')
              ? [0, 0, 1, 1]
              : alpha(source),
          base: { w: current.w * size, h: current.h * size },
          baseFoot: current.y + current.h,
          prefer: [{ ...current, ground }, ...registered],
          core: priority.includes(id),
          torso,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const rank = (id) => (priority.includes(id) ? priority.indexOf(id) : priority.length);
        return (
          rank(a.id) - rank(b.id) ||
          Number(a.torso) - Number(b.torso) ||
          b.base.w * b.base.h - a.base.w * a.base.h
        );
      });
    const zones = [...world.querySelectorAll('.table-group')].map((group) => {
      const pieces = [...group.querySelectorAll('.table-furniture,.chair')].map(rect),
        x = Math.min(...pieces.map((p) => p.x)),
        y = Math.min(...pieces.map((p) => p.y));
      return [
        x,
        y,
        Math.max(...pieces.map((p) => p.x + p.w)) - x,
        Math.max(...pieces.map((p) => p.y + p.h)) - y,
      ];
    });
    const obstacles = [...world.querySelectorAll('[data-prop],.showbill,.plans,.queue-guide')].map(
      (n) => {
        const b = rect(n);
        return [b.x, b.y, b.w, b.h];
      },
    );
    const byId = new Map(actors.map(actor => [actor.id, actor]));
    const show = item => {
      if (version !== generation) return;
      const a = byId.get(item.id);
      for (const [key, v] of Object.entries({
        left: item.layout.x,
        top: item.layout.y,
        width: item.layout.w,
        height: item.layout.h,
      }))
        a.node.style.setProperty(key, v + 'px', 'important');
      a.node.style.setProperty('z-index', '101', 'important');
      a.node.style.setProperty('animation', 'none', 'important');
      if (item.layout.fixture) a.node.dataset.fixture = item.layout.fixture;
      a.node.style.visibility = 'visible';
    };
    const env = environment(),
      result = await placement.solveInSlices({ actors, obstacles, zones, ...env, onPlace: show });
    if (version !== generation) return;
    for (const id of result.conflicts) byId.get(id).node.remove();
    world.setAttribute('role', 'img');
    world.setAttribute(
      'aria-label',
      'Creative Town square: residents, two game tables, shops, a balloon and small visual stories.',
    );
    window.townHeroLayout = {
      ...result,
      actors: actors.map(({ node, ...a }) => a),
      zones,
      obstacles,
      fixtures: env.fixtures,
      blocked: env.blocked,
      gap: placement.GAP,
    };
    document.documentElement.dataset.capacityConflicts = result.conflicts.join(' ');
    document.documentElement.dataset.placementReady = 'true';
    const counter = document.getElementById('cast-count');
    if (counter)
      counter.textContent = `${result.placed.length} visible residents; ${result.conflicts.length} capacity conflicts (not squeezed in).`;
  }
  document.getElementById('shuffle').addEventListener('click', () => {
    void layout();
  });
  let manualPaused = false;
  document.getElementById('motion').addEventListener('click', (event) => {
    if (event.isTrusted) {
      manualPaused = world.classList.contains('paused');
      sync();
    }
    const target = world.querySelector('#placed-residents [data-actor="sanitation-engineer"] img');
    if (target) target.src = document.getElementById('sanitation').src;
  });
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    const paused = document.hidden || media.matches || manualPaused;
    if (world.classList.contains('paused') !== paused) document.getElementById('motion').click();
  };
  document.addEventListener('visibilitychange', sync);
  media.addEventListener('change', sync);
  sync();
  void layout();
})();
