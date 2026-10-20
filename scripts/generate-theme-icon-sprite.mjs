import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Preserve the approved standalone artwork. Scope its internal paint IDs so the
// nine illustrations can share one external SVG document without collisions.
const names = [
  'teetotaler', 'tequila-sunrise', 'mojito', 'pina-colada', 'mai-tai',
  'tequila-sunset', 'rum-runner', 'bloody-mary', 'dusk-to-dusk',
];
const symbols = names.map((name) => {
  const original = readFileSync(`public/assets/theme-icons/${name}.svg`, 'utf8').trim();
  if (!original.includes('viewBox="0 0 64 64"')) throw new Error(`Unexpected viewBox: ${name}`);
  let body = original.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
  for (const [, id] of [...body.matchAll(/\bid="([^"]+)"/g)]) {
    body = body.replaceAll(`id="${id}"`, `id="${name}-${id}"`)
      .replaceAll(`url(#${id})`, `url(#${name}-${id})`);
  }
  return `<symbol id="${name}" viewBox="0 0 64 64">${body}</symbol>`;
});
const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`;
const hash = createHash('sha256').update(sprite).digest('hex').slice(0, 12);
const path = `public/assets/theme-icons/menu-${hash}.svg`;
writeFileSync(path, sprite);
console.log(path);
