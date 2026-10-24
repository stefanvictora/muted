import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const script = await readFile(
  new URL('../extension/content/controller.js', import.meta.url),
  'utf8',
);
function context(root = true) {
  const classes = new Set(),
    observers = [],
    listeners = [];
  const element = {
    classList: {
      add: (x) => classes.add(x),
      remove: (x) => classes.delete(x),
      contains: (x) => classes.has(x),
    },
  };
  const document = {
    documentElement: root ? element : null,
    contentType: 'text/html',
    addEventListener() {},
    removeEventListener() {},
  };
  const sandbox = {
    document,
    location: { href: 'https://reddit.com/', hostname: 'reddit.com' },
    setTimeout: () => 1,
    clearTimeout: () => {},
    chrome: { runtime: { id: 'test-id', onMessage: { addListener: (fn) => listeners.push(fn) } } },
    MutationObserver: class {
      constructor(fn) {
        this.fn = fn;
        observers.push(this);
      }
      observe(target, options) {
        this.options = options;
        this.active = true;
      }
      disconnect() {
        this.active = false;
      }
    },
  };
  sandbox.top = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  return { ctx, classes, observers, listeners, document, element };
}

test('Controller ist idempotent, stoppt Beobachter vor Entfernen und ignoriert veraltete oder navigierte Ziele', () => {
  const h = context();
  vm.runInContext(script, h.ctx);
  vm.runInContext(script, h.ctx);
  assert.equal(h.listeners.length, 1);
  const controller = h.ctx.__localGrayscaleV1;
  assert.equal(
    controller.set({ active: true, expectedUrl: 'https://reddit.com/', revision: 2 }).applied,
    true,
  );
  assert.equal(h.classes.size, 1);
  assert.equal(h.observers.filter((o) => o.active).length, 1);
  h.classes.clear();
  h.observers.at(-1).fn();
  assert.equal(h.classes.size, 1);
  controller.set({ active: false, expectedUrl: 'https://reddit.com/', revision: 3 });
  assert.equal(h.classes.size, 0);
  assert.equal(h.observers.filter((o) => o.active).length, 0);
  controller.set({ active: true, expectedUrl: 'https://reddit.com/', revision: 2 });
  assert.equal(h.classes.size, 0);
  assert.equal(
    controller.set({ active: true, expectedUrl: 'https://other.de/', revision: 4 }).reason,
    'navigated',
  );
  assert.equal(h.classes.size, 0);
});

test('Frühstart wartet kurz auf html; Deaktivieren stoppt das Warten und PDF bleibt unberührt', () => {
  const h = context(false);
  vm.runInContext(script, h.ctx);
  h.ctx.__localGrayscaleV1.set({ active: true, expectedUrl: 'https://reddit.com/', revision: 1 });
  assert.equal(h.observers.filter((o) => o.active).length, 1);
  h.document.documentElement = h.element;
  h.observers[0].fn();
  assert.equal(h.classes.size, 1);
  assert.equal(h.observers.filter((o) => o.active).length, 1);
  const early = context(false);
  vm.runInContext(script, early.ctx);
  early.ctx.__localGrayscaleV1.set({
    active: true,
    expectedUrl: 'https://reddit.com/',
    revision: 1,
  });
  early.ctx.__localGrayscaleV1.set({
    active: false,
    expectedUrl: 'https://reddit.com/',
    revision: 2,
  });
  early.document.documentElement = early.element;
  early.observers[0].fn();
  assert.equal(early.classes.size, 0);
  const pdf = context();
  pdf.document.contentType = 'application/pdf';
  vm.runInContext(script, pdf.ctx);
  assert.equal(
    pdf.ctx.__localGrayscaleV1.set({
      active: true,
      expectedUrl: 'https://reddit.com/',
      revision: 1,
    }).applied,
    false,
  );
});
