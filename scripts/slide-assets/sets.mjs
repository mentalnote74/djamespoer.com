// The established source/export space. Responsive targets are exact 3:1;
// every image layer in a family uses these same sizes, including empty pixels.
export const canvas = [2172, 724];
export const widths = { desktop: [768, 1440, 2172], mobile: [384, 768, 1200] };
export const sets = [
  {
    id: 'buildometer',
    root: 'artwork/buildometer/',
    mobileCrop: [300, 80, 1800, 600],
    layers: [{ name: 'dyno', source: 'dyno-master.png', q: 52 }],
  },
  {
    id: 'conservatory',
    mobileWidths: [384, 768, 1200, 1440, 2172],
    root: 'artwork/portfolio-conservatory/sources/',
    layers: [
      { name: 'background', source: 'background-master.png', q: 13 },
      { name: 'foreground', source: 'foreground-master.png', q: 48 },
      { name: 'interior', source: 'approved-master.png', box: [1100, 40, 900, 520], q: 30 },
      { name: 'reflections', source: 'approved-master.png', box: [0, 454, 2172, 270], q: 10 },
    ],
  },
  {
    id: 'sunset',
    mobileWidths: [384, 768, 1200, 1440, 2172],
    root: 'artwork/djp-beaches/sunset/sources/',
    layers: [
      { name: 'background', source: 'background.png', q: 13 },
      { name: 'shore', source: 'master.png', box: [0, 260, 2172, 464], q: 27 },
      { name: 'foreground', source: 'foreground.png', q: 48 },
      { name: 'swash', source: 'swash.png', q: 18 },
      { name: 'caustics', source: 'master.png', box: [150, 400, 700, 260], feather: 12, q: 13 },
    ],
  },
  {
    id: 'moonlight',
    mobileWidths: [384, 768, 1200, 1440, 2172],
    root: 'artwork/djp-beaches/moonlight/sources/',
    layers: [
      { name: 'background', source: 'background.png', q: 16 },
      { name: 'shore', source: 'master.png', box: [0, 285, 2172, 439], q: 28 },
      { name: 'foreground', source: 'foreground.png', q: 48 },
      { name: 'glow', source: 'glow.png', q: 18 },
      { name: 'cloud', source: 'cloud.png', q: 13 },
      { name: 'moon', source: 'master.png', box: [1250, 35, 240, 180], feather: 12, q: 48 },
    ],
  },
  {
    id: 'exl',
    root: 'artwork/exl-lifepro/',
    mobileCrop: [850, 100, 1050, 350],
    mobileWidths: [384, 768, 1050],
    layers: [
      { name: 'infrastructure', source: 'infrastructure-master.png', q: 34 },
      {
        name: 'service-bay',
        source: 'infrastructure-master.png',
        box: [900, 0, 930, 724],
        feather: 4,
        q: 58,
      },
    ],
  },
  {
    id: 'ips',
    root: 'artwork/ips-powerschool/',
    mobileCrop: [420, -140, 1800, 600],
    layers: [
      { name: 'room', source: 'interlock-master.png', q: 28 },
      {
        name: 'interlock',
        source: 'interlock-master.png',
        box: [760, 0, 1320, 724],
        feather: 4,
        q: 60,
      },
    ],
  },
  {
    id: 'thingamajob',
    root: 'artwork/thingamajob/',
    mobileCrop: [702, 100, 1470, 490],
    layers: [
      { name: 'apparatus', source: 'apparatus-master.png', q: 52 },
      { name: 'index-wheel', source: 'apparatus-master.png', box: [1381, 247, 120, 120], q: 43 },
      {
        name: 'inspection-record',
        source: 'apparatus-master.png',
        box: [1180, 319, 137, 44],
        q: 38,
      },
    ],
  },
  {
    id: 'blognostisphere',
    mobileWidths: [384, 768, 1200, 1440, 2172],
    prepare: 'scripts/blognostisphere-slide/prepare.mjs',
    root: 'tmp/blognostisphere-art/',
    layers: [
      { name: 'sky', source: 'sky.png', q: 27 },
      { name: 'foreground', source: 'foreground.png', q: 57 },
      ...[
        'cloud-far',
        'cloud-near',
        'wisp',
        'spectral',
        'amber',
        'cyan',
        'reflection',
        'brass',
      ].map((name) => ({
        name,
        source: name + '.png',
        q: name === 'amber' || name === 'cyan' ? 40 : 25,
      })),
    ],
  },
  {
    id: 'tcc-pig',
    prepare: 'scripts/tcc-pig-slide/prepare.mjs',
    root: 'tmp/tcc-pig/',
    layers: [
      ...['base', 'eye-open', 'eye-wink', 'mouth-rest', 'mouth-kiss'].map((name) => ({
        name,
        source: name + '.png',
        q: name === 'base' ? 48 : 66,
      })),
    ],
  },
];
