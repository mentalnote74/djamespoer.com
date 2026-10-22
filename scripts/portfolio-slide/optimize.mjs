import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)),
  master = root + 'artwork/djamespoer-slide/homepage-master.png',
  target = root + 'public/assets/portfolio-slide/';
await mkdir(target, { recursive: true });
const layers = [
    { name: 'product', widths: [384, 768, 1280], crop: '1440x548+0+0', avif: 56, webp: 78 },
    { name: 'product-mobile', widths: [384, 768], crop: '1280x480+80+25', avif: 52, webp: 74 },
    { name: 'echo', widths: [320, 640], crop: '1440x548+0+0', avif: 20, webp: 36 },
  ],
  outputs = [];
for (const layer of layers)
  for (const width of layer.widths)
    for (const format of ['avif', 'webp']) {
      const file = `${layer.name}-${width}.${format}`;
      execFileSync('C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe', [
        master,
        '-crop',
        layer.crop,
        '+repage',
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
  root + 'artwork/djamespoer-slide/source.json',
  JSON.stringify(
    {
      master: 'homepage-master.png',
      sha256: createHash('sha256')
        .update(await readFile(master))
        .digest('hex'),
      originalDimensions: [1440, 760],
      source: 'Actual public homepage, see capture.json',
      layers,
      outputs,
      regenerate: 'node scripts/portfolio-slide/optimize.mjs',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(outputs));
