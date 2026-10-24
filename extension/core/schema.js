import { normalizeDomain } from './domains.js';

export function exactKeys(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => ![...required, ...optional].includes(key)) ||
    required.some(key => !Object.hasOwn(value, key))) throw new Error('error_fields');
}

export function settings(value) {
  if (!['global', 'selected'].includes(value.mode)) throw new Error('error_mode');
  const lists = [value.colorExceptions, value.grayscaleSites];
  if (lists.some(list => !Array.isArray(list)) || lists[0].length + lists[1].length > 200)
    throw new Error('error_rule_limit');
  const [colorExceptions, grayscaleSites] = lists.map(list => [...new Set(list.map(normalizeDomain))].sort());
  return { mode: value.mode, colorExceptions, grayscaleSites };
}

export function defaultState() {
  return { schemaVersion: 1, revision: 0, enabled: true, mode: 'global', colorExceptions: [], grayscaleSites: [], pauseUntil: null };
}

export function validateState(value) {
  exactKeys(value, ['schemaVersion', 'enabled', 'mode', 'colorExceptions', 'grayscaleSites', 'pauseUntil'], ['revision', 'permissionTransition']);
  if (value.schemaVersion !== 1 || typeof value.enabled !== 'boolean' ||
    !(value.pauseUntil === null || (Number.isSafeInteger(value.pauseUntil) && value.pauseUntil >= 0)) ||
    !(value.revision === undefined || (Number.isSafeInteger(value.revision) && value.revision >= 0)))
    throw new Error('error_state_schema');
  // Migrate the intended settings of an interrupted 0.1.x permissions change.
  let desired = settings(value);
  if (value.permissionTransition != null) {
    exactKeys(value.permissionTransition, ['mode', 'colorExceptions', 'grayscaleSites']);
    desired = settings(value.permissionTransition);
    if (desired.mode !== 'selected') throw new Error('error_permission_cleanup');
  }
  return { schemaVersion: 1, revision: value.revision ?? 0, enabled: value.enabled,
    ...desired, pauseUntil: value.pauseUntil };
}

export function parseImport(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 65536) throw new Error('error_file_size');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('error_invalid_json'); }
  exactKeys(value, ['formatVersion', 'mode', 'colorExceptions', 'grayscaleSites']);
  if (value.formatVersion !== 1) throw new Error('error_import_version');
  return { formatVersion: 1, ...settings(value) };
}

export function exportSettings(state) {
  return JSON.stringify({ formatVersion: 1, ...settings(state) }, null, 2);
}
