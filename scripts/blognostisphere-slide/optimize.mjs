import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = process.cwd(),
  archive = root + '/artwork/blognostisphere-slide/',
  temp = root + '/tmp/blognostisphere-art/',
  target = root + '/public/assets/blognostisphere/';
await mkdir(temp, { recursive: true });
await mkdir(target, { recursive: true });
const magick = 'C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe';
const run = (...args) => execFileSync(magick, args, { stdio: 'pipe' });
const master = archive + 'magic-v2.png';
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="2172" height="724" viewBox="0 0 2172 724"><rect width="2172" height="724" fill="black"/>${body}</svg>`;
const mask = async (name, body, blur = 0) => {
  await writeFile(temp + name + '.svg', svg(body));
  run(temp + name + '.svg', ...(blur ? ['-blur', `0x${blur}`] : []), temp + name + '.png');
  return temp + name + '.png';
};
// Masks are registered in the approved master's own coordinates, never a rectangular cutout.
const hardware = await mask(
  'hardware',
  `<path fill="white" d="M1072 0H1258L1330 191 1364 90 1412 72 1416 40 1460 19 1494 38 1506 93 1545 113 1584 169 1637 181 1668 173 1688 203 1721 231 1770 254 1790 68 1800 50 1821 62 1900 218 1911 280 1975 315 2025 176 2044 155 2067 186 2108 309 2172 240V724H769L826 619 873 605 908 550 963 535 987 484 1010 445 1048 384 1020 365 951 350 942 329 968 317 918 269 917 254 946 254 895 164 900 145 966 174 952 65 965 42 1098 174Z"/><path fill="black" d="M1096 413Q1102 389 1117 389L1106 466 1068 490 1043 477Z M1434 506Q1481 435 1515 501L1531 548 1433 551Z M1367 671Q1393 603 1421 652L1427 724H1355Z M1555 590Q1597 536 1632 575L1648 619 1558 634Z M1782 340L1789 155 1850 288 1871 362Z M1907 337L1916 294 2008 339 2018 389Z M2045 300L2050 218 2088 325 2105 381 2063 369Z"/>`,
  0.65,
);
// Reconstruct the original open sky; only occluded machinery pixels are inpainted.
run(archive + 'sky-inpaint.png', '-resize', '2172x724!', temp + 'inpaint.png');
run(
  master,
  hardware,
  '-alpha',
  'off',
  '-compose',
  'CopyOpacity',
  '-composite',
  temp + 'foreground.png',
);
run(hardware, '-negate', temp + 'inverse.png');
run(
  master,
  temp + 'inverse.png',
  '-alpha',
  'off',
  '-compose',
  'CopyOpacity',
  '-composite',
  temp + 'open-sky.png',
);
run(
  temp + 'inpaint.png',
  temp + 'open-sky.png',
  '-compose',
  'Over',
  '-composite',
  temp + 'sky.png',
);
// Independent photographic plates retain the actual scene's material/color, with feathered alpha.
const plates = [
  {
    name: 'cloud-far',
    box: [0, 365, 1010, 235],
    shape: '<ellipse cx="420" cy="485" rx="470" ry="89" fill="white"/>',
    blur: 24,
    widths: [320, 640],
    q: 24,
  },
  {
    name: 'cloud-near',
    box: [0, 455, 1030, 269],
    shape: '<path d="M0 535Q290 464 500 576T1010 622V724H0Z" fill="white"/>',
    blur: 26,
    widths: [320, 640],
    q: 27,
  },
  {
    name: 'wisp',
    box: [1370, 445, 802, 279],
    shape:
      '<path d="M1350 615Q1460 505 1570 565T1800 514T2180 520L2180 620Q1960 569 1820 630T1580 660T1350 714Z" fill="white"/>',
    blur: 18,
    widths: [256, 512],
    q: 23,
  },
  {
    name: 'spectral',
    box: [520, 0, 790, 415],
    shape: '<path fill="white" d="M520 0H1260L1310 344 1170 415 850 299 632 126Z"/>',
    blur: 13,
    widths: [240, 480],
    q: 20,
    light: true,
  },
  {
    name: 'amber',
    box: [1320, 228, 213, 179],
    shape: '<ellipse cx="1426" cy="315" rx="92" ry="79" fill="white"/>',
    blur: 8,
    widths: [96, 192],
    q: 38,
    light: true,
  },
  {
    name: 'cyan',
    box: [1607, 268, 62, 131],
    shape: '<ellipse cx="1638" cy="334" rx="22" ry="57" fill="white"/>',
    blur: 4,
    widths: [48, 96],
    q: 42,
    light: true,
  },
  {
    name: 'reflection',
    box: [1670, 540, 502, 184],
    shape: '<path fill="white" d="M1670 699L2040 540 2172 545V724H1670Z"/>',
    blur: 12,
    widths: [192, 384],
    q: 18,
    light: true,
  },
  {
    name: 'brass',
    box: [1165, 176, 650, 323],
    shape:
      '<path fill="none" stroke="white" stroke-width="9" d="M1206 327Q1240 196 1349 221M1350 224Q1451 189 1502 267M1343 414L1516 418M1584 240L1610 421M1735 445L1782 471"/>',
    blur: 3,
    widths: [192, 384],
    q: 24,
    light: true,
  },
];
for (const p of plates) {
  const m = await mask(p.name, p.shape, p.blur);
  if (p.light) {
    run(
      master,
      '-colorspace',
      'gray',
      '-level',
      '32%,92%',
      m,
      '-compose',
      'Multiply',
      '-composite',
      temp + p.name + '-alpha.png',
    );
  }
  run(
    master,
    p.light ? temp + p.name + '-alpha.png' : m,
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    '-crop',
    `${p.box[2]}x${p.box[3]}+${p.box[0]}+${p.box[1]}`,
    '+repage',
    temp + p.name + '.png',
  );
}
const layers = [
  { name: 'sky', widths: [480, 960], q: 27 },
  { name: 'foreground', widths: [768, 1440], q: 57 },
  ...plates,
];
const outputs = [];
for (const l of layers)
  for (const width of l.widths)
    for (const ext of ['avif', 'webp']) {
      const file = `${l.name}-${width}.${ext}`;
      run(
        temp + l.name + '.png',
        '-resize',
        `${width}x`,
        '-strip',
        '-quality',
        String(ext === 'avif' ? l.q : Math.min(82, l.q + 22)),
        ...(ext === 'avif' ? ['-define', 'heic:speed=6'] : ['-define', 'webp:method=6']),
        target + file,
      );
      outputs.push({ file, bytes: (await stat(target + file)).size });
    }
const hashes = {};
for (const file of ['magic-v2.png', 'sky-inpaint.png'])
  hashes[file] = createHash('sha256')
    .update(await readFile(archive + file))
    .digest('hex');
await writeFile(
  archive + 'source.json',
  JSON.stringify(
    {
      approvedMaster: 'magic-v2.png',
      dimensions: [2172, 724],
      hashes,
      background:
        'Built-in imagegen removes occluded machinery only; original open sky composited back over the fill.',
      foreground: 'Original approved pixels, registered silhouette and open framework/arch masks.',
      mobileCrop: { worldWidth: '150%', left: '-45%', ratio: 2 },
      plates,
      outputs,
      regenerate: 'node scripts/blognostisphere-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(outputs, null, 2));
