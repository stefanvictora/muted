// Chrome resolves regional locales (de-AT -> de) and the manifest's English fallback.
export function t(key, substitutions = [], api = globalThis.chrome) {
  return api.i18n.getMessage(key, substitutions) || key;
}

export function errorText(error, api = globalThis.chrome) {
  const message = error?.message ?? String(error);
  // Application errors use message keys; browser/API errors retain their diagnostics.
  return /^error_[a-z_]+$/.test(message) ? t(message, [], api) : message;
}

export function formatTime(timestamp, api = globalThis.chrome) {
  return new Intl.DateTimeFormat(api.i18n.getUILanguage(), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function localize(root = document) {
  root.documentElement.lang = t('language_code');
  for (const [attribute, target] of [
    ['data-i18n', null],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-aria-label', 'aria-label'],
  ]) {
    for (const node of root.querySelectorAll(`[${attribute}]`)) {
      const value = t(node.getAttribute(attribute));
      if (target) node.setAttribute(target, value);
      else node.textContent = value;
    }
  }
}
