import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolioReviewServer } from './portfolio-review-server.mjs';

test('public case-study responses are indexable; other review routes remain noindex', async () => {
  const server = createPortfolioReviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const route of ['/thingamajob', '/thingamajob/']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('X-Robots-Tag'), null);
      assert.match(await response.text(), /name="robots" content="index, follow"/);
    }
    for (const route of ['/', '/about'])
      assert.equal((await fetch(base + route)).headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.match(await (await fetch(base + '/robots.txt')).text(), /Allow: \//);
    const compressed = await fetch(base + '/thingamajob', {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    assert.equal(compressed.headers.get('Content-Encoding'), 'gzip');
    assert.equal(compressed.headers.get('Vary'), 'Accept-Encoding');
    assert.match(await compressed.text(), /name="robots" content="index, follow"/);
    const brotli = await fetch(base + '/thingamajob', { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(brotli.headers.get('Content-Encoding'), 'br');
    assert.match(await brotli.text(), /name="robots" content="index, follow"/);
    assert.equal((await fetch(base + '/api/thingamajob/test/workflow')).status, 404);
    assert.equal((await fetch(base + '/src/index.html')).status, 404);
    assert.equal((await fetch(base, { method: 'POST' })).status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
