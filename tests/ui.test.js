import test from 'node:test';
import assert from 'node:assert/strict';
import { requestFromClick } from '../extension/ui/api.js';

test('Freigabe startet unmittelbar im Klick; Ablehnung sendet keinen Änderungsbefehl', async () => {
  const calls = [];
  const api = {
    permissions: {
      request: (origins) => {
        calls.push(origins);
        return Promise.resolve(false);
      },
    },
  };
  const pending = requestFromClick(api, ['https://*.example.com/*'], () => calls.push('commit'));
  assert.deepEqual(calls, [{ origins: ['https://*.example.com/*'] }]);
  await assert.rejects(pending, /error_access_denied/);
  assert.equal(calls.length, 1);
  api.permissions.request = () => Promise.resolve(true);
  await requestFromClick(api, ['https://*.example.com/*'], () => calls.push('commit'));
  assert.equal(calls.at(-1), 'commit');
});
