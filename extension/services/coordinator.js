import { readState, writeState } from './state.js';
import { readGrants, removeOptionalHosts } from './permissions.js';
import { syncRegistration, syncTabs } from './filter.js';
import { validateMessage } from '../core/messages.js';
import { syncPause } from './pause.js';
import { settings, parseImport, exactKeys, defaultState } from '../core/schema.js';
import { decide, target } from '../core/policy.js';

export function createCoordinator(api, now = Date.now) {
  let state, grants, initialization, pages = {}, error = null;
  let effects = null, requestedPass = null, pagesRevision = -1;
  let tail = Promise.resolve();
  const serial = task => { const result = tail.then(task); tail = result.catch(() => {}); return result; };
  const save = async changes => { state = await writeState(api, state, changes); };
  const snapshot = () => ({state:error ? null : state, grants, pages:pagesRevision===state?.revision ? pages : {}, error, applying:!!effects});
  function scheduleTabs() {
    requestedPass={state,grants,now:now()};
    if (!effects) {
      effects=(async()=>{
        while (requestedPass) {
          const pass=requestedPass;requestedPass=null;
          const current=()=>!error && state.revision===pass.state.revision;
          const result=await syncTabs(api,pass.state,pass.grants,pass.now,pages,current);
          if (current()) { pages=result;pagesRevision=pass.state.revision;await updateBadge(); }
        }
      })().finally(()=>{effects=null;});
      // Event callers may have disappeared; do not create unhandled rejections.
      effects.catch(()=>{api.action.setBadgeText({text:'!'}).catch(()=>{});});
    }
    return {done:effects};
  }
  async function finishTransition() {
    grants = await readGrants(api,state);
    await syncRegistration(api, state, grants, now());
    pages = await syncTabs(api, state, grants, now(), pages);
    pagesRevision=state.revision;
    await removeOptionalHosts(api);
    await save({...state.permissionTransition, permissionTransition:null});
  }
  async function changeSettings(next) {
    const desired = settings(next);
    grants = await readGrants(api,state);
    if (desired.mode === 'global' && !grants.global) throw new Error('Vorbereiteter Wunsch: zuerst globalen Seitenzugriff ausdrücklich freigeben.');
    const cleanup = desired.mode === 'selected' && (state.mode === 'global' || state.grayscaleSites.some(d => !desired.grayscaleSites.includes(d)));
    if (cleanup) {
      await save({permissionTransition:desired});
      await finishTransition();
    } else await save(desired);
  }
  async function reconcile() {
    // Fence delayed document replies, including changes to browser-owned grants.
    await save({});
    await syncPause(api, state, now(), save);
    grants = await readGrants(api, state);
    await syncRegistration(api, state, grants, now());
    const pass=scheduleTabs();
    await updateBadge();
    return pass;
  }
  async function updateBadge() {
    const attention = state.permissionTransition || (state.mode === 'global' ? !grants.global : state.grayscaleSites.some(d=>!grants.sites.includes(d))) || Object.values(pages).some(p=>p.reason==='reload');
    const badge = attention ? '!' : !state.enabled ? 'OFF' : state.pauseUntil > now() ? 'II' : 'ON';
    await api.action.setBadgeText({text:badge});
    await api.action.setTitle({title:`Local Grayscale · ${attention?'Aktion erforderlich':!state.enabled?'Ausgeschaltet':state.pauseUntil > now()?'Pause':'Eingeschaltet'}`});
  }
  function initialize() {
    return initialization ??= serial(async () => {
      try {
        state = await readState(api);
        await save({});
        if (state.permissionTransition) {
          try { await finishTransition(); } catch { /* Persisted transition remains blocked and repairable. */ }
        }
        await reconcile();
      } catch {
        error = 'Initialisierung fehlgeschlagen: Zustand, sicheren Speicherzugriff und Browser-APIs prüfen. Keine neue Filterung. Betroffene Seiten neu laden.';
        await api.action.setBadgeText({text:'!'}).catch(()=>{});
        try { await api.scripting.unregisterContentScripts({ids:['local-grayscale']}); } catch { /* Error remains visible. */ }
        try {
          for (const tab of await api.tabs.query({})) {
            try { await api.tabs.sendMessage(tab.id,{type:'deactivate',revision:Number.MAX_SAFE_INTEGER},{frameId:0}); } catch { /* Reload is shown. */ }
          }
        } catch { /* No page data is logged. */ }
      }
    });
  }
  async function handle(message, sender) {
    message = validateMessage(message, sender, api);
    await initialize();
    const result=await serial(async () => {
      if (message.type === 'status') {
        // Never put a read behind a frozen renderer. The in-flight pass publishes
        // confirmed results separately; the UI can poll while applying is true.
        if (error || effects) return {};
        return reconcile();
      }
      if (message.type === 'recover') {
        if (!error) throw new Error('Keine beschädigte Initialisierung vorhanden.');
        await api.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
        state = {...defaultState(),mode:'selected',enabled:false};
        await save({permissionTransition:settings(state)});
        await finishTransition();
        error = null;
        return reconcile();
      }
      if (error) throw new Error(error);
      if (state.permissionTransition && message.type !== 'repair') throw new Error('Zuerst Rechtebereinigung abschließen.');
      if (message.type === 'mode') {
        grants = await readGrants(api, state);
        await changeSettings({...state, mode:message.mode});
      } else if (message.type === 'repair') {
        if (state.permissionTransition) await finishTransition();
        else if (state.mode === 'selected') {
          await save({permissionTransition:settings(state)});
          await finishTransition();
        }
      } else if (message.type === 'import') await changeSettings(parseImport(message.text));
      else if (['add','remove'].includes(message.type)) {
        const list = message.type === 'add' ? [...state[message.list], message.domain] : state[message.list].filter(d => d !== message.domain);
        // Editing the dormant global list does not request access or change modes.
        const desired = settings({...state, [message.list]:list});
        if (state.mode === 'selected' && message.list === 'grayscaleSites' && message.type === 'remove') await changeSettings(desired);
        else await save(desired);
      } else if (message.type === 'grants') { /* Explicit UI grant already happened; always read browser truth below. */
      } else if (message.type === 'enabled') await save({enabled: message.value, pauseUntil:null});
      else if (message.type === 'pause') {
        if (!state.enabled) throw new Error('Zum Pausieren zuerst einschalten.');
        await save({pauseUntil:now() + message.minutes * 60000});
      } else if (message.type === 'resume') await save({pauseUntil:null});
      else throw new Error('Unbekannter Befehl.');
      return reconcile();
    });
    // Renderer work is awaited outside the state queue. Document handshakes and
    // subsequent UI commands remain free to read/change the committed state.
    await result?.done;
    return snapshot();
  }
  async function start() { await initialize(); await effects; }
  async function refresh() {
    await initialize();
    const pass=await serial(async () => {if (!error) return reconcile();});
    await pass?.done;
  }
  async function document(message,sender) {
    exactKeys(message,['type']);
    if (message.type !== 'document' || sender?.id !== api.runtime.id || sender.frameId !== 0 ||
      !Number.isInteger(sender.tab?.id) || !target(sender.url)) throw new Error('Unzulässiges Dokument.');
    await initialize();
    return serial(async () => {
      if (error) throw new Error(error);
      await syncPause(api,state,now(),save);
      grants = await readGrants(api,state);
      const decision = decide(state,sender.url,grants,now());
      return {active:decision.wanted,expectedUrl:sender.url,revision:state.revision};
    });
  }
  return { start, handle, refresh, document };
}
