import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState,
  validateState,
  parseImport,
  exportSettings,
} from '../extension/core/schema.js';

test('Import ist streng, begrenzt, kanonisch und exportiert ausschließlich portable Regeln', () => {
  const portable = {
    formatVersion: 1,
    mode: 'selected',
    colorExceptions: ['EXAMPLE.com.', 'example.com'],
    grayscaleSites: ['BÜCHER.de'],
  };
  assert.deepEqual(parseImport(JSON.stringify(portable)), {
    formatVersion: 1,
    mode: 'selected',
    colorExceptions: ['example.com'],
    grayscaleSites: ['xn--bcher-kva.de'],
  });
  for (const patch of [
    { formatVersion: 2 },
    { extra: true },
    { enabled: false },
    { mode: 'all' },
    { colorExceptions: ['<script>'] },
    { grayscaleSites: 'x' },
    { constructor: {} },
    { grayscaleSites: Array.from({ length: 201 }, (_, i) => `s${i}.de`) },
  ]) {
    assert.throws(() => parseImport(JSON.stringify({ ...portable, ...patch })));
  }
  assert.throws(() =>
    parseImport(
      '{"__proto__":{},"formatVersion":1,"mode":"global","colorExceptions":[],"grayscaleSites":[]}',
    ),
  );
  assert.throws(() => parseImport(' '.repeat(65537)));
  assert.deepEqual(
    JSON.parse(exportSettings({ ...defaultState(), enabled: false, pauseUntil: 123 })),
    {
      formatVersion: 1,
      mode: 'global',
      colorExceptions: [],
      grayscaleSites: [],
    },
  );
  assert.throws(() => validateState({ ...defaultState(), schemaVersion: 2 }));
  assert.throws(() => validateState({ ...defaultState(), enabled: 'yes' }));
  assert.throws(() => validateState({ ...defaultState(), pauseUntil: -1 }));
});
