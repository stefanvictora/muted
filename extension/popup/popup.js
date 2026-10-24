import { t, formatTime, localize } from '../ui/i18n.js';
import { command, requestFromClick, statusLabel, el, run, watch } from '../ui/api.js';
import { target, decide, BROAD_HOSTS } from '../core/policy.js';
import { matchesDomain, exactHost } from '../core/domains.js';

localize();
let snapshot, tab, action;
function render(next) {
  if (next) snapshot=next;
  if (!snapshot) return;
  const state=snapshot.state, page=target(tab?.url);
  el('host').textContent=page?.host ?? t('no_website');
  el('enabled').disabled=!state;
  const needsSetup=!!state && !snapshot.grants?.global;
  el('setup').hidden=!needsSetup;
  el('enabled-control').hidden=!state || needsSetup;
  el('site-card').hidden=!state?.enabled || needsSetup;
  el('pause-controls').hidden=!state?.enabled || needsSetup;
  el('site-controls').hidden=needsSetup || !state?.enabled;
  el('attention').textContent='';
  el('grant').disabled=!needsSetup;
  el('site').disabled=true; action=null;
  document.querySelectorAll('[data-minutes]').forEach(button=>{button.disabled=!state?.enabled || needsSetup;});
  if (!state) { el('attention').textContent=snapshot.error; return; }
  const decision=decide(state,tab?.url,snapshot.grants,Date.now());
  const confirmed=snapshot.pages?.[tab?.id];
  let reason=confirmed?.host===page?.host && confirmed?.reason ? confirmed.reason : decision.reason;
  // The switch takes precedence over setup and stale page status, but cleanup
  // failures must remain visible even when the requested filter is off.
  if (!state.enabled && reason!=='reload') reason='off';
  if (el('site-card').hidden && (reason==='reload')) el('attention').textContent=statusLabel(reason);
  el('status').textContent=statusLabel(reason);
  el('enabled').checked=state.enabled;
  el('until').textContent=state.pauseUntil ? t('until', [formatTime(state.pauseUntil)]) : '';
  el('resume').hidden=!state.pauseUntil;
  el('resume').disabled=!state.pauseUntil;
  if (!page) { el('scope').textContent=t('unsupported_help'); return; }
  el('scope').textContent=exactHost(page.host)?t('exact_address'):t('includes_subdomains');
  const list=state.mode==='global'?'colorExceptions':'grayscaleSites';
  const matching=state[list].filter(domain=>matchesDomain(page.host,domain));
  const inherited=matching.some(domain=>domain!==page.host);
  el('site-note').textContent=inherited ? t('inherited_rule', [matching.join(', ')]) : '';
  const remove=matching.includes(page.host);
  el('site').textContent=state.mode==='global' ? (remove?t('make_gray'):t('keep_color')) : (remove?t('keep_color'):t('make_gray'));
  el('site').disabled=!state.enabled || needsSetup || inherited;
  action={type:remove?'remove':'add',list,domain:page.host};
}
const act=operation=>run(operation,render);
const currentStatus=()=>command(Number.isInteger(tab?.id)?{type:'refresh',tabId:tab.id}:{type:'status'});
el('enabled').addEventListener('change',()=>act(()=>command({type:'enabled',value:el('enabled').checked})));
el('grant').addEventListener('click',()=>act(()=>requestFromClick(chrome,BROAD_HOSTS,()=>command({type:'grants'}))));
el('site').addEventListener('click',()=>{
  if (!action) return;
  const prepared={...action};
  act(()=>command(prepared));
});
document.querySelectorAll('[data-minutes]').forEach(button=>button.addEventListener('click',()=>act(()=>command({type:'pause',minutes:Number(button.dataset.minutes)}))));
el('resume').addEventListener('click',()=>act(()=>command({type:'resume'})));
el('options').addEventListener('click',()=>chrome.runtime.openOptionsPage());
el('refresh').addEventListener('click',()=>act(currentStatus));
watch(render);
act(async()=>{
  [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  return currentStatus();
});
