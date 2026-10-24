import { matchesDomain } from '../extension/core/domains.js';

export function browserDouble(saved) {
  const events = () => { const listeners=[]; return {addListener:fn=>listeners.push(fn), emit:(...args)=>listeners.forEach(fn=>fn(...args))}; };
  const db = { state: saved && structuredClone(saved) };
  const model = { db, origins: [], scripts: [], alarms: new Map(), tabs: [], applications: [], failRemove:false, failAccess:false, failTab:null, latency:0 };
  const covers = (grant, requested) => {
    if (grant === requested || grant === '<all_urls>') return true;
    const g = /^(\*|https?):\/\/(.*?)\/\*$/.exec(grant);
    const r = /^(https?):\/\/(.*?)\/\*$/.exec(requested);
    if (!g || !r || (g[1] !== '*' && g[1] !== r[1])) return false;
    return g[2] === '*' || (g[2].startsWith('*.') && matchesDomain(r[2].replace(/^\*\./,''),g[2].slice(2)));
  };
  const api = {
    runtime: { id:'test-id', getURL:path=>`chrome-extension://test-id/${path}`, onMessage:events(), onStartup:events(), onInstalled:events() },
    storage: {local: {
      setAccessLevel:async()=>{if(model.failAccess) throw new Error('access'); model.trusted=true;},
      get:async()=>structuredClone(db), set:async values=>{if(model.latency) await new Promise(r=>setTimeout(r,model.latency)); Object.assign(db,structuredClone(values));}
    }},
    permissions: {onAdded:events(),onRemoved:events(),getAll:async()=>({origins:[...model.origins], permissions:['storage','scripting','activeTab','alarms']}),
      contains:async({origins})=>origins.every(r=>model.origins.some(g=>covers(g,r))),
      remove:async({origins})=>{if(model.failRemove) return false; model.origins=model.origins.filter(g=>!origins.includes(g)); return true;}
    },
    scripting: {
      getRegisteredContentScripts:async()=>structuredClone(model.scripts),
      unregisterContentScripts:async()=>{model.scripts=[];},
      registerContentScripts:async specs=>{model.scripts=structuredClone(specs);},
      updateContentScripts:async specs=>{model.scripts=structuredClone(specs);},
      executeScript:async spec=>{if(model.failTab===spec.target.tabId) throw new Error('closed');
        if(spec.args) {model.applications.push(spec.args[0]); return [{frameId:0,result:{applied:spec.args[0].active,reason:spec.args[0].active?'active':'inactive'}}];}
        return [{frameId:0,result:null}];},
      insertCSS:async()=>{},removeCSS:async()=>{}
    },
    tabs: {query:async()=>structuredClone(model.tabs),onUpdated:events(),onRemoved:events(),onActivated:events(),sendMessage:async()=>({applied:false})},
    alarms: {onAlarm:events(), get:async name=>model.alarms.get(name),create:(name,value)=>{model.alarms.set(name,{scheduledTime:value.when});},clear:async name=>model.alarms.delete(name)},
    action: {setBadgeText:async value=>{model.badge=value.text;},setTitle:async()=>{}}
  };
  return {api,model, sender:{id:'test-id',url:'chrome-extension://test-id/popup/popup.html',origin:'chrome-extension://test-id'}};
}
