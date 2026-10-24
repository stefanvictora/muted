import { defaultState, validateState } from '../core/schema.js';

export async function readState(api) {
  if (!api.storage.local.setAccessLevel) throw new Error('error_secure_storage');
  await api.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const { state } = await api.storage.local.get('state');
  return state === undefined ? defaultState() : validateState(state);
}

export async function writeState(api, previous, changes) {
  const next = validateState({ ...previous, ...changes, revision: previous.revision + 1 });
  await api.storage.local.set({ state: next });
  return next;
}
