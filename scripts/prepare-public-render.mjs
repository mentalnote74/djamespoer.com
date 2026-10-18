import { readFile, writeFile, access } from 'node:fs/promises';
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
  // Preserve the CSR shell for direct interior requests on the static host.
  for (const name of ['index.html', 'index.csr.html']) {
    const file = resolve(directory, 'browser', name);
    if (name === 'index.csr.html') {
      try {
        await access(file);
      } catch {
        continue;
      }
    }
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
          new RegExp(
            '<link rel="stylesheet" href="' + link[1].replace('.', '\\.') + '"[^>]*>',
            'g',
          ),
          () => {
            if (!first) return '';
            first = false;
            return '<style data-public-styles>' + css + '</style>';
          },
        )
        .replace('<noscript></noscript>', '');
    }
    const hint = `<script data-route-preloads>if(location.pathname.replace(/\\/$/,'')==='/thingamajob'){for(const href of ${JSON.stringify(assets)}){const link=document.createElement('link');link.rel='modulepreload';link.href='/'+href;document.head.append(link);}}</script>`;
    await writeFile(
      file,
      html
        .replace(/<script data-route-preloads>[\s\S]*?<\/script>/, '')
        .replace(/<script data-home-artwork-preload>[\s\S]*?<\/script>/, '')
        .replace('<head>', '<head>' + hint),
    );
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await preparePublicRender();
