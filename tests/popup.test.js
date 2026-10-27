import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState } from '../extension/core/schema.js';
import { createCoordinator } from '../extension/services/coordinator.js';
import { browserDouble } from './browser-double.js';
import { i18nDouble } from './i18n-double.js';

test('Popup removes inherited rules in both modes and updates the current page', async () => {
  const html = await readFile(new URL('../extension/popup/popup.html', import.meta.url), 'utf8');
  let instance = 0;
  for (const mode of ['global', 'selected']) {
    for (const rules of [['example.com'], ['example.com', 'docs.example.com']]) {
      const list = mode === 'global' ? 'colorExceptions' : 'grayscaleSites';
      const { api, model, sender } = browserDouble({
        ...defaultState(),
        mode,
        [list]: [...rules, 'other.example.com', 'unrelated.net'],
      });
      api.i18n = i18nDouble('de');
      model.origins = ['http://*/*', 'https://*/*'];
      model.tabs = [{ id: 1, url: 'https://docs.example.com/' }];
      const worker = createCoordinator(api);
      await worker.start();
      const nodes = new Map(
        [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [
          id,
          {
            textContent: '',
            disabled: false,
            hidden: false,
            listeners: {},
            addEventListener(event, listener) {
              this.listeners[event] = listener;
            },
          },
        ]),
      );
      const previous = { chrome: globalThis.chrome, document: globalThis.document };
      globalThis.chrome = {
        ...api,
        runtime: {
          ...api.runtime,
          sendMessage: async (message) => ({
            ok: true,
            value: await worker.handle(message, sender),
          }),
        },
      };
      globalThis.document = {
        documentElement: {},
        getElementById: (id) => nodes.get(id),
        querySelectorAll: (selector) =>
          selector === 'button,input,select' ? [...nodes.values()] : [],
      };
      try {
        await import(`../extension/popup/popup.js?test=${instance++}`);
        await new Promise(setImmediate);
        const button = nodes.get('site');
        assert.equal(button.disabled, false);
        assert.equal(
          button.textContent,
          mode === 'global' ? 'Wieder grau schalten' : 'Farbig lassen',
        );
        assert.equal(
          nodes.get('site-note').textContent,
          `Entfernt ${mode === 'global' ? 'die Farbausnahme' : 'die Graustufen-Regel'} für ${[...rules].sort().join(', ')} und alle Subdomains.`,
        );
        button.listeners.click();
        await new Promise(setImmediate);
        assert.equal(nodes.get('error').textContent, '');
        assert.deepEqual(model.db.state[list], ['other.example.com', 'unrelated.net']);
        assert.equal(
          nodes.get('status').textContent,
          mode === 'global' ? 'Grau aktiv' : 'Nicht ausgewählt',
        );
        assert.equal(button.textContent, mode === 'global' ? 'Farbig lassen' : 'Grau schalten');
        assert.equal(nodes.get('site-note').textContent, '');
        button.listeners.click();
        await new Promise(setImmediate);
        assert.deepEqual(model.db.state[list], [
          'docs.example.com',
          'other.example.com',
          'unrelated.net',
        ]);
        button.listeners.click();
        await new Promise(setImmediate);
        assert.deepEqual(model.db.state[list], ['other.example.com', 'unrelated.net']);
      } finally {
        globalThis.chrome = previous.chrome;
        globalThis.document = previous.document;
      }
    }
  }
});
