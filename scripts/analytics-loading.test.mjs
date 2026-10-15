import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
test('analytics queues the page view but waits for rendered-app readiness and idle time', async () => {
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const appended = [];
  const listeners = new Map();
  let idle;
  const context = {
    Date,
    document: { createElement: () => ({}), head: { append: (script) => appended.push(script) } },
    addEventListener: (name, callback, options) => {
      assert.equal(options.once, true);
      listeners.set(name, callback);
    },
    requestIdleCallback: (callback) => {
      idle = callback;
    },
  };
  context.window = context;
  vm.runInNewContext(script, context);
  assert.equal(context.dataLayer.length, 2);
  assert.equal(appended.length, 0);
  assert.equal(listeners.has('load'), false);
  listeners.get('portfolio-ready')();
  assert.equal(appended.length, 0);
  idle();
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-WQBYGF4Z8F');
  assert.equal(appended[0].async, true);
});
