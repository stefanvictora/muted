import { readFileSync } from 'node:fs';

export const catalogs = Object.fromEntries(
  ['en', 'de'].map((locale) => [
    locale,
    JSON.parse(
      readFileSync(
        new URL(`../extension/_locales/${locale}/messages.json`, import.meta.url),
        'utf8',
      ),
    ),
  ]),
);

// Model Chrome's locale lookup and named substitutions using the shipped catalogs.
export function i18nDouble(locale = 'en-US') {
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return {
    getUILanguage: () => locale,
    getMessage(key, substitutions = []) {
      const entry = catalogs[language]?.[key] ?? catalogs.en[key];
      if (!entry) return '';
      const values = typeof substitutions === 'string' ? [substitutions] : substitutions;
      return entry.message.replace(/\$([a-z_]+)\$/gi, (_, name) => {
        const content = entry.placeholders[name.toLowerCase()].content;
        return content.replace(/\$(\d)/g, (_, index) => values[Number(index) - 1] ?? '');
      });
    },
  };
}
