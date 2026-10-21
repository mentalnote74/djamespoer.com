import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const master = root + 'artwork/thingamajob/apparatus-master.png';
const target = root + 'public/assets/thingamajob-slide/';
await mkdir(target, { recursive: true });
const original = await readFile(master);
// The mobile crop is a close inspection of the same machine, not a second scene.
// These coordinates also register the mechanical layer in thingamajob-slide.scss.
for (const [name, widths, crop] of [
  ['apparatus', [768, 1200, 2172], []],
  ['apparatus-mobile', [384, 768], ['-crop', '1470x490+702+100', '+repage']],
]) {
  for (const width of widths) {
    for (const [format, quality] of [
      ['avif', '60'],
      ['webp', '84'],
    ]) {
      execFileSync('magick', [
        master,
        ...crop,
        '-resize',
        `${width}x`,
        '-strip',
        '-quality',
        quality,
        `${target}${name}-${width}.${format}`,
      ]);
    }
  }
}
// One tiny original-material cutout; rotation happens behind the inspection rim.
execFileSync('magick', [
  master,
  '-crop',
  '120x120+1381+247',
  '+repage',
  '-strip',
  '-quality',
  '90',
  target + 'index-wheel.webp',
]);
execFileSync('magick', [
  master,
  '-crop',
  '137x44+1180+319',
  '+repage',
  '-strip',
  '-quality',
  '90',
  target + 'inspection-record.webp',
]);
await writeFile(
  root + 'artwork/thingamajob/source.json',
  JSON.stringify(
    {
      master: 'apparatus-master.png',
      sha256: createHash('sha256').update(original).digest('hex'),
      dimensions: [2172, 724],
      method: 'Built-in imagegen; one original artwork, no alternate variants',
      mobileCrop: { x: 702, y: 100, width: 1470, height: 490 },
      wheelCrop: { x: 1381, y: 247, width: 120, height: 120 },
      inspectionCrop: { x: 1180, y: 319, width: 137, height: 44 },
      regenerate: 'node scripts/thingamajob-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
