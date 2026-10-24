import { t, formatTime, localize } from '../ui/i18n.js';
import { command, requestFromClick, el, run, showError, watch } from '../ui/api.js';
import { BROAD_HOSTS } from '../core/policy.js';
import { matchesDomain, normalizeDomain } from '../core/domains.js';
import { parseImport, exportSettings } from '../core/schema.js';

localize();
let snapshot,
  preparedImport = null;
function modeHelp() {
  el('mode-help').textContent =
    el('mode').value === 'global' ? t('mode_global_help') : t('mode_selected_help');
}
function listRows(list, id, state) {
  const container = el(id);
  container.replaceChildren();
  if (!state[list].length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t('empty_list');
    container.append(li);
  }
  for (const domain of state[list]) {
    const li = document.createElement('li'),
      row = document.createElement('div'),
      label = document.createElement('span'),
      button = document.createElement('button');
    row.className = 'row';
    label.textContent = domain;
    const parent = state[list].find((other) => other !== domain && matchesDomain(domain, other));
    const notes = [];
    if (parent) notes.push(t('included_in', [parent]));
    if (notes.length) {
      const meta = document.createElement('span');
      meta.className = 'site-meta';
      meta.textContent = notes.join(' · ');
      label.append(meta);
    }
    button.textContent = t('remove');
    button.setAttribute('aria-label', t('remove_domain', [domain]));

    button.addEventListener('click', () => act(() => command({ type: 'remove', list, domain })));
    row.append(label, button);
    li.append(row);
    container.append(li);
  }
}
function render(next) {
  const previousMode = snapshot?.state?.mode;
  if (next) snapshot = next;
  if (!snapshot) return;
  const state = snapshot.state;
  el('recovery').hidden = !!state;
  el('recover').disabled = !!state;
  el('color-section').hidden = state?.mode !== 'global';
  el('gray-section').hidden = state?.mode !== 'selected';
  el('setup').hidden = !state || snapshot.grants?.global;
  el('grant').disabled = !state || snapshot.grants?.global;
  if (!state) {
    el('status').textContent = snapshot.error;
    document.querySelectorAll('button,input,select').forEach((node) => {
      node.disabled = !['recover'].includes(node.id);
    });
    return;
  }
  el('status').textContent = !state.enabled
    ? t('grayscale_off')
    : !snapshot.grants.global
      ? t('status_setup')
      : state.pauseUntil
        ? t('pause_until', [formatTime(state.pauseUntil)])
        : t('grayscale_on');
  if (next && previousMode !== state.mode) {
    el('mode').value = state.mode;
    modeHelp();
  }
  listRows('colorExceptions', 'color-list', state);
  listRows('grayscaleSites', 'gray-list', state);
  el('preview-area').hidden = !preparedImport;
  if (preparedImport) {
    el('preview').textContent = JSON.stringify(preparedImport, null, 2);
    el('import-help').textContent = t('import_help');
  }
}
const act = (operation) => run(operation, render);
el('mode').addEventListener('change', modeHelp);
el('apply-mode').addEventListener('click', () => {
  const mode = el('mode').value;
  act(() => command({ type: 'mode', mode }));
});
el('grant').addEventListener('click', () =>
  act(() => requestFromClick(chrome, BROAD_HOSTS, () => command({ type: 'grants' }))),
);
el('recover').addEventListener('click', () => act(() => command({ type: 'recover' })));
for (const [prefix, list] of [
  ['color', 'colorExceptions'],
  ['gray', 'grayscaleSites'],
]) {
  const add = () =>
    act(async () => {
      const domain = normalizeDomain(el(`${prefix}-input`).value);
      const result = await command({ type: 'add', list, domain });
      el(`${prefix}-input`).value = '';
      return result;
    });
  el(`${prefix}-add`).addEventListener('click', add);
  el(`${prefix}-input`).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') add();
  });
}
el('export').addEventListener('click', () => {
  if (!snapshot?.state) return;
  const url = URL.createObjectURL(
    new Blob([exportSettings(snapshot.state)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'muted.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
el('import-file').addEventListener('change', async () => {
  preparedImport = null;
  try {
    const file = el('import-file').files[0];
    if (!file) return;
    if (file.size > 65536) throw new Error('error_file_size');
    preparedImport = parseImport(await file.text());
    el('error').textContent = '';
  } catch (error) {
    showError(error);
  } finally {
    render();
  }
});
el('import-apply').addEventListener('click', () => {
  if (!preparedImport) return;
  const text = JSON.stringify(preparedImport);
  act(async () => {
    const result = await command({ type: 'import', text });
    preparedImport = null;
    el('import-file').value = '';
    return result;
  });
});
el('import-cancel').addEventListener('click', () => {
  preparedImport = null;
  el('import-file').value = '';
  render();
});
watch((next) => {
  if (
    !snapshot ||
    next.error !== snapshot.error ||
    next.state?.revision !== snapshot.state?.revision
  )
    render(next);
});
modeHelp();
act(() => command({ type: 'status' }));
