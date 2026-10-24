// Experimental local atlas: unchanged registered source pixels; no new artwork.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const magick = process.env.IMAGEMAGICK ?? 'C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe';
const run = (...args) => execFileSync(magick, args, { stdio: 'pipe' });
execFileSync(process.execPath, ['scripts/tcc-pig-slide/prepare.mjs'], { stdio: 'inherit' });
const pieces = [
  { name: 'base', x: 0, y: 0, w: 2172, h: 724, sx: 0, sy: 0 },
  { name: 'eye-open', x: 1410, y: 185, w: 185, h: 165, sx: 4, sy: 728 },
  { name: 'eye-wink', x: 1410, y: 185, w: 185, h: 165, sx: 197, sy: 728 },
  { name: 'mouth-rest', x: 1500, y: 415, w: 400, h: 200, sx: 390, sy: 728 },
  { name: 'mouth-kiss', x: 1500, y: 415, w: 400, h: 200, sx: 798, sy: 728 },
];
const source = 'tmp/tcc-pig/atlas.png';
run(
  '-size',
  '2172x928',
  'xc:none',
  ...pieces.flatMap((p) => [
    'tmp/tcc-pig/' + (p.name === 'base' ? 'base.png' : p.name + '-crop.png'),
    '-geometry',
    `+${p.sx}+${p.sy}`,
    '-compose',
    'Over',
    '-composite',
  ]),
  source,
);
await mkdir('public/assets/pig-sprite', { recursive: true });
const receipts = [];
for (const width of [384, 768, 1200, 1440, 2172])
  for (const format of ['avif', 'webp']) {
    const file = `public/assets/pig-sprite/atlas-${width}.${format}`,
      height = Math.round((928 * width) / 2172);
    run(
      source,
      '-resize',
      `${width}x${height}!`,
      '-strip',
      '-quality',
      format === 'avif' ? '66' : '84',
      ...(format === 'avif' ? ['-define', 'heic:speed=6'] : ['-define', 'webp:alpha-quality=100']),
      file,
    );
    receipts.push({
      file,
      width,
      height,
      bytes: (await stat(file)).size,
      sha256: createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
    });
  }
const sources = await Promise.all(
  ['rest', 'wink', 'kiss'].map(async (pose) => ({
    file: `artwork/tcc-pig-slide/${pose}-master.png`,
    sha256: createHash('sha256')
      .update(await readFile(`artwork/tcc-pig-slide/${pose}-master.png`))
      .digest('hex'),
  })),
);
await writeFile(
  'artwork/tcc-pig-slide/sprite-manifest.json',
  JSON.stringify(
    { experimental: true, canvas: [2172, 724], atlas: [2172, 928], pieces, sources, receipts },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(receipts, null, 2));
