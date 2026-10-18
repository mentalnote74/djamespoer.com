import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
const kinds = ['engineering', 'ux', 'accessibility', 'ai', 'impact', 'creative'];
for (const kind of kinds) {
  const input =
    kind === 'creative'
      ? 'public/assets/perspectives/creative-2172.webp'
      : `public/assets/perspectives/overnight/${kind}-2172.webp`;
  for (const width of [384, 768, 1200])
    for (const format of ['avif', 'webp']) {
      const output = `public/assets/perspectives/mobile/${kind}-${width}.${format}`;
      execFileSync(
        'magick',
        [
          input,
          '-resize',
          `${width}x`,
          '-strip',
          '-alpha',
          'off',
          '-quality',
          format === 'avif' ? '26' : '48',
          ...(format === 'avif' ? ['-define', 'heic:speed=6'] : ['-define', 'webp:method=6']),
          output,
        ],
        { stdio: 'pipe' },
      );
      console.log(`${kind} ${width} ${format}: ${statSync(output).size}`);
    }
}
