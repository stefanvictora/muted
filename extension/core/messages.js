import { exactKeys } from './schema.js';
import { normalizeDomain } from './domains.js';

export function validateMessage(message, sender, api) {
  const root = api.runtime.getURL('');
  if (sender?.id !== api.runtime.id || (sender.frameId !== undefined && sender.frameId !== 0) ||
    !['popup/popup.html', 'options/options.html'].some(path => sender.url === root + path) ||
    (sender.origin !== undefined && sender.origin !== root.slice(0,-1))) throw new Error('error_sender');
  const fields = {status:[], refresh:['tabId'], enabled:['value'], mode:['mode'], pause:['minutes'], resume:[], recover:[], grants:[], add:['list','domain'], remove:['list','domain'], import:['text']};
  if (!message || !Object.hasOwn(fields,message.type)) throw new Error('error_command');
  exactKeys(message, ['type', ...fields[message.type]]);
  if (message.type === 'refresh' && (!Number.isInteger(message.tabId) || message.tabId<0)) throw new Error('error_tab');
  if (message.type === 'enabled' && typeof message.value !== 'boolean') throw new Error('error_switch');
  if (message.type === 'mode' && !['global','selected'].includes(message.mode)) throw new Error('error_mode');
  if (message.type === 'pause' && ![5,15,30].includes(message.minutes)) throw new Error('error_pause_duration');
  if (['add','remove'].includes(message.type)) {
    if (!['colorExceptions','grayscaleSites'].includes(message.list)) throw new Error('error_list');
    return {...message, domain:normalizeDomain(message.domain)};
  }
  if (message.type === 'import' && typeof message.text !== 'string') throw new Error('error_import');
  return message;
}
