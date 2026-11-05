import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// placement.js is a plain browser script; evaluate it the way the hero page does.
const context = { performance, setTimeout };
runInNewContext(
  readFileSync(new URL('../public/creative-town-hero/placement.js', import.meta.url), 'utf8'),
  context,
);
const { GAP, WALKABLE, PAINTED_PROPS, inside, tight, clearance, solve, arrange, arrangeInSlices } =
  context.TownPlacement;
// Arrays from the script's own realm compare by value once copied into this one.
const plain = (value) => JSON.parse(JSON.stringify(value));

// Deterministic generator so failures reproduce.
function random(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const tableA = [400, 650, 330, 265];
const tableB = [760, 650, 330, 265];
const obstacles = [
  [184, 575, 300, 185], // argument committee
  [1270, 735, 330, 190], // yak queue
  [976, 566, 76, 141], // show bill
];

function cast(next, count) {
  return Array.from({ length: count }, (_, i) => {
    const h = 90 + next() * 120;
    const w = h * (0.35 + next() * 0.6);
    // Everyone asks for the same few authored spots, several of them under a table.
    const spot = [
      { x: 470, y: 740, w, h },
      { x: 820, y: 720, w, h },
      { x: 1100, y: 752 - h + 175, w, h },
    ][i % 3];
    return {
      id: 'guest-' + i,
      aspect: w / h,
      alpha: [0.08, 0.04, 0.92, 1],
      base: { w, h },
      baseFoot: spot.y + h,
      core: i < 2,
      prefer: [spot],
    };
  });
}

function assertPersonalSpace({ placed, conflicts }, actors, zones) {
  assert.equal(placed.length + conflicts.length, actors.length, 'everyone is placed or reported');
  for (const [i, a] of placed.entries()) {
    const box = a.box;
    assert.ok(box[0] >= 0 && box[1] >= 0 && box[0] + box[2] <= 1664 && box[1] + box[3] <= 936, `${a.id} in frame`);
    for (const zone of zones) assert.ok(clearance(box, zone) >= GAP, `${a.id} keeps out of the table zone`);
    for (const prop of [...obstacles, ...PAINTED_PROPS])
      assert.ok(clearance(box, prop) >= GAP, `${a.id} keeps clear of props`);
    for (const b of placed.slice(i + 1)) assert.ok(clearance(box, b.box) >= GAP, `${a.id} and ${b.id} have personal space`);
    if (a.layout.ground) assert.ok(inside([box[0] + box[2] / 2, box[1] + box[3]]), `${a.id} stands on the plaza`);
  }
}

test('nobody overlaps, crowds, or stands in a protected table zone across varied draws', () => {
  const counts = [];
  for (let seed = 1; seed <= 25; seed++) {
    const actors = cast(random(seed), 24);
    const zones = [tableA, tableB];
    const result = solve({ actors, obstacles, zones });
    assertPersonalSpace(result, actors, zones);
    counts.push(result.placed.length);
  }
  assert.ok(Math.min(...counts) >= 4, 'open plaza is used');
});

test('a full plaza reports capacity conflicts instead of squeezing people in', () => {
  const actors = cast(random(7), 80);
  const result = solve({ actors, obstacles, zones: [tableA, tableB] });
  assert.ok(result.conflicts.length > 0);
  assertPersonalSpace(result, actors, [tableA, tableB]);
});

test('tables slide apart to keep their own space and fit core residents', () => {
  const actors = cast(random(3), 20);
  // Overlapping authored tables, as when a Great Dane player reaches into the next game.
  const tables = [tableA, [tableA[0] + 300, ...tableA.slice(1)]];
  const result = arrange({ tables, actors, obstacles, core: ['guest-0', 'guest-1'], shifts: [0, 40, -40] });
  assert.equal(result.shifts.length, 2);
  assert.ok(clearance(result.zones[0], result.zones[1]) >= GAP, 'tables keep personal space');
  assert.deepEqual(plain(result.zones[0]), [tableA[0] + result.shifts[0], ...tableA.slice(1)]);
  assertPersonalSpace(result, actors, result.zones);
});

test('sliced layout matches the one-shot layout', async () => {
  const options = { tables: [tableA, tableB], actors: cast(random(11), 18), obstacles, shifts: [0, 40] };
  assert.deepEqual(plain(await arrangeInSlices(options, 1)), plain(arrange(options)));
});

test('visible bounds follow object-fit contain and either facing', () => {
  assert.deepEqual(plain(tight({ x: 0, y: 0, w: 100, h: 100 }, 0.5, [0, 0, 1, 1])), [25, 0, 50, 100]);
  // Mirrored art may face either way, so the box covers both.
  assert.deepEqual(plain(tight({ x: 0, y: 0, w: 100, h: 100 }, 1, [0.1, 0, 0.6, 1])), [10, 0, 80, 100]);
  assert.equal(clearance([0, 0, 10, 10], [13, 14, 5, 5]), 5);
  assert.ok(inside([832, 900]) && !inside([832, 400]));
  assert.ok(WALKABLE.length > 3);
});

test('torso-only art requires a covering fixture and is capped at two per scene', () => {
  const actors=cast(random(8),6).map(a=>({...a,torso:true,base:{w:60,h:80},aspect:.75}));
  const fixtures=[{id:'counter',rect:[200,500,1000,100],lip:500}];
  const result=solve({actors,obstacles:[],zones:[],fixtures});
  assert.equal(result.placed.length,2);
  for(const {box,layout} of result.placed){
    assert.equal(layout.fixture,'counter');
    assert.ok(box[0]>=200&&box[0]+box[2]<=1200,'cutout cannot protrude beside its fixture');
    assert.ok(box[1]+box[3]<=500,'no drawn lower edge below the fixture lip');
  }
  assert.equal(solve({actors,obstacles:[],zones:[]}).placed.length,0,'no fixture means no exposed torso');
});

test('protects the whole asset even when occlusion is outside its upper body', () => {
  const actors=cast(random(1),1);
  const result=solve({actors,obstacles:[],zones:[],blocked:()=>.01});
  assert.equal(result.placed.length,0,'never trade a signature prop or costume edge for density');
});

test('progressive publication exposes only collision-free committed placements', () => {
  const published=[];
  const result=solve({actors:cast(random(23),25),obstacles,zones:[tableA,tableB],onPlace:item=>{
    for(const previous of published)assert.ok(clearance(item.box,previous.box)>=GAP);
    for(const table of [tableA,tableB])assert.ok(clearance(item.box,table)>=GAP);
    published.push(item);
  }});
  assert.deepEqual(published.map(p=>p.id),plain(result.placed.map(p=>p.id)));
});
