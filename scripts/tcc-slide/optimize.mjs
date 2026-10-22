import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)),
  master = root + 'artwork/tcc/lab-master.png',
  target = root + 'public/assets/tcc-slide/';
await mkdir(target, { recursive: true });
const layers = [
  { name: 'lab', widths: [768, 1440], crop: [], avif: 28, webp: 45 },
  {
    name: 'lab-mobile',
    widths: [384, 768],
    crop: [
      '-gravity',
      'south',
      '-extent',
      '2175x825',
      '-gravity',
      'northwest',
      '-crop',
      '1800x600+370+0',
      '+repage',
    ],
    avif: 28,
    webp: 45,
  },
  {
    name: 'people-prototypes',
    widths: [384, 768, 1280, 1660],
    crop: ['-gravity', 'northwest', '-crop', '1660x725+510+0', '+repage'],
    avif: 54,
    webp: 78,
  },
];
const outputs = [];
for (const layer of layers)
  for (const width of layer.widths)
    for (const format of ['avif', 'webp']) {
      const file = `${layer.name}-${width}.${format}`;
      execFileSync('C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe', [
        master,
        '-gravity',
        'west',
        '-background',
        '#101b1d',
        '-extent',
        '2175x725',
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
  root + 'artwork/tcc/source.json',
  JSON.stringify(
    {
      master: 'lab-master.png',
      sha256: createHash('sha256')
        .update(await readFile(master))
        .digest('hex'),
      generation: 'built-in imagegen',
      originalDimensions: [2170, 725],
      deliveryDimensions: [2175, 725],
      rightPaddingPixels: 5,
      mobileCrop: { x: 370, y: -100, width: 1800, height: 600 },
      foregroundCrop: { x: 510, y: 0, width: 1660, height: 725 },
      layers,
      outputs,
      regenerate: 'node scripts/tcc-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(outputs));
