import { BROAD_HOSTS } from '../core/policy.js';

export async function readGrants(api) {
  return { global: await api.permissions.contains({ origins: BROAD_HOSTS }) };
}
