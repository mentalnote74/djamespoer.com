// Deterministic packing only; visual poses were authored with the built-in imagegen tool.
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
(async () => {
  const source = process.argv[2];
  if (!source) throw Error('Usage: node scripts/rigby/build-dance-atlas.cjs SOURCE.png');
  const meta = await sharp(source).metadata();
  if (!meta.hasAlpha || !meta.width || !meta.height) throw Error('Transparent source required');
  const tiles = [];
  for (let i = 0; i < 16; i++) {
    const col = i % 4,
      row = Math.floor(i / 4);
    const left = Math.floor((col * meta.width) / 4),
      top = Math.floor((row * meta.height) / 4);
    const width = Math.floor(((col + 1) * meta.width) / 4) - left;
    const height = Math.floor(((row + 1) * meta.height) / 4) - top;
    const input = await sharp(source)
      .extract({ left, top, width, height })
      .resize(56, 56, { kernel: 'nearest', fit: 'fill' })
      .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    tiles.push({ input, left: col * 64, top: row * 64 });
  }
  const output = path.resolve('public/assets/rigby/dance-poses-v1.webp');
  await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(tiles)
    .webp({ lossless: true, effort: 6 })
    .toFile(output);
  const bytes = await fs.readFile(output);
  console.log(
    JSON.stringify({
      output,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    }),
  );
})();
