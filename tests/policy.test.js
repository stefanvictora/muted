import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, registration } from '../extension/core/policy.js';
import { defaultState } from '../extension/core/schema.js';

test('Prioritäten unterscheiden Zugriff, Ausschalten, Pause und unabhängige Listen', () => {
  const state = {
    ...defaultState(),
    colorExceptions: ['reddit.com'],
    grayscaleSites: ['youtube.com'],
  };
  const d = (
    patch = {},
    url = 'https://old.reddit.com/',
    grants = { global: true, sites: ['youtube.com'] },
  ) => decide({ ...state, ...patch }, url, grants, 1000).reason;
  assert.equal(d({}, 'edge://settings'), 'unsupported');
  assert.equal(d({}, 'https://chromewebstore.google.com/'), 'unsupported');
  assert.equal(d({}, 'https://x.de/report.pdf'), 'unsupported');
  assert.equal(d({}, null), 'unsupported');
  assert.equal(d({}, 'https://x.de', { global: false, sites: [] }), 'setup');
  assert.equal(d({ enabled: false, pauseUntil: 2000 }), 'off');
  assert.equal(d({ pauseUntil: 2000 }), 'paused');
  assert.equal(d({ pauseUntil: 999 }), 'exception');
  assert.equal(d({}, 'https://youtube.com'), 'wanted');
  assert.equal(d({ mode: 'selected' }), 'unselected');
  assert.equal(
    d({ mode: 'selected' }, 'https://youtube.com', { global: false, sites: [] }),
    'setup',
  );
  assert.equal(d({ mode: 'selected' }, 'https://m.youtube.com', { global: true }), 'wanted');
});

test('Registrierung folgt trotz Vollzugriff nur ausgewählten Regeln und verschwindet bei Pause', () => {
  const state = {
    ...defaultState(),
    mode: 'selected',
    grayscaleSites: ['reddit.com', 'youtube.com'],
  };
  const grants = { global: true };
  const spec = registration(state, grants, 1000);
  assert.deepEqual(spec.matches, [
    'http://*.reddit.com/*',
    'https://*.reddit.com/*',
    'http://*.youtube.com/*',
    'https://*.youtube.com/*',
  ]);
  assert.equal(spec.world, 'ISOLATED');
  assert.equal(spec.allFrames, false);
  assert.equal(spec.runAt, 'document_start');
  assert.equal(registration({ ...state, enabled: false }, grants, 1000), null);
  assert.equal(registration({ ...state, pauseUntil: 2000 }, grants, 1000), null);
  assert.equal(registration(defaultState(), { global: false, sites: [] }, 1000), null);
});
