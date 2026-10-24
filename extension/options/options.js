import { command, requestFromClick, el, run, showError } from '../ui/api.js';
import { BROAD_HOSTS } from '../core/policy.js';
import { matchesDomain, hostPatterns, normalizeDomain } from '../core/domains.js';
import { parseImport, exportSettings } from '../core/schema.js';

let snapshot, preparedImport=null, grantOrigins=[];
function modeHelp() {
  el('mode-help').textContent=el('mode').value==='global'
    ? 'Benötigt Zugriff auf alle Websites. Ausnahmen bleiben farbig.'
    : 'Beim Wechsel werden Freigaben zurückgesetzt. Ausgewählte Websites danach unter „Seitenzugriff“ freigeben.';
}
function listRows(list,id,state) {
  const container=el(id); container.replaceChildren();
  if (!state[list].length) { const li=document.createElement('li'); li.className='empty'; li.textContent='Keine Websites hinzugefügt'; container.append(li); }
  for (const domain of state[list]) {
    const li=document.createElement('li'), row=document.createElement('div'), label=document.createElement('span'), button=document.createElement('button');
    row.className='row'; label.textContent=domain;
    const parent=state[list].find(other=>other!==domain && matchesDomain(domain,other));
    const notes=[];
    if (parent) notes.push(`Enthalten in ${parent}`);
    if (list==='grayscaleSites' && state.mode==='selected') notes.push(snapshot.grants.sites.includes(domain)?'Zugriff erlaubt':'Zugriff fehlt');
    if (notes.length) { const meta=document.createElement('span'); meta.className='site-meta'; meta.textContent=notes.join(' · '); label.append(meta); }
    button.textContent='Entfernen'; button.setAttribute('aria-label',`${domain} entfernen`);
    button.disabled=!!state.permissionTransition;
    button.addEventListener('click',()=>act(()=>command({type:'remove',list,domain})));
    row.append(label,button); li.append(row); container.append(li);
  }
}
function render(next) {
  if (next) snapshot=next;
  if (!snapshot) return;
  const state=snapshot.state;
  el('recovery').hidden=!!state;
  el('recover').disabled=!!state;
  if (!state) {
    el('status').textContent=snapshot.error;
    document.querySelectorAll('button,input,select').forEach(node=>{node.disabled=!['recover','refresh'].includes(node.id);});
    return;
  }
  el('status').textContent=state.permissionTransition ? 'Rechtebereinigung ausstehend. Filter ist deaktiviert; breiter Zugriff kann noch bestehen.' :
    !state.enabled ? 'Graustufen aus' : state.pauseUntil ? `Pause bis ${new Date(state.pauseUntil).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'})}` : 'Graustufen an';
  if (next) { el('mode').value=state.mode; modeHelp(); }
  for (const [id,mode] of [['color-active','global'],['gray-active','selected']]) {
    el(id).textContent=state.mode===mode?'Aktiv':'In diesem Modus inaktiv';
    el(id).dataset.active=String(state.mode===mode);
  }
  grantOrigins=state.mode==='global'?BROAD_HOSTS:state.grayscaleSites.flatMap(hostPatterns);
  const missingAccess=state.mode==='global'?!snapshot.grants.global:state.grayscaleSites.some(domain=>!snapshot.grants.sites.includes(domain));
  if (next && (missingAccess || state.permissionTransition)) el('access-details').open=true;
  el('grant').textContent=state.mode==='global'?'Alle Websites freigeben':'Ausgewählte Websites freigeben';
  el('grant').disabled=!grantOrigins.length || !missingAccess || !!state.permissionTransition;
  el('repair').disabled=state.mode!=='selected' && !state.permissionTransition;
  el('access').textContent=snapshot.grants.global
    ? 'Zugriff auf alle Websites erlaubt.'
    : state.mode==='global' ? 'Zugriff fehlt. Gib Websites frei, um Graustufen anzuwenden.' : `${snapshot.grants.sites.length} von ${state.grayscaleSites.length} Websites freigegeben.`;
  const origins=el('origins'); origins.replaceChildren();
  for (const origin of snapshot.grants.origins.length?snapshot.grants.origins:['Keine optionalen Seitenfreigaben']) {
    const li=document.createElement('li'); li.textContent=origin; origins.append(li);
  }
  listRows('colorExceptions','color-list',state); listRows('grayscaleSites','gray-list',state);
  el('gray-note').hidden=state.mode!=='selected' || !state.grayscaleSites.length;
  el('preview-area').hidden=!preparedImport;
  if (preparedImport) {
    el('preview').textContent=JSON.stringify(preparedImport,null,2);
    const needsGrant=preparedImport.mode==='global' && !snapshot.grants.global;
    el('import-help').textContent=needsGrant?'Zuerst Zugriff auf alle Websites erlauben, dann importieren.':'Ersetzt den Modus und beide Listen. Schalter und Pause bleiben erhalten.';
    el('import-grant').hidden=!needsGrant;
    el('import-apply').disabled=needsGrant || !!state.permissionTransition;
  }
  if (state.permissionTransition) document.querySelectorAll('button,input,select').forEach(node=>{
    if (!['repair','refresh','export','import-cancel'].includes(node.id)) node.disabled=true;
  });
}
const act=operation=>run(operation,render);
el('mode').addEventListener('change',modeHelp);
el('apply-mode').addEventListener('click',()=>{
  const mode=el('mode').value;
  act(()=>mode==='global'?requestFromClick(chrome,BROAD_HOSTS,()=>command({type:'mode',mode})):command({type:'mode',mode}));
});
el('grant').addEventListener('click',()=>act(()=>requestFromClick(chrome,grantOrigins,()=>command({type:'grants'}))));
el('repair').addEventListener('click',()=>act(()=>command({type:'repair'})));
el('recover').addEventListener('click',()=>act(()=>command({type:'recover'})));
el('refresh').addEventListener('click',()=>act(()=>command({type:'status'})));
for (const [prefix,list] of [['color','colorExceptions'],['gray','grayscaleSites']]) {
  const add=()=>act(async()=>{
    const domain=normalizeDomain(el(`${prefix}-input`).value);
    const result=await command({type:'add',list,domain}); el(`${prefix}-input`).value=''; return result;
  });
  el(`${prefix}-add`).addEventListener('click',add);
  el(`${prefix}-input`).addEventListener('keydown',event=>{if(event.key==='Enter') add();});
}
el('export').addEventListener('click',()=>{
  if (!snapshot?.state) return;
  const url=URL.createObjectURL(new Blob([exportSettings(snapshot.state)],{type:'application/json'}));
  const anchor=document.createElement('a'); anchor.href=url; anchor.download='local-grayscale.json';
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});
el('import-file').addEventListener('change',async()=>{
  preparedImport=null;
  try {
    const file=el('import-file').files[0];
    if (!file) return;
    if(file.size>65536) throw new Error('Datei darf höchstens 64 KiB groß sein.');
    preparedImport=parseImport(await file.text()); el('error').textContent='';
  } catch(error) {showError(error);} finally {render();}
});
el('import-grant').addEventListener('click',()=>act(()=>requestFromClick(chrome,BROAD_HOSTS,()=>command({type:'grants'}))));
el('import-apply').addEventListener('click',()=>{
  if(!preparedImport) return;
  const text=JSON.stringify(preparedImport);
  act(async()=>{const result=await command({type:'import',text}); preparedImport=null; el('import-file').value=''; return result;});
});
el('import-cancel').addEventListener('click',()=>{preparedImport=null;el('import-file').value='';render();});
modeHelp(); act(()=>command({type:'status'}));
