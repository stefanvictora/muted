export function requestFromClick(api, origins, commit) {
  // No await, messaging, or asynchronous validation before permissions.request.
  return api.permissions.request({origins}).then(granted => {
    if (!granted) throw new Error('Seitenzugriff abgelehnt. Der bisherige Zustand bleibt erhalten.');
    return commit();
  });
}

export async function command(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'Worker nicht erreichbar. Erweiterung neu laden.');
  return response.value;
}

export const labels = {
  unsupported:'Nicht unterstützt', setup:'Zugriff fehlt', transition:'Rechtebereinigung ausstehend',
  off:'Ausgeschaltet', paused:'Pause', exception:'Farbausnahme', unselected:'Nicht ausgewählt',
  permission:'Seitenzugriff fehlt', wanted:'Anwendung wird geprüft', active:'Grau aktiv',
  pending:'Anwendung noch nicht bestätigt – erneut prüfen', sleeping:'Tab schläft – zum Abgleichen öffnen', reload:'Anwendung oder Bereinigung nicht bestätigt – Seite neu laden'
};

export function el(id) { return document.getElementById(id); }
export function showError(error) { el('error').textContent = error?.message ?? String(error); }
export function busy(value) { document.querySelectorAll('button,input,select').forEach(node=>{node.disabled=value;}); }
export function run(operation, render) {
  busy(true); el('error').textContent='';
  let pending;
  try { pending = operation(); } catch (error) { pending = Promise.reject(error); }
  return Promise.resolve(pending).then(render).catch(async error=>{
    showError(error);
    try { render(await command({type:'status'})); } catch { /* Keep the original visible error. */ }
  }).finally(()=>{busy(false); render();});
}
