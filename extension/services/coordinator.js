import { readState, writeState } from './state.js';
import { readGrants } from './permissions.js';
import { syncRegistration, syncTabs } from './filter.js';
import { validateMessage } from '../core/messages.js';
import { syncPause } from './pause.js';
import { settings, parseImport, exactKeys, defaultState } from '../core/schema.js';
import { decide, target } from '../core/policy.js';

export function createCoordinator(api, now = Date.now) {
  let state, grants, initialization, pages = {}, error = null;
  let effects = null, requestedPass = null, pagesRevision = -1;
  const removedTabs = new Set();
  let tail = Promise.resolve();
  const serial = task => { const result = tail.then(task); tail = result.catch(() => {}); return result; };
  const save = async changes => { state = await writeState(api, state, changes); };
  const snapshot = () => ({state:error ? null : state, grants, pages:pagesRevision===state?.revision ? pages : {}, error, applying:!!effects});
  function scheduleTabs(tabIds = null) {
    // A global change supersedes queued per-tab work; otherwise merge tab IDs.
    if (requestedPass) tabIds = requestedPass.tabIds === null || tabIds === null
      ? null : new Set([...requestedPass.tabIds,...tabIds]);
    requestedPass={state,grants,now:now(),tabIds};
    if (!effects) {
      effects=(async()=>{
        while (requestedPass) {
          const pass=requestedPass;requestedPass=null;
          const current=()=>!error && state.revision===pass.state.revision;
          const tabs=pass.tabIds === null ? undefined : (await Promise.all([...pass.tabIds]
            .map(id=>api.tabs.get(id).catch(()=>null)))).filter(Boolean);
          const result=await syncTabs(api,pass.state,pass.grants,pass.now,pages,current,tabs);
          if (current()) {
            pages=pass.tabIds === null ? result : {...pages,...result};
            for (const id of removedTabs) delete pages[id];
            pagesRevision=pass.state.revision;await updateBadge();
          }
        }
      })().finally(()=>{
        effects=null;removedTabs.clear();
        // Runtime messages reach extension pages, not website content scripts.
        // With no popup/options open the rejected delivery is expected.
        api.runtime.sendMessage({type:'changed'}).catch(()=>{});
      });
      // Event callers may have disappeared; do not create unhandled rejections.
      effects.catch(()=>{api.action.setBadgeText({text:'!'}).catch(()=>{});});
    }
    return {done:effects};
  }
  async function changeSettings(next) {
    await save(settings(next));
  }
  async function reconcile() {
    await syncPause(api, state, now(), save);
    await syncRegistration(api, state, grants, now());
    const pass=scheduleTabs();
    await updateBadge();
    return pass;
  }
  async function readPermissions() {
    const next = await readGrants(api);
    if (grants && next.global !== grants.global) await save({});
    grants = next;
  }
  async function expirePause() {
    if (state?.pauseUntil !== null && state?.pauseUntil <= now()) return reconcile();
  }
  async function updateBadge() {
    // Individual tab warnings belong in the popup, not the global action status.
    const attention = !grants.global;
    const badge = attention ? '!' : !state.enabled ? 'OFF' : state.pauseUntil > now() ? 'II' : 'ON';
    await api.action.setBadgeText({text:badge});
    await api.action.setTitle({title:`Muted · ${attention?'Aktion erforderlich':!state.enabled?'Ausgeschaltet':state.pauseUntil > now()?'Pause':'Eingeschaltet'}`});
  }
  function initialize() {
    return initialization ??= serial(async () => {
      try {
        state = await readState(api);
        await save({});
        await readPermissions();
        const paused=state.pauseUntil;
        await syncPause(api,state,now(),save);
        const registrationChanged=await syncRegistration(api,state,grants,now());
        await updateBadge();
        // A service worker wakes for individual documents and UI reads too.
        // A new/changed registration or an expired pause must reach old tabs.
        if (registrationChanged || (paused !== null && state.pauseUntil === null)) scheduleTabs();
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
        if (!error) await expirePause();
        return {};
      }
      if (message.type === 'recover') {
        if (!error) throw new Error('Keine beschädigte Initialisierung vorhanden.');
        await api.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
        state = {...defaultState(),mode:'selected',enabled:false};
        await save({});
        error = null;
        await readPermissions();
        return reconcile();
      }
      if (error) throw new Error(error);
      if (message.type === 'refresh') return await expirePause() ?? scheduleTabs(new Set([message.tabId]));
      if (message.type === 'mode') {
        await changeSettings({...state, mode:message.mode});
      } else if (message.type === 'import') await changeSettings(parseImport(message.text));
      else if (['add','remove'].includes(message.type)) {
        const list = message.type === 'add' ? [...state[message.list], message.domain] : state[message.list].filter(d => d !== message.domain);
        await changeSettings({...state, [message.list]:list});
      } else if (message.type === 'grants') {
        await readPermissions();
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
    const pass=await serial(async () => {if (!error) {await readPermissions();return reconcile();}});
    await pass?.done;
  }
  async function refreshTab(tabId, force = false) {
    await initialize();
    const pass=await serial(async()=>{
      if (error) return;
      const expired=await expirePause();
      if (expired) return expired;
      const known=pagesRevision===state.revision && pages[tabId];
      if (!force && known && !['sleeping','reload','pending'].includes(known.reason)) return;
      return scheduleTabs(new Set([tabId]));
    });
    await pass?.done;
  }
  async function forgetTab(tabId) {
    delete pages[tabId];
    requestedPass?.tabIds?.delete(tabId);
    if (effects) removedTabs.add(tabId);
  }
  async function document(message,sender) {
    exactKeys(message,['type']);
    if (message.type !== 'document' || sender?.id !== api.runtime.id || sender.frameId !== 0 ||
      !Number.isInteger(sender.tab?.id) || !target(sender.url)) throw new Error('Unzulässiges Dokument.');
    await initialize();
    return serial(async () => {
      if (error) throw new Error(error);
      await expirePause();
      const decision = decide(state,sender.url,grants,now());
      return {active:decision.wanted,expectedUrl:sender.url,revision:state.revision};
    });
  }
  return { start, handle, refresh, refreshTab, forgetTab, document };
}
