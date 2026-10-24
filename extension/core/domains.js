export function normalizeDomain(input) {
  if (typeof input !== 'string') throw new Error('error_domain_text');
  const value = input.trim().replace(/\.$/, '').toLowerCase();
  const invalid = () => {
    throw new Error('error_invalid_domain');
  };
  if (!value || /[\s/\\@?#*%<>]/u.test(value)) invalid();
  if (value.startsWith('[')) {
    if (!/^\[[0-9a-f:]+\]$/.test(value)) invalid();
    try {
      return new URL(`http://${value}`).hostname;
    } catch {
      invalid();
    }
  }
  if (value.includes(':')) invalid();
  let host;
  try {
    host = new URL(`http://${value}`).hostname;
  } catch {
    invalid();
  }
  if (/^[0-9.]+$/.test(host)) {
    if (value !== host || !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) invalid();
    return host;
  }
  if (
    host.length > 253 ||
    host.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  )
    invalid();
  return host;
}

export function exactHost(domain) {
  return domain === 'localhost' || domain.startsWith('[') || /^(\d+\.){3}\d+$/.test(domain);
}

export function matchesDomain(host, domain) {
  return host === domain || (!exactHost(domain) && host.endsWith(`.${domain}`));
}

export function hostPatterns(domain) {
  const host = exactHost(domain) ? domain : `*.${domain}`;
  return [`http://${host}/*`, `https://${host}/*`];
}
