import { command, requestFromClick, labels, el, run, showError } from '../ui/api.js';
import { target, decide, BROAD_HOSTS } from '../core/policy.js';
import { matchesDomain, hostPatterns, exactHost } from '../core/domains.js';

let snapshot, tab, action, origins=[], poll;
function render(next) {
  if (next) snapshot=next;
  if (!snapshot) return;
  clearTimeout(poll);
  if(snapshot.applying) poll=setTimeout(()=>command({type:'status'}).then(render).catch(showError),250);
  const state=snapshot.state, page=target(tab?.url);
  el('host').textContent=page?.host ?? 'Keine unterstützte Website';
  el('enabled').disabled=!state || !!state.permissionTransition;
  const needsSetup=!!state && state.mode==='global' && !snapshot.grants?.global && !state.permissionTransition;
  el('setup').hidden=!needsSetup;
  el('enabled-control').hidden=!state || needsSetup;
  el('site-card').hidden=!state?.enabled || needsSetup;
  el('pause-controls').hidden=!state?.enabled || needsSetup || !!state.permissionTransition;
  el('site-controls').hidden=needsSetup || !state?.enabled;
  el('attention').textContent='';
  el('grant').disabled=!needsSetup;
  el('site').disabled=true; action=null;
  document.querySelectorAll('[data-minutes]').forEach(button=>{button.disabled=!state?.enabled || needsSetup || !!state.permissionTransition;});
  if (!state) { el('attention').textContent=snapshot.error; return; }
  const decision=decide(state,tab?.url,snapshot.grants,Date.now());
  const confirmed=snapshot.pages?.[tab?.id];
  let reason=confirmed?.host===page?.host && confirmed?.reason ? confirmed.reason : decision.reason;
  // The switch takes precedence over setup and stale page status, but cleanup
  // failures must remain visible even when the requested filter is off.
  if (!state.enabled && !state.permissionTransition && reason!=='reload') reason='off';
  if (el('site-card').hidden && (reason==='reload' || reason==='transition')) el('attention').textContent=labels[reason];
  el('status').textContent=labels[reason] ?? labels.pending;
  el('enabled').checked=state.enabled;
  el('until').textContent=state.pauseUntil ? `Bis ${new Date(state.pauseUntil).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'})}` : '';
  el('resume').hidden=!state.pauseUntil;
  el('resume').disabled=!!state.permissionTransition;
  if (!page) { el('scope').textContent='Browserseiten, Stores, lokale Dateien und PDF-Ansichten sind nicht unterstützt.'; return; }
  el('scope').textContent=exactHost(page.host)?'Nur diese Adresse':'Inklusive Subdomains';
  const list=state.mode==='global'?'colorExceptions':'grayscaleSites';
  const matching=state[list].filter(domain=>matchesDomain(page.host,domain));
  const inherited=matching.some(domain=>domain!==page.host);
  el('site-note').textContent=inherited ? `Geregelt über ${matching.join(', ')}. In den Einstellungen ändern.` : state.mode==='selected' && matching.length ? 'Beim Entfernen werden Freigaben zurückgesetzt. Andere Websites danach erneut freigeben.' : '';
  const remove=matching.includes(page.host);
  el('site').textContent=state.mode==='global' ? (remove?'Grau schalten':'Farbig lassen') : (remove?'Farbig lassen':'Grau schalten');
  el('site').disabled=!state.enabled || needsSetup || inherited || !!state.permissionTransition;
  action={type:remove?'remove':'add',list,domain:page.host};
  origins=state.mode==='selected' && !remove ? hostPatterns(page.host) : [];
}
const act=operation=>run(operation,render);
el('enabled').addEventListener('change',()=>act(()=>command({type:'enabled',value:el('enabled').checked})));
el('grant').addEventListener('click',()=>act(()=>requestFromClick(chrome,BROAD_HOSTS,()=>command({type:'enabled',value:true}))));
el('site').addEventListener('click',()=>{
  if (!action) return;
  const prepared={...action};
  act(()=>origins.length ? requestFromClick(chrome,origins,()=>command(prepared)) : command(prepared));
});
document.querySelectorAll('[data-minutes]').forEach(button=>button.addEventListener('click',()=>act(()=>command({type:'pause',minutes:Number(button.dataset.minutes)}))));
el('resume').addEventListener('click',()=>act(()=>command({type:'resume'})));
el('options').addEventListener('click',()=>chrome.runtime.openOptionsPage());
el('refresh').addEventListener('click',()=>act(()=>command({type:'status'})));
act(async()=>{
  [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  return command({type:'status'});
});
