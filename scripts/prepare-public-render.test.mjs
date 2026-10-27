import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routePreloads } from './prepare-public-render.mjs';
test('preloads only current route static dependency graph, not other lazy/private features', () => {
  const stats = {
    outputs: {
      'route.js': {
        entryPoint: 'route.ts',
        imports: [
          { path: 'workflow.js', kind: 'import-statement' },
          { path: 'other.js', kind: 'dynamic-import' },
        ],
      },
      'workflow.js': { imports: [{ path: 'core.js', kind: 'import-statement' }] },
      'core.js': { imports: [] },
      'other.js': { imports: [] },
    },
  };
  assert.deepEqual(routePreloads(stats, 'route.ts'), ['route.js', 'workflow.js', 'core.js']);
  assert.throws(() => routePreloads(stats, 'missing.ts'));
  stats.outputs['workflow.js'].imports.push({ path: '../private.js', kind: 'import-statement' });
  assert.throws(() => routePreloads(stats, 'route.ts'));
});
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { preparePublicRender } from './prepare-public-render.mjs';
test('built hints and inline CSS are idempotent and preload only the requested public route', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'public-render-'));
  try {
    await mkdir(join(dir, 'browser'));
    await writeFile(join(dir, 'browser', 'styles-abc.css'), 'body{color:#17212b}');
    await writeFile(
      join(dir, 'browser', 'index.html'),
      '<html><head><link rel="stylesheet" href="styles-abc.css" media="print"><noscript><link rel="stylesheet" href="styles-abc.css"></noscript></head><body></body></html>',
    );
    await writeFile(
      join(dir, 'browser-stats.json'),
      JSON.stringify({
        outputs: {
          'main-abc.js': {
            entryPoint: 'src/main.ts',
            imports: [{ path: 'core-abc.js', kind: 'import-statement' }],
          },
          'route-abc.js': {
            entryPoint: 'src/app/components/thingamajob-product/thingamajob-product.ts',
            imports: [{ path: 'core-abc.js', kind: 'import-statement' }],
          },
          'core-abc.js': { imports: [] },
        },
      }),
    );
    await writeFile(
      join(dir, 'browser', 'index.csr.html'),
      '<html><head><title>Home</title><meta name="robots" content="index, follow"><link rel="canonical" href="https://djamespoer.com/"><script id="portfolio-structured-data" type="application/ld+json">{}</script><link rel="stylesheet" href="styles-abc.css"></head><body><app-root></app-root></body></html>',
    );
    await preparePublicRender(dir);
    const csr = await readFile(join(dir, 'browser', 'index.csr.html'), 'utf8');
    assert.equal(csr.includes('data-public-styles'), true);
    assert.match(csr, /name="robots" content="noindex, nofollow"/);
    assert.equal(csr.includes('data-home-artwork-preload'), false);
    assert.equal(csr.includes('<app-root></app-root>'), true);
    const first = await readFile(join(dir, 'browser', 'index.html'), 'utf8');
    const fallback = await readFile(join(dir, 'browser', '404.html'), 'utf8');
    assert.match(fallback, /<title>Page not found \| D\. James Poer<\/title>/);
    assert.match(fallback, /name="robots" content="noindex, nofollow"/);
    assert.match(fallback, /<app-root><\/app-root><noscript><main>/);
    assert.match(fallback, /<a href="\/">Return to Home<\/a>/);
    assert.doesNotMatch(fallback, /rel="canonical"|portfolio-structured-data/);
    await preparePublicRender(dir);
    assert.equal(await readFile(join(dir, 'browser', '404.html'), 'utf8'), fallback);
    assert.equal(await readFile(join(dir, 'browser', 'index.html'), 'utf8'), first);
    assert.equal((first.match(/data-public-styles/g) || []).length, 1);
    assert.equal(first.includes('rel="stylesheet"'), false);
    const script = first.match(/<script data-route-preloads>([\s\S]*?)<\/script>/)[1];
    for (const pathname of ['/thingamajob', '/thingamajob/', '/about']) {
      const links = [];
      vm.runInNewContext(script, {
        location: { pathname },
        document: { createElement: () => ({}), head: { append: (link) => links.push(link) } },
      });
      assert.equal(links.length, pathname.startsWith('/thingamajob') ? 3 : 0);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
