import test from 'node:test';
import assert from 'node:assert/strict';
import { installBackground } from '../extension/background.js';
import { browserDouble } from './browser-double.js';
import { defaultState } from '../extension/core/schema.js';

test('Worker registriert Nachrichten synchron und beantwortet erst nach sicherer Initialisierung', async () => {
  const { api, model, sender } = browserDouble();
  installBackground(api);
  const response = await new Promise((resolve) =>
    api.runtime.onMessage.emit({ type: 'status' }, sender, resolve),
  );
  assert.equal(response.ok, true);
  assert.equal(model.trusted, true);
  assert.equal(model.badge, '!');
  const denied = await new Promise((resolve) =>
    api.runtime.onMessage.emit({ type: 'enabled', value: false }, { id: 'other' }, resolve),
  );
  assert.equal(denied.ok, false);
});

test('Tab-Fehler bleiben im Seitenstatus und überschreiben weder Icon noch Tooltip', async () => {
  const { api, model, sender } = browserDouble(defaultState());
  model.origins = ['http://*/*', 'https://*/*'];
  model.tabs = [{ id: 1, url: 'https://gone.example/' }];
  model.failTab = 1;
  const worker = installBackground(api);
  await worker.start();
  for (const [command, badge, title] of [
    [{ type: 'status' }, 'ON', 'On'],
    [{ type: 'pause', minutes: 5 }, 'II', 'Paused'],
    [{ type: 'enabled', value: false }, 'OFF', 'Off'],
  ]) {
    const status = await worker.handle(command, sender);
    assert.equal(status.pages[1].reason, 'reload');
    assert.equal(model.badge, badge);
    assert.equal(model.title, `Muted · ${title}`);
  }
  api.tabs.onRemoved.emit(1);
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await worker.handle({ type: 'status' }, sender)).pages[1], undefined);
  assert.equal(model.badge, 'OFF');
});

test('Tab-Ereignisse behandeln nur den betroffenen Tab und schreiben keine Einstellungen', async () => {
  const { api, model, sender } = browserDouble(defaultState());
  model.origins = ['http://*/*', 'https://*/*'];
  model.tabs = [
    { id: 1, url: 'https://sleeping.example/', frozen: true },
    { id: 2, url: 'https://other.example/' },
  ];
  const worker = installBackground(api);
  await worker.refresh();
  const touched = [],
    otherCalls = [];
  const execute = api.scripting.executeScript;
  api.scripting.executeScript = (spec) => {
    touched.push(spec.target.tabId);
    return execute(spec);
  };
  for (const [object, method] of [
    [api.tabs, 'query'],
    [api.storage.local, 'set'],
    [api.permissions, 'contains'],
    [api.scripting, 'updateContentScripts'],
  ]) {
    const original = object[method];
    object[method] = (...args) => {
      otherCalls.push(method);
      return original(...args);
    };
  }
  model.tabs[0].frozen = false;
  api.tabs.onActivated.emit({ tabId: 1, windowId: 1 });
  for (let i = 0; i < 40; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.ok(touched.length > 0);
  assert.ok(touched.every((id) => id === 1));
  assert.deepEqual(otherCalls, []);
  assert.equal((await worker.handle({ type: 'status' }, sender)).pages[2].applied, true);
  touched.length = 0;
  api.tabs.onActivated.emit({ tabId: 1, windowId: 1 });
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    touched,
    [],
    'Ein bereits abgeglichener Tab braucht beim Wechsel keine erneute Injektion',
  );
  api.tabs.onRemoved.emit(1);
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(touched, []);
  assert.deepEqual(otherCalls, []);
  assert.equal((await worker.handle({ type: 'status' }, sender)).pages[1], undefined);
});

test('Schlafende Tabs werden nicht geweckt; beim Aktivieren erfolgt ein neuer Filterabgleich', async () => {
  const { api, model } = browserDouble(defaultState());
  model.origins = ['http://*/*', 'https://*/*'];
  model.tabs = [{ id: 1, url: 'https://sleeping.example/', frozen: true }];
  let activate;
  api.tabs.onActivated = {
    addListener: (fn) => {
      activate = fn;
    },
  };
  const worker = installBackground(api);
  await worker.start();
  assert.equal(model.applications.length, 0);
  assert.equal(typeof activate, 'function');
  model.tabs[0].frozen = false;
  activate({ tabId: 1, windowId: 1 });
  for (let i = 0; i < 20 && !model.applications.length; i++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    model.applications.some((config) => config.active),
    true,
  );
});
