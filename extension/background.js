import { createCoordinator } from './services/coordinator.js';
import { PAUSE_ALARM } from './services/pause.js';

export function installBackground(api) {
  const coordinator = createCoordinator(api);
  const failed = () => {
    api.action.setBadgeText({text:'!'}).catch(()=>{});
    api.action.setTitle({title:'Local Grayscale · Abgleich fehlgeschlagen. Menü öffnen; ggf. Seite neu laden.'}).catch(()=>{});
  };
  const refresh = () => { coordinator.refresh().catch(failed); };
  // Register synchronously: events can arrive while storage initialization is pending.
  api.runtime.onMessage.addListener((message,sender,respond) => {
    const operation = message?.type === 'document' ? coordinator.document(message,sender) : coordinator.handle(message,sender);
    operation.then(value=>respond({ok:true,value}), error=>respond({ok:false,error:error.message}));
    return true;
  });
  api.runtime.onInstalled.addListener(refresh);
  api.runtime.onStartup.addListener(refresh);
  api.permissions.onAdded.addListener(refresh);
  api.permissions.onRemoved.addListener(refresh);
  api.alarms.onAlarm.addListener(alarm=>{if(alarm.name===PAUSE_ALARM) refresh();});
  api.tabs.onUpdated.addListener((_id,change)=>{if(change.status==='complete' || change.url || change.frozen===false || change.discarded===false) refresh();});
  api.tabs.onActivated.addListener(refresh);
  api.tabs.onRemoved.addListener(refresh);
  coordinator.start().catch(failed);
  return coordinator;
}

if (globalThis.chrome?.runtime?.id) installBackground(chrome);
