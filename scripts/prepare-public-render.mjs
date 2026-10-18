import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/** Use compiler output, never guessed asset hashes. Keep unrelated routes lazy. */
export function routePreloads(stats, entryPoint) {
  const entries = Object.entries(stats.outputs).filter(
    ([, output]) => output.entryPoint === entryPoint,
  );
  if (entries.length !== 1) throw new Error('Route preload entry unavailable.');
  const paths = new Set();
  const visit = (path) => {
    if (paths.has(path)) return;
    if (!/^[\w-]+\.js$/.test(path) || !stats.outputs[path])
      throw new Error('Invalid preload asset.');
    paths.add(path);
    for (const dependency of stats.outputs[path].imports ?? []) {
      if (
        !dependency.external &&
        dependency.kind !== 'dynamic-import' &&
        dependency.path.endsWith('.js')
      )
        visit(dependency.path);
    }
  };
  visit(entries[0][0]);
  return [...paths];
}
export async function preparePublicRender(
  directory = fileURLToPath(new URL('../dist/djamespoer/', import.meta.url)),
) {
  const stats = JSON.parse(await readFile(resolve(directory, 'browser-stats.json'), 'utf8'));
  const assets = [
    ...new Set([
      ...routePreloads(stats, 'src/main.ts'),
      ...routePreloads(stats, 'src/app/components/thingamajob-product/thingamajob-product.ts'),
    ]),
  ];
  const file = resolve(directory, 'browser/index.html');
  let html = await readFile(file, 'utf8');
  // The complete public stylesheet is only ~2 kB compressed. Inline it to remove
  // a render-blocking round trip; Angular's critical-CSS scanner cannot see lazy views.
  if (!html.includes('data-public-styles')) {
    const link = html.match(/<link rel="stylesheet" href="(styles-[\w-]+\.css)"[^>]*>/);
    if (!link) throw new Error('Public stylesheet unavailable.');
    const css = await readFile(resolve(directory, 'browser', link[1]), 'utf8');
    if (/<\/style/i.test(css)) throw new Error('Unsafe stylesheet content.');
    let first = true;
    html = html
      .replace(
        new RegExp('<link rel="stylesheet" href="' + link[1].replace('.', '\\.') + '"[^>]*>', 'g'),
        () => {
          if (!first) return '';
          first = false;
          return '<style data-public-styles>' + css + '</style>';
        },
      )
      .replace('<noscript></noscript>', '');
  }
  // Only the actual first mobile homepage slide gets an image preload.
  const imageSizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  const engineeringCandidates = [
    ['(max-width: 600px)', 'mobile/engineering', [384, 768, 1200]],
  ].map(([media, name, widths]) => ({
    media,
    srcset: widths
      .map((width) => `/assets/perspectives/${name}-${width}.avif ${width}w`)
      .join(', '),
  }));
  const homeHint = `<script data-home-artwork-preload>if(location.pathname==='/'){for(const item of ${JSON.stringify(engineeringCandidates)}){const link=document.createElement('link');link.rel='preload';link.as='image';link.type='image/avif';link.media=item.media;link.imageSrcset=item.srcset;link.imageSizes=${JSON.stringify(imageSizes)};link.fetchPriority='high';document.head.append(link);}}</script>`;
  const hint = `<script data-route-preloads>if(location.pathname.replace(/\\/$/,'')==='/thingamajob'){for(const href of ${JSON.stringify(assets)}){const link=document.createElement('link');link.rel='modulepreload';link.href='/'+href;document.head.append(link);}}</script>`;
  await writeFile(
    file,
    html
      .replace(/<script data-route-preloads>[\s\S]*?<\/script>/, '')
      .replace(/<script data-home-artwork-preload>[\s\S]*?<\/script>/, '')
      .replace('<head>', '<head>' + homeHint + hint),
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await preparePublicRender();
