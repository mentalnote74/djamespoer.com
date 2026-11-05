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
    [0, 660], [440, 660], [480, 714], [620, 714], [692, 700], [704, 540], [820, 480], [980, 480], [1000, 540],
    [1064, 704], [1252, 710], [1312, 762], [1664, 772], [1664, 930], [0, 930],
  ];
  // Freestanding props painted into the plate out on the paving: chalkboard, barrel planter and
  // Mission Control planter. They get the same personal space as any other prop. (Things against
  // a wall, like the bike, are scenery a character can stand in front of.)
  const PAINTED_PROPS = [[483, 530, 135, 177], [609, 593, 84, 110], [994, 603, 71, 94]];
  // Minimum clear space, in world pixels, between a character's visible artwork and anyone else's.
  const GAP = 12;
  const LAYOUT = Object.freeze({ width: 1664, height: 936, gap: GAP, maxTorsos: 12, maskCell: 4 });

  function fixtureCandidates(actor, fixtures, step) {
    const out = [];
    for (const fixture of fixtures) {
      const [x, , width] = fixture.rect;
      let layout = { x: 0, y: 0, w: actor.base.w, h: actor.base.h };
      let box = tight(layout, actor.aspect, actor.alpha);
      const scale = Math.min(1, (width - 16) / box[2]);
      if (scale <= 0) continue;
      layout.w *= scale; layout.h *= scale;
      box = tight(layout, actor.aspect, actor.alpha);
      for (let left = x + 8; left + box[2] <= x + width - 8 + .01; left += step) {
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
    if (actor.ground === false) return out;
    const base = actor.base;
    // Preserve reference proportions; only world depth changes scale.
    for (const scale of [1]) {
      for (let footY = 930; footY >= 486; footY -= step) {
        const factor = (scale * depth(footY)) / depth(actor.baseFoot);
        const h = Math.min(actor.maxH || 260, base.h * factor), w = (base.w * h) / base.h;
        const visible=tight({x:0,y:0,w,h},actor.aspect,actor.alpha);
        for (let left = 4-visible[0]; left <= 1660-visible[0]-visible[2]; left += step) {
          const footX=left+w/2;
          out.push({ x: footX - w / 2, y: footY - h, w, h, ground: true, scaled: scale < 1 });
        }
      }
    }
    return out;
  }

  // Supported town surfaces, distributed across depth bands rather than packing
  // every guest into the two game-table corners. Sizes follow depth, not free space.
  const SURFACES = [
    { id: 'church-roof', left: 240, right: 445, foot: 405, scale: .52 },
    { id: 'tower-top', left: 610, right: 790, foot: 68, scale: .32 },
    { id: 'saloon-balcony', left: 510, right: 800, foot: 435, scale: .50 },
    { id: 'saloon-roof', left: 502, right: 800, foot: 348, scale: .48 },
    { id: 'mission-roof', left: 1030, right: 1300, foot: 450, scale: .56 },
    { id: 'grooming-eave', left: 1310, right: 1470, foot: 202, scale: .48 },
    { id: 'right-roof', left: 1310, right: 1655, foot: 90, scale: .48 },
    { id: 'town-stairs', left: 715, right: 1020, foot: 626, scale: .62 },
    { id: 'distant-street', left: 10, right: 730, foot: 292, scale: .38 },
  ];
  function surfaceCandidates(actor, step) {
    if (!actor.surfaces) return [];
    const out = [];
    for (const surface of SURFACES) {
      const w = actor.base.w * surface.scale, h = actor.base.h * surface.scale;
      for (let x = surface.left; x + w <= surface.right; x += step)
        out.push({ x, y: surface.foot - h, w, h, surface: surface.id });
    }
    return out;
  }

  /**
   * actors: [{id, aspect, alpha, base:{w,h}, baseFoot, prefer:[layout], maxH?}] in priority order.
   * obstacles: fixed visible boxes [x,y,w,h]; zones: protected table zones [x,y,w,h].
   * blocked(box): fraction of the box covered by opaque foreground scenery.
   */
  function* solving({ actors, obstacles, zones, fixtures = [], blocked = () => 0, gap = GAP, step = 12, onPlace = () => {}, preferenceWeight = .05, roomCap = 200, cache = {}, repairPasses = 0 }) {
    const hard = [...PAINTED_PROPS, ...obstacles, ...zones];
    const taken = [...hard];
    const cell=4, cols=Math.ceil(LAYOUT.width/cell), rows=Math.ceil(LAYOUT.height/cell);
    const useShapes=actors.some(actor=>!!actor.shape);
    const occupied=new Uint32Array(cols*rows), shapeCache=(cache.shapes ||= new Map()), reservations=new Map(), actorById=new Map(actors.map(a=>[a.id,a]));
    const ownersLo=new Uint32Array(cols*rows), ownersHi=new Uint32Array(cols*rows);
    const actorIndex=new Map(actors.map((a,i)=>[a.id,i]));
    function ownerBit(id) {const i=actorIndex.get(id);return {low:i<32,bit:1<<(i<32?i:i-32)};}
    function cells(actor, layout) {
      const key=actor.id+':'+layout.w.toFixed(3)+':'+layout.h.toFixed(3);
      if(shapeCache.has(key))return shapeCache.get(key);
      const iw=Math.min(layout.w,layout.h*actor.aspect), ih=iw/actor.aspect;
      const ox=(layout.w-iw)/2, oy=layout.h-ih, points=new Set();
      const shape=actor.shape;
      if(shape) {
        for(const [sx,y] of shape.points) {
          const x=shape.mirror?shape.size-1-sx:sx;
          const x0=Math.floor((ox+x*iw/shape.size)/cell),x1=Math.ceil((ox+(x+1)*iw/shape.size)/cell);
          const y0=Math.floor((oy+y*ih/shape.size)/cell),y1=Math.ceil((oy+(y+1)*ih/shape.size)/cell);
          for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++) {
            points.add(gx+gy*cols);
            // Facing is already reflected in the source silhouette coordinates.

          }
        }
      } else {
        const box=tight({x:0,y:0,w:layout.w,h:layout.h},actor.aspect,actor.alpha);
        for(let y=Math.floor(box[1]/cell);y<=Math.ceil((box[1]+box[3])/cell);y++)
          for(let x=Math.floor(box[0]/cell);x<=Math.ceil((box[0]+box[2])/cell);x++)points.add(x+y*cols);
      }
      const result=[...points];shapeCache.set(key,result);return result;
    }
    function clear(actor,layout) {
      if(!useShapes)return placed.every(other=>clearance(tight(layout,actor.aspect,actor.alpha),other.box)>=gap);
      const offset=Math.floor(layout.x/cell)+Math.floor(layout.y/cell)*cols;
      return cells(actor,layout).every(p=>!occupied[p+offset]);
    }
    function region(actor,layout) {
      const offset=Math.floor(layout.x/cell)+Math.floor(layout.y/cell)*cols;
      const radius=Math.ceil(gap/cell), set=new Set();
      for(const p of cells(actor,layout)) {
        const index=p+offset,x=index%cols,y=Math.floor(index/cols);
        for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
          if(dx*dx+dy*dy>radius*radius||x+dx<0||x+dx>=cols||y+dy<0||y+dy>=rows)continue;
          set.add(index+dx+dy*cols);
        }
      }
      return set;
    }
    function reserve(actor,layout,saved) {
      if(!useShapes){reservations.set(actor.id,new Set());return;}
      const set=saved||region(actor,layout);reservations.set(actor.id,set);
      const owner=ownerBit(actor.id),field=owner.low?ownersLo:ownersHi;
      for(const index of set){occupied[index]++;field[index]|=owner.bit;}
    }
    function release(id) {
      const owner=ownerBit(id),field=owner.low?ownersLo:ownersHi;
      for(const index of reservations.get(id)){occupied[index]--;field[index]&=~owner.bit;}
      reservations.delete(id);
    }
    const candidateCache=(cache.candidates ||= new Map());
    function candidatesFor(actor, resolution=step) {
      const cacheKey=actor.id+":"+resolution;
      if(candidateCache.has(cacheKey))return candidateCache.get(cacheKey);
      const registered=actor.prefer.flatMap(layout=>layout.ground?[layout]:[[0,0],[-gap,0],[gap,0],[0,-gap],[0,gap]].map(([dx,dy])=>({...layout,x:layout.x+dx,y:layout.y+dy})));
      const candidates=actor.torso?fixtureCandidates(actor,fixtures,resolution):[...registered,...surfaceCandidates(actor,resolution),...groundCandidates(actor,resolution)];
      const result=candidates.map(layout=>({layout,box:tight(layout,actor.aspect,actor.alpha)})).filter(({layout,box})=>
        box[0]>=4&&box[1]>=0&&box[0]+box[2]<=1660&&box[1]+box[3]<=LAYOUT.height-4&&
        (!layout.ground||inside([box[0]+box[2]/2,box[1]+box[3]]))&&
        !hard.some(other=>clearance(box,other)+(actor.shape?1e-6:0)<gap)&&
        (actor.foreground&&(layout.ground||layout.surface||layout.fixture)||blocked(box)===0));
      candidateCache.set(cacheKey,result);return result;
    }

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
      const candidates = actor.torso ? fixtureCandidates(actor, fixtures, step) : [...registered, ...surfaceCandidates(actor, step), ...groundCandidates(actor, step)];
      let scanned = 0;
      for (const layout of candidates) {
        if (++scanned % 64 === 0) yield;
        const box = tight(layout, actor.aspect, actor.alpha);
        if (box[0] < 4 || box[1] < 0 || box[0] + box[2] > 1660 || box[1] + box[3] > LAYOUT.height - 4) continue;
        if (layout.ground && !inside([box[0] + box[2] / 2, box[1] + box[3]])) continue;
        let room = Infinity;
        for (const other of taken) {
          room = Math.min(room, clearance(box, other));

        }
        // Protect the entire artwork: stricter than the owner's 10% coverage budget,
        // without guessing which pixel contains a face, costume detail or signature prop.
        if (hard.some(other=>clearance(box,other)+(actor.shape?1e-6:0)<gap) || !clear(actor,layout) || (!(actor.foreground&&(layout.ground||layout.surface||layout.fixture)) && blocked([box[0]-LAYOUT.maskCell,box[1]-LAYOUT.maskCell,box[2]+2*LAYOUT.maskCell,box[3]+2*LAYOUT.maskCell]) > 0))
          continue;
        // Prefer the authored spot, but reward elbow room so nobody bunches up.
        const foot = [layout.x + layout.w / 2, layout.y + layout.h];
        const score =
          Math.hypot(foot[0] - preferFoot[0], foot[1] - preferFoot[1]) * preferenceWeight -
          Math.min(room, roomCap) +
          (layout.scaled ? 40 : 0);
        if (score < bestScore) { best = { layout, box }; bestScore = score; }
      }
      if (best) {
        reserve(actor,best.layout);
        taken.push(best.box);
        placed.push({ id: actor.id, ...best });

        if (actor.torso) torsoCount++;
      } else conflicts.push(actor.id);
      yield; // one actor per slice keeps the page responsive
    }
    // Repair greedy choices before declaring a selected character unplaceable.
    // Move up to three earlier residents into other clear spaces; never shrink either.
    for(let pass=0;pass<repairPasses&&conflicts.length;pass++) {
      let repaired=0;
      for(const id of [...conflicts]) {
        const actor=actorById.get(id), options=[];
        for(const candidate of candidatesFor(actor,pass>0?6:step)) {
          const offset=Math.floor(candidate.layout.x/cell)+Math.floor(candidate.layout.y/cell)*cols;
          let low=0,high=0;
          for(const point of cells(actor,candidate.layout)){low|=ownersLo[point+offset];high|=ownersHi[point+offset];}
          const blockers=[];
          for(const other of placed) {
            const owner=ownerBit(other.id);
            if((owner.low?low:high)&owner.bit)blockers.push(other);
            if(blockers.length>3)break;
          }
          if(blockers.length<=3)options.push({...candidate,blockers});
        }
        const flexibility=option=>option.blockers.reduce((score,p)=>score+1/Math.max(1,candidatesFor(actorById.get(p.id)).length),0);
        options.sort((a,b)=>a.blockers.length-b.blockers.length||flexibility(a)-flexibility(b));
        for(const option of options.slice(0,96)) {
          const previous=[...option.blockers].sort((a,b)=>candidatesFor(actorById.get(a.id)).length-candidatesFor(actorById.get(b.id)).length);
          const saved=new Map(previous.map(p=>[p.id,reservations.get(p.id)]));
          for(const other of previous)release(other.id);
          reserve(actor,option.layout);
          const replacements=[];
          for(const other of previous) {
            const person=actorById.get(other.id);
            const replacement=candidatesFor(person).find(c=>clear(person,c.layout));
            if(!replacement)break;
            reserve(person,replacement.layout);replacements.push({id:other.id,...replacement});
          }
          if(replacements.length===previous.length) {
            for(const replacement of replacements)placed[placed.findIndex(p=>p.id===replacement.id)]=replacement;
            placed.push({id,...option,blockers:undefined});
            conflicts.splice(conflicts.indexOf(id),1);repaired++;break;
          }
          for(const replacement of replacements)release(replacement.id);
          release(id);
          for(const other of previous)reserve(actorById.get(other.id),other.layout,saved.get(other.id));
          yield;
        }
        yield;
      }
      if(!repaired&&pass>=2)break;
    }
    for(const item of placed)onPlace(item);
    return { placed, conflicts, conflictCandidates: Object.fromEntries(conflicts.map(id=>[id,candidatesFor(actorById.get(id)).length])) };
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

  async function solveCrowdInSlices(options,budget=8) {
    const cache={}, profiles=[[.05,200],[.02,80],[.12,140],[0,240],[.07,50],[.20,100]];
    let best=null,attempts=0;
    for(const [preferenceWeight,roomCap] of profiles) {
      attempts++;
      const steps=solving({...options,preferenceWeight,roomCap,cache,repairPasses:3,onPlace:()=>{}});
      let started=performance.now(),step;
      while(!(step=steps.next()).done) {
        if(performance.now()-started<budget)continue;
        await new Promise(r=>setTimeout(r));started=performance.now();
      }
      if(!best||step.value.conflicts.length<best.conflicts.length)best=step.value;
      if(!best.conflicts.length)break;
    }
    for(const item of best.placed)options.onPlace?.(item);
    return {...best,attempts};
  }

  const api = {
    LAYOUT, WALKABLE, PAINTED_PROPS, SURFACES, GAP, solveCrowdInSlices, inside, tight, clearance, solve, arrange, arrangeInSlices,
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
