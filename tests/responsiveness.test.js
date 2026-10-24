import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoordinator } from '../extension/services/coordinator.js';
import { browserDouble } from './browser-double.js';
import vm from 'node:vm';

test('Popup und neue Dokumente antworten nach Freigabe trotz wartender Injektion in anderem Tab', async () => {
  const { api, model, sender } = browserDouble();
  const worker = createCoordinator(api, () => 1000);
  await worker.start();
  model.tabs = [
    { id: 1, url: 'https://slow.example/' },
    { id: 2, url: 'https://ready.example/' },
  ];
  model.origins = ['http://*/*', 'https://*/*'];
  const execute = api.scripting.executeScript;
  let reached;
  const pendingInjection = new Promise((resolve) => {
    reached = resolve;
  });
  api.scripting.executeScript = (spec) => {
    if (spec.target.tabId === 1) {
      reached();
      return new Promise(() => {});
    }
    return execute(spec);
  };
  void worker.refresh();
  await pendingInjection;
  const status = worker.handle({ type: 'status' }, sender);
  const document = worker.document(
    { type: 'document' },
    { id: 'test-id', frameId: 0, tab: { id: 3 }, url: 'https://new.example/' },
  );
  let timeout;
  try {
    const result = await Promise.race([
      Promise.all([status, document]),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                'Popup bleibt bei Bitte warten; neues Dokument erhält keine Filterentscheidung.',
              ),
            ),
          250,
        );
      }),
    ]);
    assert.equal(result[0].grants.global, true);
    assert.equal(result[1].active, true);
  } finally {
    clearTimeout(timeout);
  }
});

test('Schon versandte Aktivierung prüft nach spätem Aufwachen den neuesten Schalter', async () => {
  const { api, model, sender } = browserDouble();
  const worker = createCoordinator(api, () => 1000);
  await worker.start();
  const url = 'https://sleeping.example/';
  model.tabs = [{ id: 1, url }];
  model.origins = ['http://*/*', 'https://*/*'];
  const execute = api.scripting.executeScript;
  let reached, release;
  const entered = new Promise((resolve) => {
    reached = resolve;
  });
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const applied = [];
  let late;
  api.scripting.executeScript = (spec) => {
    if (spec.args?.[0].active) {
      reached();
      late = blocked.then(async () => {
        const sandbox = {
          location: { href: url },
          __localGrayscaleV1: {
            set: (config) => {
              applied.push(config.active);
              return { applied: config.active };
            },
          },
          chrome: {
            runtime: {
              sendMessage: async (message) => ({
                ok: true,
                value: await worker.document(message, {
                  id: 'test-id',
                  frameId: 0,
                  tab: { id: 1 },
                  url,
                }),
              }),
            },
          },
        };
        const func = vm.runInNewContext(`(${spec.func.toString()})`, sandbox);
        return [{ frameId: 0, result: await func(spec.args[0]) }];
      });
      return late;
    }
    return execute(spec);
  };
  const refresh = worker.refresh();
  await entered;
  await worker.handle({ type: 'enabled', value: false }, sender);
  release();
  await late;
  await refresh;
  assert.deepEqual(applied, [false]);
});

test('Ausschalten beendet den Abgleich trotz hängendem Tab; verspätete Injektion aktiviert keinen alten Zustand', async () => {
  const { api, model, sender } = browserDouble();
  const worker = createCoordinator(api, () => 1000);
  await worker.start();
  model.tabs = [{ id: 1, url: 'https://sleeping.example/' }];
  model.origins = ['http://*/*', 'https://*/*'];
  const execute = api.scripting.executeScript;
  let reached, release;
  const entered = new Promise((resolve) => {
    reached = resolve;
  });
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  api.scripting.executeScript = async (spec) => {
    if (spec.files) {
      reached();
      await blocked;
    }
    return execute(spec);
  };
  const refresh = worker.refresh();
  await entered;
  const off = worker.handle({ type: 'enabled', value: false }, sender);
  let timeout;
  try {
    const result = await Promise.race([
      off,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Ausschalten wartet unbegrenzt auf schlafenden Tab.')),
          1800,
        );
      }),
    ]);
    assert.equal(result.state.enabled, false);
  } finally {
    clearTimeout(timeout);
    release();
    await refresh;
    await off;
  }
  assert.equal(
    model.applications.some((config) => config.active),
    false,
  );
});
