import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canvas, widths, sets } from './sets.mjs';
const magick =
  process.env.IMAGEMAGICK ??
  (process.platform === 'win32'
    ? 'C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe'
    : 'magick');
const run = (...args) => execFileSync(magick, args, { stdio: 'pipe' });
const temp = 'tmp/slide-assets/';
await mkdir(temp, { recursive: true });
const receipts = [];
for (const set of sets.filter((s) => !process.argv[2] || s.id === process.argv[2])) {
  if (set.supplied) continue; // Preserve the approved package's existing encodes.
  if (set.prepare) execFileSync(process.execPath, [set.prepare], { stdio: 'inherit' });
  for (const layer of set.layers) {
    const source = set.root + layer.source;
    const full = temp + set.id + '-' + layer.name + '.png';
    // Canonical dimensions predate optimization. Odd 1px generation edges are
    // padded/cropped at the far edge, never rescaled, trimmed or auto-centered.
    run(source, '-gravity', 'northwest', '-background', 'none', '-extent', canvas.join('x'), full);
    if (layer.box) {
      const [x, y, w, h] = layer.box;
      const crop = temp + 'crop.png';
      run(full, '-crop', `${w}x${h}+${x}+${y}`, '+repage', crop);
      if (layer.feather) {
        const n = layer.feather;
        run(
          '-size',
          `${w}x${h}`,
          'xc:black',
          '-fill',
          'white',
          '-draw',
          `rectangle ${n},${n} ${w - n - 1},${h - n - 1}`,
          '-blur',
          `0x${n / 2}`,
          temp + 'mask.png',
        );
        run(
          crop,
          temp + 'mask.png',
          '-alpha',
          'off',
          '-compose',
          'CopyOpacity',
          '-composite',
          crop,
        );
      }
      // Crops are preparation only: put the source pixels back at their native
      // coordinates on the full transparent stage BEFORE any responsive export.
      run(
        '-size',
        canvas.join('x'),
        'xc:none',
        crop,
        '-geometry',
        `+${x}+${y}`,
        '-compose',
        'Over',
        '-composite',
        full,
      );
    }
    const sourceHash = createHash('sha256')
      .update(await readFile(source))
      .digest('hex');
    for (const family of ['desktop', 'mobile']) {
      const input = temp + 'family.png';
      if (family === 'mobile' && set.mobileCrop) {
        const [x, y, w, h] = set.mobileCrop;
        // -140 is the existing IPS top-padding contract, shared by both layers.
        const paddedHeight = Math.max(724 + Math.max(0, -y), Math.max(0, y) + h);
        run(
          full,
          '-background',
          layer.name === 'room' ? '#10191b' : 'none',
          '-gravity',
          'south',
          '-extent',
          `2172x${paddedHeight}`,
          '-gravity',
          'northwest',
          '-extent',
          `${Math.max(2172, x + w)}x${paddedHeight}`,
          '-crop',
          `${w}x${h}+${x}+${Math.max(0, y)}`,
          '+repage',
          input,
        );
      } else run(full, input);
      const [nativeWidth, nativeHeight] = run('identify', '-format', '%w %h', input)
        .toString()
        .split(' ')
        .map(Number);
      if (nativeWidth !== nativeHeight * 3)
        throw new Error(
          `${set.id}/${layer.name}/${family}: source preparation lost its 3:1 canvas`,
        );
      const target = `public/assets/registered-slides/${set.id}/${family}/`;
      await mkdir(target, { recursive: true });
      for (const width of family === 'mobile'
        ? (set.mobileWidths ?? widths.mobile)
        : widths.desktop) {
        if (width > nativeWidth)
          throw new Error(
            `${set.id}/${family}: ${width}px exceeds its ${nativeWidth}px native source`,
          );
        const height = width / 3;
        for (const format of ['avif', 'webp']) {
          const file = target + layer.name + '-' + width + '.' + format;
          // Explicit target canvas; never -trim or independent layer sizing.
          run(
            input,
            '-resize',
            `${width}x${height}`,
            '-strip',
            '-quality',
            String(format === 'avif' ? layer.q : Math.min(84, layer.q + 22)),
            ...(format === 'avif'
              ? ['-define', 'heic:speed=6']
              : ['-define', 'webp:alpha-quality=100']),
            file,
          );
          receipts.push({
            set: set.id,
            layer: layer.name,
            family,
            file,
            width,
            height,
            bytes: (await stat(file)).size,
            source,
            sourceHash,
          });
        }
      }
    }
  }
  console.log('Registered ' + set.id);
}
await writeFile(
  `tmp/slide-assets/receipts${process.argv[2] ? '-' + process.argv[2] : ''}.json`,
  JSON.stringify(receipts, null, 2) + '\n',
);
