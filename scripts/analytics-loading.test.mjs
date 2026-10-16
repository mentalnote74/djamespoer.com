import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
  constructor(href, zone = 'content', download = false) {
    Object.assign(this, { href, zone, download });
  }
  closest(selector) {
    return selector === 'a[href]' ? this : selector === this.zone ? this : null;
  }
  hasAttribute(name) {
    return name === 'download' && this.download;
  }
}
function load(url = 'https://djamespoer.com/', storage = new Map()) {
  const appended = [],
    listeners = new Map(),
    clicks = new Map();
  let idle;
  const context = {
    Date,
    URL,
    URLSearchParams,
    Element,
    location: new URL(url),
    localStorage: {
      setItem: (key, value) => storage.set(key, value),
      getItem: (key) => storage.get(key),
      removeItem: (key) => storage.delete(key),
    },
    document: {
      createElement: () => ({}),
      head: { append: (tag) => appended.push(tag) },
      addEventListener: (name, callback) => clicks.set(name, callback),
    },
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
  const activate = (href, zone = 'content', download = false, extra = {}) =>
    clicks.get(extra.type ?? 'click')?.({
      type: 'click',
      button: 0,
      isTrusted: true,
      target: new Element(href, zone, download),
      ...extra,
    });
  const events = () =>
    Array.from(context.dataLayer ?? [], (args) => Array.from(args)).filter(
      (args) => args[0] === 'event',
    );
  return { context, appended, listeners, clicks, idle: () => idle(), activate, events };
}
test('queues before rendered readiness and idle loading without blocking intentional activation', () => {
  const f = load();
  assert.equal(f.context.dataLayer.length, 2);
  assert.equal(f.appended.length, 0);
  f.activate('/assets/resume/d-james-poer-resume.pdf', 'app-hero', true);
  assert.equal(f.events()[0][1], 'resume_download');
  f.listeners.get('portfolio-ready')();
  assert.equal(f.appended.length, 0);
  f.idle();
  assert.equal(f.appended.length, 1);
  assert.equal(f.appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-WQBYGF4Z8F');
});
test('only production hosts initialize analytics', () => {
  for (const host of [
    'localhost:4417',
    '127.0.0.1:4417',
    'api-test.djamespoer.com',
    'preview.workers.dev',
    'nurseericakortz.com',
  ]) {
    const f = load('https://' + host + '/');
    assert.equal(f.context.dataLayer, undefined);
    assert.equal(f.clicks.size, 0);
  }
  assert.equal(load('https://www.djamespoer.com/').context.dataLayer.length, 2);
});
test('internal marker suppresses GA before configuration and persists until explicitly cleared', () => {
  const storage = new Map();
  assert.equal(load('https://djamespoer.com/?internal=1', storage).context.dataLayer, undefined);
  assert.equal(load('https://djamespoer.com/thingamajob', storage).context.dataLayer, undefined);
  assert.equal(load('https://djamespoer.com/?internal=0', storage).context.dataLayer.length, 2);
});
test('conversion parameters contain only allowlisted identifiers, never PII, destinations or input data', () => {
  const f = load('https://djamespoer.com/engineering?email=private@example.invalid#private-jd');
  f.activate('mailto:private@example.invalid?body=Private+resume', 'app-header');
  f.activate('/assets/resume/d-james-poer-resume.pdf', 'app-header', true);
  f.activate('/thingamajob?private=hidden', 'app-thingamajob');
  f.activate('/work/ips?secret=hidden', 'app-header');
  const events = f.events();
  assert.deepEqual(
    events.map((e) => e[1]),
    ['contact_click', 'resume_download', 'thingamajob_open'],
  );
  assert.ok(events.every((e) => e[2].page_path === '/engineering'));
  assert.equal(events[1][2].resume_id, 'public-current');
  assert.equal(events[2][2].destination_path, '/thingamajob');
  assert.doesNotMatch(JSON.stringify(events), /private|@|secret|mailto:|\.pdf|\?|#/);
});
test('ignores passive rendering, synthetic activation, right clicks and unrelated downloads; middle/keyboard intent counts once', () => {
  const f = load();
  assert.equal(f.events().length, 0);
  f.activate('/thingamajob', 'content', false, { isTrusted: false });
  f.activate('/thingamajob', 'content', false, { button: 2 });
  f.activate('/other.pdf', 'content', true);
  assert.equal(f.events().length, 0);
  f.activate('/thingamajob', 'content', false, { type: 'auxclick', button: 1 });
  f.activate('/thingamajob', 'content', false, { defaultPrevented: true, detail: 0 });
  assert.equal(f.events().length, 2);
});

test('page-owned homepage Thingamajob CTA retains its attribution', () => {
  const f = load();
  f.activate('/thingamajob', '.home-thingamajob-entry');
  assert.equal(f.events()[0][1], 'thingamajob_open');
  assert.equal(f.events()[0][2].cta_location, 'home-thingamajob');
});
