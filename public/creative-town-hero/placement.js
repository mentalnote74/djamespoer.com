// SCRUM-102 placement rule: every roaming character gets a spot whose visible artwork keeps a
// personal-space gap from every other character, prop and protected table zone. Nobody is
// squeezed in, stacked, or tucked under/behind a table; if the plaza is full the character is
// reported as a capacity conflict instead. Pure geometry so it can be tested outside the page.
(function (root) {
  'use strict';

  // Open plaza paving in world pixels (1664x936 plate), kept below the bases of the painted
  // chalkboard, planters and trash can so nobody appears to stand on them. Generated spots must
  // put feet inside it; authored roam slots (balconies, roofs) are trusted.
  const WALKABLE = [
    [0, 700], [440, 700], [480, 714], [620, 714], [692, 700], [704, 666], [1000, 666],
    [1064, 704], [1252, 710], [1312, 762], [1664, 772], [1664, 930], [0, 930],
  ];
  // Freestanding props painted into the plate out on the paving: chalkboard, barrel planter and
  // Mission Control planter. They get the same personal space as any other prop. (Things against
  // a wall, like the bike, are scenery a character can stand in front of.)
  const PAINTED_PROPS = [[483, 530, 135, 177], [609, 593, 84, 110], [994, 603, 71, 94]];
  // Minimum clear space, in world pixels, between a character's visible artwork and anyone else's.
  const GAP = 22;
  const LAYOUT = Object.freeze({ width: 1664, height: 936, gap: GAP, maxTorsos: 2, maskCell: 4 });

  function fixtureCandidates(actor, fixtures, step) {
    const out = [];
    for (const fixture of fixtures) {
      const [x, , width] = fixture.rect;
      let layout = { x: 0, y: 0, w: actor.base.w, h: actor.base.h };
      let box = tight(layout, actor.aspect, actor.alpha);
      const scale = Math.min(1, (width - 2 * GAP) / box[2]);
      if (scale <= 0) continue;
      layout.w *= scale; layout.h *= scale;
      box = tight(layout, actor.aspect, actor.alpha);
      for (let left = x + GAP; left + box[2] <= x + width - GAP; left += step) {
        out.push({ ...layout, x: left - box[0], y: fixture.lip - LAYOUT.maskCell - box[1] - box[3], fixture: fixture.id });
      }
    }
    return out;
  }

  function inside([x, y], polygon = WALKABLE) {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  // Visible artwork of an object-fit:contain, bottom-centred image inside a layout box.
  // Alpha bounds are mirrored conservatively so either facing stays inside the box.
  function tight(layout, aspect, alpha) {
    const iw = Math.min(layout.w, layout.h * aspect), ih = iw / aspect;
    const x0 = layout.x + (layout.w - iw) / 2, y0 = layout.y + layout.h - ih;
    const l = Math.min(alpha[0], 1 - alpha[2]), r = Math.max(alpha[2], 1 - alpha[0]);
    return [x0 + iw * l, y0 + ih * alpha[1], iw * (r - l), ih * (alpha[3] - alpha[1])];
  }

  // Clear distance between two boxes (0 when touching or overlapping).
  function clearance(a, b) {
    const dx = Math.max(0, Math.max(a[0], b[0]) - Math.min(a[0] + a[2], b[0] + b[2]));
    const dy = Math.max(0, Math.max(a[1], b[1]) - Math.min(a[1] + a[3], b[1] + b[3]));
    return Math.hypot(dx, dy);
  }

  // Perspective: characters nearer the bottom of the plaza draw larger.
  const depth = (footY) => 0.62 + (0.38 * (Math.min(936, Math.max(650, footY)) - 650)) / 286;

  function groundCandidates(actor, step) {
    const out = [];
    const base = actor.base;
    // Core residents may step down to 85% size before they are ever left out.
    for (const scale of actor.core ? [1, 0.85] : [1]) {
      for (let footY = 930; footY >= 656; footY -= step) {
        const factor = (scale * depth(footY)) / depth(actor.baseFoot);
        const h = Math.min(actor.maxH || 260, base.h * factor), w = (base.w * h) / base.h;
        for (let footX = w / 2 + 4; footX <= 1660 - w / 2; footX += step) {
          out.push({ x: footX - w / 2, y: footY - h, w, h, ground: true, scaled: scale < 1 });
        }
      }
    }
    return out;
  }

  /**
   * actors: [{id, aspect, alpha, base:{w,h}, baseFoot, prefer:[layout], maxH?}] in priority order.
   * obstacles: fixed visible boxes [x,y,w,h]; zones: protected table zones [x,y,w,h].
   * blocked(box): fraction of the box covered by opaque foreground scenery.
   */
  function* solving({ actors, obstacles, zones, fixtures = [], blocked = () => 0, gap = GAP, step = 12, onPlace = () => {} }) {
    const taken = [...PAINTED_PROPS, ...obstacles, ...zones];
    const placed = [], conflicts = [];
    let torsoCount = 0;
    for (const actor of actors) {
      if (actor.torso && torsoCount >= LAYOUT.maxTorsos) { conflicts.push(actor.id); yield; continue; }
      const preferFoot = actor.prefer[0]
        ? [actor.prefer[0].x + actor.prefer[0].w / 2, actor.prefer[0].y + actor.prefer[0].h]
        : [832, 840];
      let best = null, bestScore = Infinity;
      const registered = actor.prefer.flatMap(layout =>
        layout.ground ? [layout] : [[0,0],[-gap,0],[gap,0],[0,-gap],[0,gap]].map(([dx,dy])=>({...layout,x:layout.x+dx,y:layout.y+dy})));
      const candidates = actor.torso ? fixtureCandidates(actor, fixtures, step) : [...registered, ...groundCandidates(actor, step)];
      let scanned = 0;
      for (const layout of candidates) {
        if (++scanned % 64 === 0) yield;
        const box = tight(layout, actor.aspect, actor.alpha);
        if (box[0] < 4 || box[1] < 0 || box[0] + box[2] > 1660 || box[1] + box[3] > 932) continue;
        if (layout.ground && !inside([box[0] + box[2] / 2, box[1] + box[3]])) continue;
        let room = Infinity;
        for (const other of taken) {
          room = Math.min(room, clearance(box, other));
          if (room < gap) break;
        }
        // Protect the entire artwork: stricter than the owner's 10% coverage budget,
        // without guessing which pixel contains a face, costume detail or signature prop.
        if (room < gap || blocked([box[0]-LAYOUT.maskCell,box[1]-LAYOUT.maskCell,box[2]+2*LAYOUT.maskCell,box[3]+2*LAYOUT.maskCell]) > 0)
          continue;
        // Prefer the authored spot, but reward elbow room so nobody bunches up.
        const foot = [layout.x + layout.w / 2, layout.y + layout.h];
        const score =
          Math.hypot(foot[0] - preferFoot[0], foot[1] - preferFoot[1]) * 0.05 -
          Math.min(room, 200) +
          (layout.scaled ? 40 : 0);
        if (score < bestScore) { best = { layout, box }; bestScore = score; }
      }
      if (best) {
        taken.push(best.box);
        placed.push({ id: actor.id, ...best });
        onPlace(placed.at(-1));
        if (actor.torso) torsoCount++;
      } else conflicts.push(actor.id);
      yield; // one actor per slice keeps the page responsive
    }
    return { placed, conflicts };
  }

  /**
   * The game tables are the biggest things on the plaza, so they may slide sideways to leave room
   * for everyone else. For each starting slide, tables are packed left to right so each keeps
   * personal space from the one before it. Options rank by: tables clear of each other, fewest
   * pieces of scenery touched, pig present, core residents present (in `core` order), fewest
   * capacity conflicts, least sliding. Returns one shift per table, in the given order.
   */
  function* arranging({ tables, actors, obstacles, blocked, core = [], gap = GAP, shifts = [0] }) {
    const order = tables.map((_, i) => i).sort((a, b) => tables[a][0] - tables[b][0]);
    const scenery = [...PAINTED_PROPS, ...obstacles];
    const touching = (zones) =>
      zones.reduce(
        (n, z) =>
          n + scenery.filter((o) => clearance(z, o) < gap).length + (z[0] < 4 || z[0] + z[2] > 1660),
        0,
      );
    const crowded = (zones) =>
      zones.reduce((n, z, i) => n + zones.slice(i + 1).filter((o) => clearance(z, o) < gap).length, 0);
    const options = [tables.map(() => 0)];
    for (const start of shifts) {
      const moved = tables.map(() => 0);
      let right = -Infinity;
      for (const i of order) {
        const [x, , w] = tables[i];
        moved[i] = Math.max(start, right + gap - x);
        right = x + moved[i] + w;
      }
      options.push(moved);
    }
    let best = null;
    for (const moved of options) {
      const zones = tables.map(([x, y, w, h], i) => [x + moved[i], y, w, h]);
      const { conflicts } = yield* solving({ actors, obstacles, zones, blocked, gap, step: 18 });
      const key = [
        crowded(zones),
        touching(zones),
        ...core.map((id) => +conflicts.includes(id)),
        conflicts.length,
        moved.reduce((sum, s) => sum + Math.abs(s), 0),
      ];
      const differs = best ? key.findIndex((v, i) => v !== best.key[i]) : -1;
      if (!best || (differs >= 0 && key[differs] < best.key[differs])) best = { moved, zones, key };
    }
    return {
      shifts: best.moved,
      zones: best.zones,
      ...(yield* solving({ actors, obstacles, zones: best.zones, blocked, gap })),
    };
  }

  function finish(steps) {
    let step;
    while (!(step = steps.next()).done);
    return step.value;
  }
  const solve = (options) => finish(solving(options));
  const arrange = (options) => finish(arranging(options));
  // Same result as arrange, but yields to the browser whenever a slice passes `budget` ms so the
  // layout never becomes a long task on a slow phone.
  async function arrangeInSlices(options, budget = 8) {
    const steps = arranging(options);
    let started = performance.now(), step;
    while (!(step = steps.next()).done) {
      if (performance.now() - started < budget) continue;
      await new Promise((resume) => setTimeout(resume));
      started = performance.now();
    }
    return step.value;
  }

  const api = {
    LAYOUT, WALKABLE, PAINTED_PROPS, GAP, inside, tight, clearance, solve, arrange, arrangeInSlices,
    async solveInSlices(options, budget = 8) {
      const steps = solving(options); let started = performance.now(), step;
      while (!(step = steps.next()).done) {
        if (performance.now() - started < budget) continue;
        await new Promise(resolve => setTimeout(resolve)); started = performance.now();
      }
      return step.value;
    },
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TownPlacement = api;
})(typeof window === 'undefined' ? globalThis : window);
