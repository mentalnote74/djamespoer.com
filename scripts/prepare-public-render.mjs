import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { NOT_FOUND } from '../src/app/content/not-found.ts';

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
/** Mirror the actual first picture, not a separately maintained asset list.
 * Only AVIF is preloaded: adding WebP too would fetch both in capable browsers.
 * Media queries are mutually exclusive; srcset/sizes retain browser selection.
 */
export function homeLcpPreloads(html) {
  const opener = html.match(/<section\b[^>]*\bdata-slide-id="[^"]+"[^>]*>([\s\S]*?)<\/section>/);
  if (!opener) return '';
  if (/\shidden(?:=|\s|>)/.test(opener[0].slice(0, opener[0].indexOf('>') + 1)))
    throw new Error('Homepage opener is hidden.');
  const picture = opener[1].match(
    /<app-slide-image\b[^>]*\bclass="background"[^>]*>([\s\S]*?)<\/app-slide-image>/,
  )?.[1];
  if (!picture) throw new Error('Homepage LCP background unavailable.');
  const attributes = (tag) =>
    Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const sources = [...picture.matchAll(/<source\b[^>]*>/g)]
    .map(([tag]) => attributes(tag))
    .filter((s) => s.type === 'image/avif');
  if (sources.length !== 2 || sources[0].media !== '(max-width: 600px)' || sources[1].media)
    throw new Error('Unexpected homepage responsive picture contract.');
  return sources
    .map((source) => {
      if (!source.srcset || !source.sizes)
        throw new Error('Homepage responsive candidates unavailable.');
      const media = source.media || 'not all and (max-width: 600px)';
      const href = source.srcset.split(',')[0].trim().split(/\s+/)[0];
      return `<link data-home-lcp rel="preload" as="image" type="image/avif" media="${media}" href="${href}" imagesrcset="${source.srcset}" imagesizes="${source.sizes}" fetchpriority="high">`;
    })
    .join('');
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
  // Apply the established stylesheet/preload treatment to every prerendered page,
  // while keeping the CSR fallback for routes not known at build time.
  const htmlFiles = async (path) => {
    const entries = await readdir(path, { withFileTypes: true });
    const groups = await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? htmlFiles(resolve(path, entry.name))
          : entry.name.endsWith('.html')
            ? [resolve(path, entry.name)]
            : [],
      ),
    );
    return groups.flat();
  };
  for (const file of await htmlFiles(resolve(directory, 'browser'))) {
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
    html = html.replace(/<link\b[^>]*\bdata-home-lcp\b[^>]*>/g, '');
    const imageHint =
      file === resolve(directory, 'browser', 'index.html') ? homeLcpPreloads(html) : '';
    const hint = `<script data-route-preloads>if(location.pathname.replace(/\\/$/,'')==='/thingamajob'){for(const href of ${JSON.stringify(assets)}){const link=document.createElement('link');link.rel='modulepreload';link.href='/'+href;document.head.append(link);}}</script>`;
    // Responsive preloads must follow viewport metadata, or mobile's initial
    // layout viewport can trigger the desktop candidate before the viewport changes.
    if (imageHint) {
      if (!/<meta\b[^>]*name="viewport"[^>]*>/.test(html))
        throw new Error('Homepage viewport unavailable.');
      html = html.replace(/<meta\b[^>]*name="viewport"[^>]*>/, (meta) => meta + imageHint);
    }
    await writeFile(
      file,
      html
        .replace(/<script data-route-preloads>[\s\S]*?<\/script>/, '')
        .replace(/<script data-home-artwork-preload>[\s\S]*?<\/script>/, '')
        .replace('<head>', '<head>' + hint),
    );
  }
  // Native Cloudflare 404 fallback, retaining Angular's CSR shell for unknown URLs
  // and dynamic routes absent from the static build. Never hydrate Home as a 404.
  const clientShell = await readFile(resolve(directory, 'browser', 'index.csr.html'), 'utf8');
  if (!clientShell.includes('<app-root></app-root>'))
    throw new Error('Client-rendered 404 shell unavailable.');
  const fallback = clientShell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${NOT_FOUND.title}</title>`)
    .replace(/<meta\b[^>]*name="(?:description|robots)"[^>]*>/g, '')
    .replace(/<meta\b[^>]*(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g, '')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, '')
    .replace(/<script\b[^>]*id="portfolio-structured-data"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(
      '<head>',
      `<head><meta name="robots" content="noindex, nofollow"><meta name="description" content="${NOT_FOUND.description}">`,
    )
    .replace(
      '<app-root></app-root>',
      `<app-root></app-root><noscript><main><p>404</p><h1>${NOT_FOUND.heading}</h1><p>${NOT_FOUND.description}</p><p><a href="/">Return to Home</a></p></main></noscript>`,
    );
  await writeFile(resolve(directory, 'browser', '404.html'), fallback);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await preparePublicRender();
