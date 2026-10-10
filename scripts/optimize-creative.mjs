import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

const master = 'public/assets/perspectives/SCRUM-64-Larry-V2-C.png';
const expected = 'af243514833341e9f9cdc6d63642bf1859e31ab5e6171d5668b6d201a8b73de5';
const hash = () => createHash('sha256').update(readFileSync(master)).digest('hex');
if (hash() !== expected)
  throw new Error('Approved Creative master differs; review before deriving assets.');
for (const width of [600, 1200, 1800, 2172]) {
  const output = `public/assets/perspectives/creative-${width}.webp`;
  execFileSync('magick', [master, '-resize', `${width}x`, '-strip', '-quality', '90', output], {
    stdio: 'pipe',
  });
  console.log(`${output}: ${width} x ${width / 3}, ${statSync(output).size} bytes`);
}
if (hash() !== expected) throw new Error('Creative master changed during optimization.');
