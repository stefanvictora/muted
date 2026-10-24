import { t, errorText } from './i18n.js';

export function requestFromClick(api, origins, commit) {
  // No await, messaging, or asynchronous validation before permissions.request.
  return api.permissions.request({origins}).then(granted => {
    if (!granted) throw new Error('error_access_denied');
    return commit();
  });
}

export async function command(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'error_worker_unavailable');
  return response.value;
}

let running=0;
export function watch(render) {
  chrome.runtime.onMessage.addListener((message,sender)=>{
    if (message?.type!=='changed' || sender.id!==chrome.runtime.id || sender.tab) return;
    command({type:'status'}).then(value=>{render(value);if(running)busy(true);}).catch(showError);
  });
}

export function statusLabel(reason) {
  const label = t(`status_${reason}`);
  return label === `status_${reason}` ? t('status_pending') : label;
}

export function el(id) { return document.getElementById(id); }
export function showError(error) { el('error').textContent = errorText(error); }
export function busy(value) { document.querySelectorAll('button,input,select').forEach(node=>{node.disabled=value;}); }
export function run(operation, render) {
  running++;
  busy(true); el('error').textContent='';
  let pending;
  try { pending = operation(); } catch (error) { pending = Promise.reject(error); }
  return Promise.resolve(pending).then(render).catch(async error=>{
    showError(error);
    try { render(await command({type:'status'})); } catch { /* Keep the original visible error. */ }
  }).finally(()=>{running--;busy(false); render();if(running)busy(true);});
}
