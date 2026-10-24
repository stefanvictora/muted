import { t, errorText } from './ui/i18n.js';
import { createCoordinator } from './services/coordinator.js';
import { PAUSE_ALARM } from './services/pause.js';

export function installBackground(api) {
  const coordinator = createCoordinator(api);
  const failed = () => {
    api.action.setBadgeText({ text: '!' }).catch(() => {});
    api.action.setTitle({ title: t('sync_failed', [], api) }).catch(() => {});
  };
  const refresh = () => {
    coordinator.refresh().catch(failed);
  };
  // Register synchronously: events can arrive while storage initialization is pending.
  api.runtime.onMessage.addListener((message, sender, respond) => {
    const operation =
      message?.type === 'document'
        ? coordinator.document(message, sender)
        : coordinator.handle(message, sender);
    operation.then(
      (value) => respond({ ok: true, value }),
      (error) => respond({ ok: false, error: errorText(error, api) }),
    );
    return true;
  });
  api.runtime.onInstalled.addListener(refresh);
  api.runtime.onStartup.addListener(refresh);
  api.permissions.onAdded.addListener(refresh);
  api.permissions.onRemoved.addListener(refresh);
  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === PAUSE_ALARM) refresh();
  });
  const refreshTab = (id, force = false) => {
    coordinator.refreshTab(id, force).catch(failed);
  };
  api.tabs.onUpdated.addListener((id, change) => {
    if (
      change.status === 'complete' ||
      change.url ||
      change.frozen === false ||
      change.discarded === false
    )
      refreshTab(id, true);
  });
  api.tabs.onActivated.addListener(({ tabId }) => refreshTab(tabId));
  api.tabs.onRemoved.addListener((id) => {
    coordinator.forgetTab(id).catch(failed);
  });
  coordinator.start().catch(failed);
  return coordinator;
}

if (globalThis.chrome?.runtime?.id) installBackground(chrome);
