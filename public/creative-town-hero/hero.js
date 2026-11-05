// Selection belongs to scene.js; all residents share the placement.js geometry pass.
(() => {
  'use strict';
  const world = document.getElementById('world'),
    placement = window.TownPlacement;
  const { width: W, height: H, maskCell: cell } = placement.LAYOUT;
  const metrics = new Map(), silhouettes = new Map();
  function silhouette(image) {
    if (silhouettes.has(image.src)) return silhouettes.get(image.src);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,64,64);
    const rgba=ctx.getImageData(0,0,64,64).data, points=[];
    for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(rgba[(y*64+x)*4+3]>0)points.push([x,y]);
    const result={size:64,points};silhouettes.set(image.src,result);return result;
  }
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
    ctx.drawImage(image, 0, 0, c.width, 936 / cell);
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
    for (const p of plates) ctx.drawImage(p, 0, 0, c.width, 936 / cell);
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
      fixtures: [
        ...[515,590,665,740].map((x,i)=>({id: 'saloon-window-'+i,rect:[x,440,64,80],lip:520})),
        {id:'workshop-window',rect:[100,520,70,110],lip:630},
        {id:'dr-window',rect:[860,450,80,90],lip:535},
        ...[340,425].map((x,i)=>({id:'church-window-'+i,rect:[x,470,70,130],lip:600})),
        ...[1080,1200].map((x,i)=>({id:'office-window-'+i,rect:[x,500,90,120],lip:620})),
        ...[1390,1520].map((x,i)=>({id:'counter-window-'+i,rect:[x,500,100,140],lip:640})),
        ...[1060,1190].map((x,i)=>({id:'bench-seat-'+i,rect:[x,630,100,85],lip:715})),
        ...plates
        .filter((p) => !p.src.endsWith('/foreground.webp'))
        .map((p, i) => fixture(p, 'fixture-' + i))],
    };
    return scenery;
  }
  async function layout() {
    const layoutStarted=performance.now();
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
        'scoob-and-shag',
        'marmaduke',
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
          ].includes(id) && !node.matches('.shaving');
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
          ...(priority.includes(id) || window.TOWN_SCENE.windowIneligible.includes(id) ||
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
        // Near-ground reference sizes follow character form, not the slot that
        // happened to select them. Perspective is applied only after choosing depth.
        const reference = {
          'scoob-and-shag': [270,245], marmaduke: [280,200], 'battle-cat': [220,150],
          larry: [80,210], 'sanitation-engineer': [100,180], 'elvis-like': [88,173], 'pizza-courier': [96,157],
          'pig-prime': [220,184], 'emotional-support-donkey': [190,178],
        }[id];
        const small = /(?:mouse|smurf|turtle|tyke|noid|yoda|lgm|rabbit|snoopy)/.test(id);
        const human = ground && !priority.includes(id) && !torso;
        const baseH = human ? (small ? 120 : 175) : current.h;
        const base = reference ? {w:reference[0],h:reference[1]} : human
          ? {w:baseH * source.naturalWidth/source.naturalHeight,h:baseH}
          : {w:current.w,h:current.h};
        let prefer = [{ ...current, ground }, ...registered];
        if(id==='internet-fairy')prefer.unshift({x:460,y:20,w:130,h:140});
        if(id==='superman')prefer.unshift(...[120,320,500].map(x=>({x,y:85,w:165,h:78})));
        if (ground && !torso) prefer = prefer.map(p => {
          const foot=p.y+p.h;
          const factor=foot<500?.48:foot<650?.62:Math.min(1,.62+.38*(foot-650)/286);
          const w=base.w*factor,h=base.h*factor;
          return {...p,x:p.x+(p.w-w)/2,y:foot-h,w,h};
        });
        return {
          id,
          node: holder,
          aspect: source.naturalWidth / source.naturalHeight,
          shape: {...silhouette(source),mirror:facing?.includes('-1')},
          alpha:
            id === 'sanitation-engineer' || node.querySelector('.ticket')
              ? [0, 0, 1, 1]
              : alpha(source),
          base,
          baseFoot: ground ? 930 : current.y + current.h,
          ground,
          foreground:true,
          prefer,
          surfaces: ground && !torso && !window.TOWN_SCENE.windowIneligible.includes(id) && !['pig-prime','emotional-support-donkey','complaint-yak-14','complaint-yak-27'].includes(id),
          core: priority.includes(id),
          torso,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const tier = actor => actor.ground === false ? 0 : actor.torso ? 1 : actor.surfaces ? 3 : 2;
        return tier(a)-tier(b) || b.base.w*b.base.h-a.base.w*a.base.h;
      });
    const secondTable=world.querySelector('.table-b');
    if(secondTable&&!secondTable.dataset.spaced){secondTable.style.left=(parseFloat(getComputedStyle(secondTable).left)+155)+'px';secondTable.dataset.spaced='true';}
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
    const obstacles = [...world.querySelectorAll('[data-prop],.showbill,.plans')].map(
      (n) => {
        const b = rect(n);
        return [b.x, b.y, b.w, b.h];
      },
    );
    // The open queue barrier stays behind residents, allowing its intended queue lane.
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
      result = await placement.solveCrowdInSlices({ actors, obstacles, zones, ...env, onPlace: show });
    if (version !== generation) return;
    for (const id of result.conflicts) byId.get(id).node.remove();
    world.setAttribute('role', 'img');
    world.setAttribute(
      'aria-label',
      'Creative Town square: residents, two game tables, shops, a balloon and small visual stories.',
    );
    window.townHeroLayout = {
      ...result,
      layoutMs:performance.now()-layoutStarted,
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
