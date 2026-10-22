import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const master = root + 'artwork/exl-lifepro/infrastructure-master.png';
const target = root + 'public/assets/exl-lifepro-slide/';
await mkdir(target, { recursive: true });
const hash = createHash('sha256')
  .update(await readFile(master))
  .digest('hex');
// The generated original is 2171×724. A single dark right-edge padding pixel
// normalizes delivery to the carousel's existing 2172×724 registration grid.
const normalize = ['-gravity', 'west', '-background', '#101b20', '-extent', '2172x724'];
const layers = [
  { name: 'infrastructure', widths: [768, 1440], crop: [], avif: 34, webp: 58 },
  {
    name: 'infrastructure-mobile',
    widths: [384, 768],
    crop: ['-crop', '1050x350+850+100', '+repage'],
    avif: 34,
    webp: 58,
  },
  {
    name: 'service-bay',
    widths: [384, 640, 930],
    crop: ['-crop', '930x724+900+0', '+repage'],
    avif: 58,
    webp: 82,
  },
];
const outputs = [];
for (const layer of layers) {
  for (const width of layer.widths) {
    for (const format of ['avif', 'webp']) {
      const file = `${layer.name}-${width}.${format}`;
      execFileSync('magick', [
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
  }
}
await writeFile(
  root + 'artwork/exl-lifepro/source.json',
  JSON.stringify(
    {
      master: 'infrastructure-master.png',
      sha256: hash,
      originalDimensions: [2171, 724],
      deliveryDimensions: [2172, 724],
      rightPaddingPixels: 1,
      mobileCrop: { x: 850, y: 100, width: 1050, height: 350 },
      serviceBayCrop: { x: 900, y: 0, width: 930, height: 724 },
      layers,
      outputs,
      regenerate: 'node scripts/exl-lifepro-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(outputs, null, 2));
