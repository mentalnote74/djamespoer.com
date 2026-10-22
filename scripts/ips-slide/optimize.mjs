import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const master = root + 'artwork/ips-powerschool/interlock-master.png';
const target = root + 'public/assets/ips-slide/';
await mkdir(target, { recursive: true });
const normalize = ['-gravity', 'west', '-background', '#10191b', '-extent', '2172x724'];
const layers = [
  { name: 'room', widths: [768, 1440], crop: [], avif: 28, webp: 46 },
  {
    name: 'room-mobile',
    widths: [384, 768],
    crop: [
      '-gravity',
      'south',
      '-extent',
      '2172x864',
      '-gravity',
      'northwest',
      '-crop',
      '1800x600+420+0',
      '+repage',
    ],
    avif: 28,
    webp: 46,
  },
  {
    name: 'interlock',
    widths: [640, 960, 1320],
    crop: ['-crop', '1320x724+760+0', '+repage'],
    avif: 60,
    webp: 82,
  },
];
const outputs = [];
for (const layer of layers)
  for (const width of layer.widths)
    for (const format of ['avif', 'webp']) {
      const file = `${layer.name}-${width}.${format}`;
      execFileSync('C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe', [
        master,
        ...normalize,
        ...layer.crop,
        '-resize',
        `${width}x`,
        '-strip',
        '-quality',
        String(layer[format]),
        target + file,
      ]);
      outputs.push({ file, bytes: (await stat(target + file)).size });
    }
await writeFile(
  root + 'artwork/ips-powerschool/source.json',
  JSON.stringify(
    {
      master: 'interlock-master.png',
      sha256: createHash('sha256')
        .update(await readFile(master))
        .digest('hex'),
      generation: 'built-in imagegen',
      originalDimensions: [2171, 724],
      deliveryDimensions: [2172, 724],
      rightPaddingPixels: 1,
      mobileCrop: { x: 420, y: -140, width: 1800, height: 600, topPaddingPixels: 140 },
      foregroundCrop: { x: 760, y: 0, width: 1320, height: 724 },
      layers,
      outputs,
      regenerate: 'node scripts/ips-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(outputs));
