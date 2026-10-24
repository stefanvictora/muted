import { registration, decide, target } from '../core/policy.js';

export async function syncRegistration(api, state, grants, now) {
  const desired = registration(state, grants, now);
  const current = await api.scripting.getRegisteredContentScripts({ ids: ['local-grayscale'] });
  if (!desired) {
    if (!current.length) return false;
    await api.scripting.unregisterContentScripts({ ids: ['local-grayscale'] });
  } else if (current.length) {
    if (Object.entries(desired).every(([key,value])=>JSON.stringify(current[0][key])===JSON.stringify(value))) return false;
    await api.scripting.updateContentScripts([desired]);
  } else await api.scripting.registerContentScripts([desired]);
  return true;
}

export async function syncTabs(api, state, grants, now, previous = {}, isCurrent = () => true, selectedTabs) {
  const tabs = selectedTabs ?? await api.tabs.query({});
  const pages = {};
  // At most four top-level documents are touched concurrently.
  for (let offset=0; offset<tabs.length; offset+=4) {
    if (!isCurrent()) break;
    await Promise.all(tabs.slice(offset,offset+4).map(async tab => {
      const page = target(tab.url);
      const decision = decide(state,tab.url,grants,now);
      const config = {active:decision.wanted, expectedUrl:page?.url ?? null, revision:state.revision};
      const access = page && grants.global;
      if (tab.discarded || tab.frozen) {
        pages[tab.id]={...decision,reason:'sleeping'};
        return;
      }
      let stopped=false, timer;
      // A renderer operation cannot be cancelled by Chromium. Stop subsequent
      // steps after the deadline or a newer committed revision instead.
      const call=async operation=>{
        if(stopped || !isCurrent()) throw new Error('Superseded');
        const result=await operation();
        if(stopped || !isCurrent()) throw new Error('Superseded');
        return result;
      };
      const apply=async()=>{
        if (!page || !access) {
          try {
            const result=await call(()=>api.tabs.sendMessage(tab.id,{type:'deactivate',revision:state.revision},{frameId:0}));
            if (result?.applied !== false) throw new Error('Unconfirmed cleanup');
          } catch {
            if (previous[tab.id]?.applied || previous[tab.id]?.reason==='reload') return {...decision,reason:'reload'};
          }
          return decision;
        }
        try {
          const injectionTarget = {tabId:tab.id, frameIds:[0]};
          if (decision.wanted) {
            await call(()=>api.scripting.removeCSS({target:injectionTarget,files:['content/filter.css'],origin:'AUTHOR'}));
            await call(()=>api.scripting.insertCSS({target:injectionTarget,files:['content/filter.css'],origin:'AUTHOR'}));
            await call(()=>api.scripting.executeScript({target:injectionTarget,world:'ISOLATED',injectImmediately:true,files:['content/controller.js']}));
          }
          const results = await call(()=>api.scripting.executeScript({target:injectionTarget,world:'ISOLATED',injectImmediately:true,
            func: async config => {
              const controller=globalThis.__localGrayscaleV1;
              if (!controller) return {applied:false,reason:'inactive'};
              if (location.href!==config.expectedUrl) return {applied:false,reason:'navigated'};
              if (!config.active) return controller.set(config);
              // Execution may have been delayed in a frozen renderer. Authorize
              // against current state at execution time, never an old queued ON.
              const response=await chrome.runtime.sendMessage({type:'document'});
              if (!response?.ok) return {applied:false,reason:'pending'};
              return controller.set({...response.value,expectedUrl:config.expectedUrl});
            }, args:[config]}));
          const result = results.find(r=>r.frameId===0)?.result;
          let status=decision;
          if (result?.reason==='stale' || (!decision.wanted && result?.applied)) status={...decision,reason:'reload'};
          else if (result?.reason==='unsupported') status={...decision,reason:'unsupported'};
          else if (decision.wanted && result?.applied) status={...decision,applied:true,reason:'active'};
          else if (decision.wanted || result?.reason==='navigated') status={...decision,reason:'pending'};
          if (!decision.wanted) await call(()=>api.scripting.removeCSS({target:injectionTarget,files:['content/filter.css'],origin:'AUTHOR'}));
          return status;
        } catch { return {...decision,reason:'reload'}; }
      };
      try {
        pages[tab.id]=await Promise.race([apply(),new Promise(resolve=>{
          timer=setTimeout(()=>{stopped=true;resolve({...decision,reason:'reload'});},1000);
        })]);
      } finally {stopped=true;clearTimeout(timer);}
    }));
  }
  return pages;
}
