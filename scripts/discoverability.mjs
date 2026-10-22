import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PAGES, SITE_ORIGIN, publicPageForPath } from '../src/app/content/public-pages.ts';

export function sitemapFor(journal) {
  if (journal?.schemaVersion !== 1 || !Array.isArray(journal.entries))
    throw Error('Journal sitemap input unavailable');
  const paths = new Set(PUBLIC_PAGES.map(({ path }) => path));
  for (const entry of journal.entries) {
    const path = `product-journal/${entry.date}`;
    if (!publicPageForPath(path)) throw Error('Invalid journal date in sitemap input');
    paths.add(path);
  }
  // Omit lastmod: a build/deployment time is not a content-modification date.
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...paths].map((path) => `  <url><loc>${SITE_ORIGIN}/${path}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  );
}

export async function generateDiscoverability() {
  const journal = JSON.parse(await readFile('public/data/product-journal.json', 'utf8'));
  await writeFile('public/sitemap.xml', sitemapFor(journal));
  await writeFile(
    'src/app/generated/journal-routes.ts',
    '// AUTO-GENERATED from public/data/product-journal.json during prebuild.\n' +
      `export const JOURNAL_DATES: readonly string[] = ${JSON.stringify([...new Set(journal.entries.map((entry) => entry.date))])};\n`,
  );
  console.log(
    'Sitemap generated from public routes and existing journal dates; no fabricated lastmod.',
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await generateDiscoverability();
