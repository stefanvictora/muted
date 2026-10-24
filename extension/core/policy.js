import { normalizeDomain, matchesDomain, hostPatterns } from './domains.js';

export const BROAD_HOSTS = ['http://*/*', 'https://*/*'];
export const BLOCKED = ['*://chromewebstore.google.com/*', '*://chrome.google.com/webstore/*', '*://microsoftedge.microsoft.com/addons/*'];

export function target(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) ||
      parsed.hostname === 'chromewebstore.google.com' ||
      (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) ||
      (parsed.hostname === 'microsoftedge.microsoft.com' && parsed.pathname.startsWith('/addons')) ||
      /\.pdf$/i.test(parsed.pathname)) return null;
    return { host: normalizeDomain(parsed.hostname), url: parsed.href };
  } catch { return null; }
}

export function decide(state, url, grants, now) {
  const page = target(url);
  const result = reason => ({ wanted: reason === 'wanted', reason, host: page?.host ?? null });
  if (!page) return result('unsupported');
  if (!state.enabled) return result('off');
  if (!grants.global) return result('setup');
  if (state.pauseUntil > now) return result('paused');
  if (state.mode === 'global' && state.colorExceptions.some(d => matchesDomain(page.host, d))) return result('exception');
  if (state.mode === 'selected' && !state.grayscaleSites.some(d => matchesDomain(page.host, d))) return result('unselected');
  return result('wanted');
}

export function registration(state, grants, now) {
  if (!state.enabled || state.pauseUntil > now || !grants.global) return null;
  const matches = state.mode === 'global' ? BROAD_HOSTS : state.grayscaleSites
    .flatMap(hostPatterns);
  if (!matches.length) return null;
  return { id: 'local-grayscale', matches, excludeMatches: [...BLOCKED,
    ...(state.mode === 'global' ? state.colorExceptions.flatMap(hostPatterns) : [])],
    js: ['content/controller.js', 'content/start.js'], css: ['content/filter.css'],
    runAt: 'document_start', world: 'ISOLATED', allFrames: false, persistAcrossSessions: false };
}
