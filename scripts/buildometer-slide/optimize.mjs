import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const master = root + 'artwork/buildometer/dyno-master.png';
const target = root + 'public/assets/buildometer-slide/';
await mkdir(target, { recursive: true });
const layers = [
  { name: 'dyno', widths: [768, 1440, 2172], crop: [], avif: 52, webp: 78 },
  {
    name: 'dyno-mobile',
    widths: [384, 768],
    crop: ['-crop', '1800x600+300+80', '+repage'],
    avif: 52,
    webp: 78,
  },
];
const outputs = [];
for (const layer of layers) {
  for (const width of layer.widths) {
    for (const format of ['avif', 'webp']) {
      const file = `${layer.name}-${width}.${format}`;
      execFileSync('C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe', [
        master,
        '-gravity',
        'west',
        '-background',
        '#10191e',
        '-extent',
        '2172x724',
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
  }
}
await writeFile(
  root + 'artwork/buildometer/source.json',
  JSON.stringify(
    {
      master: 'dyno-master.png',
      sha256: createHash('sha256')
        .update(await readFile(master))
        .digest('hex'),
      generation: 'built-in imagegen',
      originalDimensions: [2171, 724],
      deliveryDimensions: [2172, 724],
      rightPaddingPixels: 1,
      mobileCrop: { x: 300, y: 80, width: 1800, height: 600 },
      layers,
      outputs,
      regenerate: 'node scripts/buildometer-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(outputs));
