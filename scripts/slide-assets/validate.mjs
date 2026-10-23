import { readFile, readdir } from 'node:fs/promises';
import { canvas, widths, sets } from './sets.mjs';

// Header-only geometry validation; no decoder or ImageMagick needed in CI.
export function dimensions(data) {
  if (data.toString('ascii', 0, 4) === 'RIFF') {
    for (let pos = 12; pos + 8 <= data.length;) {
      const kind = data.toString('ascii', pos, pos + 4),
        length = data.readUInt32LE(pos + 4),
        p = pos + 8;
      if (kind === 'VP8X') return [data.readUIntLE(p + 4, 3) + 1, data.readUIntLE(p + 7, 3) + 1];
      if (kind === 'VP8 ')
        return [data.readUInt16LE(p + 6) & 16383, data.readUInt16LE(p + 8) & 16383];
      if (kind === 'VP8L')
        return [
          (data.readUInt32LE(p + 1) & 16383) + 1,
          ((data.readUInt32LE(p + 1) >>> 14) & 16383) + 1,
        ];
      pos = p + length + (length % 2);
    }
  }
  const ispe = data.indexOf(Buffer.from('ispe'));
  if (ispe > 0 && ispe + 16 <= data.length)
    return [data.readUInt32BE(ispe + 8), data.readUInt32BE(ispe + 12)];
  throw new Error('Unrecognized image header');
}
export function assertCanvas(actual, expected, label = 'asset') {
  if (actual[0] !== expected[0] || actual[1] !== expected[1] || actual[0] !== actual[1] * 3)
    throw new Error(
      label + ': ' + actual.join('x') + '; expected ' + expected.join('x') + ' full 3:1 canvas',
    );
}
export async function validate() {
  const failures = [];
  let checked = 0;
  const registry = await readFile('src/app/content/portfolio-slides.ts', 'utf8');
  const visuals = [...registry.matchAll(/visual: '([^']+)'/g)].map((m) => m[1]);
  const covered = new Set([...sets.map((s) => s.id), 'perspective', 'creative']);
  for (const visual of visuals)
    if (!covered.has(visual)) throw new Error('No asset geometry coverage for ' + visual);
  // Historical URLs stay available, but cannot bypass the live canvas contract.
  const retired =
    /\/assets\/(portfolio-conservatory|djp-sunset|djp-moonlight|thingamajob-slide|exl-lifepro-slide|buildometer-slide|ips-slide|blognostisphere|tcc-pig)\//;
  async function checkReferences(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = directory + '/' + item.name;
      if (item.isDirectory()) await checkReferences(path);
      else if (/\.(ts|html|scss)$/.test(item.name) && !item.name.endsWith('.spec.ts')) {
        if (retired.test(await readFile(path, 'utf8')))
          failures.push(path + ': retired cropped slide asset reference');
      }
    }
  }
  await checkReferences('src/app');
  async function check(file, expected) {
    try {
      assertCanvas(dimensions(await readFile(file)), expected, file);
      checked++;
    } catch (error) {
      failures.push(error.message);
    }
  }
  for (const set of sets)
    for (const family of ['desktop', 'mobile']) {
      for (const width of family === 'mobile'
        ? (set.mobileWidths ?? widths.mobile)
        : widths.desktop) {
        for (const layer of set.layers)
          for (const ext of ['avif', 'webp']) {
            await check(
              `public/assets/registered-slides/${set.id}/${family}/${layer.name}-${width}.${ext}`,
              [width, width / 3],
            );
          }
      }
    }
  for (const kind of ['engineering', 'ux', 'accessibility', 'ai', 'impact']) {
    for (const [folder, values] of [
      ['overnight', [768, 1200, 2172]],
      ['mobile', [384, 768, 1200]],
    ]) {
      for (const width of values)
        for (const ext of ['avif', 'webp'])
          await check(`public/assets/perspectives/${folder}/${kind}-${width}.${ext}`, [
            width,
            width / 3,
          ]);
    }
  }
  for (const width of [600, 1200, 1800, 2172])
    await check(`public/assets/perspectives/creative-${width}.webp`, [width, width / 3]);
  for (const width of [384, 768, 1200])
    for (const ext of ['avif', 'webp'])
      await check(`public/assets/perspectives/mobile/creative-${width}.${ext}`, [width, width / 3]);
  if (failures.length) throw new Error('Slide geometry contract failed:\n' + failures.join('\n'));
  console.log(
    `Slide geometry: ${checked} assets, ${visuals.length} slides, canonical ${canvas.join('x')}; all registered targets pass.`,
  );
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/validate.mjs')) await validate();
