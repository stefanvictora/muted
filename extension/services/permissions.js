import { BROAD_HOSTS } from '../core/policy.js';
import { hostPatterns } from '../core/domains.js';

export async function readGrants(api, state) {
  const { origins = [] } = await api.permissions.getAll();
  const global = await api.permissions.contains({ origins: BROAD_HOSTS });
  const sites = [];
  for (const domain of state.grayscaleSites) {
    if (await api.permissions.contains({ origins: hostPatterns(domain) })) sites.push(domain);
  }
  return { global, sites, origins };
}

export async function removeOptionalHosts(api) {
  const optional = origins => origins.filter(origin => /^(https?|\*):\/\//.test(origin) || origin === '<all_urls>');
  const {origins = []} = await api.permissions.getAll();
  const remove = optional(origins);
  if (remove.length && !await api.permissions.remove({origins:remove})) throw new Error('Rechtebereinigung fehlgeschlagen. Breiter Zugriff kann noch bestehen; erneut bereinigen.');
  if (optional((await api.permissions.getAll()).origins ?? []).length) throw new Error('Seitenfreigaben bestehen weiterhin. Erneut bereinigen.');
}
