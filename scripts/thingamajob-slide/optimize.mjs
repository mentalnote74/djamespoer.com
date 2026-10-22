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
// The sharp focal plate gets more fidelity than the small moving cutouts.
// 1440 covers the 1280px desktop scene without forcing its 2172px HiDPI image.
for (const [name, widths, crop, avifQuality, webpQuality] of [
  ['apparatus', [768, 1440, 2172], [], 52, 80],
  ['apparatus-mobile', [384, 768], ['-crop', '1470x490+702+100', '+repage'], 48, 76],
]) {
  for (const width of widths) {
    for (const [format, quality] of [
      ['avif', String(avifQuality)],
      ['webp', String(webpQuality)],
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
// Occluded/moving scraps need less internal fidelity. SVG/CSS clipping remains
// exact and lossless; never degrade the aperture boundaries to save these bytes.
execFileSync('magick', [
  master,
  '-crop',
  '120x120+1381+247',
  '+repage',
  '-strip',
  '-quality',
  '65',
  target + 'index-wheel.webp',
]);
execFileSync('magick', [
  master,
  '-crop',
  '137x44+1180+319',
  '+repage',
  '-strip',
  '-quality',
  '60',
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
      encoding: {
        desktop: { widths: [768, 1440, 2172], avifQuality: 52, webpQuality: 80 },
        mobile: { widths: [384, 768], avifQuality: 48, webpQuality: 76 },
        wheelWebpQuality: 65,
        inspectionWebpQuality: 60,
      },
      regenerate: 'node scripts/thingamajob-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
