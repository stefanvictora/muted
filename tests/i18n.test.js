import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { catalogs, i18nDouble } from './i18n-double.js';
import { t, errorText, formatTime } from '../extension/ui/i18n.js';
import { normalizeDomain } from '../extension/core/domains.js';
import { parseImport } from '../extension/core/schema.js';
import { installBackground } from '../extension/background.js';
import { browserDouble } from './browser-double.js';
import { createManifest } from '../tools/integrity.mjs';

test('Both catalogs cover runtime messages, accessible labels, and substitution names', async () => {
  assert.deepEqual(Object.keys(catalogs.de).sort(), Object.keys(catalogs.en).sort());
  for (const [key, entry] of Object.entries(catalogs.en)) {
    for (const locale of ['de', 'en']) {
      const translated = catalogs[locale][key];
      assert.ok(translated.message.trim(), `${locale}: ${key}`);
      assert.deepEqual(translated.placeholders, entry.placeholders, `${locale}: ${key}`);
      for (const match of translated.message.matchAll(/\$([a-z_]+)\$/gi)) {
        assert.ok(
          translated.placeholders?.[match[1].toLowerCase()],
          `${locale}: ${key}: ${match[1]}`,
        );
      }
    }
  }
  async function audit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await audit(path);
      else if (/\.(js|html)$/.test(entry.name)) {
        const source = await readFile(path, 'utf8');
        const references = [
          ...source.matchAll(/\bt\('([a-z_]+)'/g),
          ...source.matchAll(/data-i18n(?:-placeholder|-aria-label)?="([a-z_0-9]+)"/g),
          ...source.matchAll(/'(error_[a-z_]+)'/g),
        ];
        for (const [, key] of references) assert.ok(catalogs.en[key], `${path.pathname}: ${key}`);
        if (entry.name.endsWith('.html')) {
          for (const [tag] of source.matchAll(/<[^>]+>/g)) {
            const attributes = [...tag.matchAll(/\b(data-i18n[\w-]*)=/g)].map((match) => match[1]);
            assert.equal(
              new Set(attributes).size,
              attributes.length,
              `Duplicate attributes: ${tag}`,
            );
          }
        }
      }
    }
  }
  await audit(new URL('../extension/', import.meta.url));
  const manifest = JSON.parse(
    await readFile(new URL('../extension/manifest.json', import.meta.url)),
  );
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.description, '__MSG_extension_description__');
  const packaged = await createManifest(
    fileURLToPath(new URL('..', import.meta.url)),
    manifest.version,
  );
  for (const locale of ['de', 'en'])
    assert.ok(packaged.includes(`extension/_locales/${locale}/messages.json`));
});

test('Regional languages, English fallback, placeholders and time formatting', () => {
  const timestamp = new Date(2026, 9, 24, 14, 5).getTime();
  for (const [locale, language, settings] of [
    ['de-AT', 'de', 'Einstellungen'],
    ['de-CH', 'de', 'Einstellungen'],
    ['en-GB', 'en', 'Settings'],
    ['en-US', 'en', 'Settings'],
    ['fr-FR', 'en', 'Settings'],
  ]) {
    const api = { i18n: i18nDouble(locale) };
    assert.equal(t('language_code', [], api), language);
    assert.equal(t('settings', [], api), settings);
    assert.equal(
      formatTime(timestamp, api),
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(timestamp),
    );
    assert.equal(
      t('remove_domain', ['example.com'], api),
      language === 'de' ? 'example.com entfernen' : 'Remove example.com',
    );
    assert.equal(errorText(new Error('Browser diagnostic'), api), 'Browser diagnostic');
    assert.throws(
      () => normalizeDomain('https://example.com/path'),
      (error) => {
        assert.equal(errorText(error, api), catalogs[language].error_invalid_domain.message);
        return true;
      },
    );
    assert.throws(
      () => parseImport('{'),
      (error) => {
        assert.equal(errorText(error, api), catalogs[language].error_invalid_json.message);
        return true;
      },
    );
  }
});

test('Worker responses, startup failures and action titles use the browser language', async () => {
  for (const [locale, language] of [
    ['de-AT', 'de'],
    ['en-US', 'en'],
    ['fr-FR', 'en'],
  ]) {
    const { api, model, sender } = browserDouble();
    api.i18n = i18nDouble(locale);
    const worker = installBackground(api);
    await worker.start();
    assert.equal(model.title, `Muted · ${catalogs[language].action_required.message}`);
    const response = await new Promise((resolve) =>
      api.runtime.onMessage.emit(
        { type: 'add', list: 'colorExceptions', domain: 'https://example.com' },
        sender,
        resolve,
      ),
    );
    assert.equal(response.ok, false);
    assert.equal(response.error, catalogs[language].error_invalid_domain.message);
    model.origins = ['http://*/*', 'https://*/*'];
    await worker.handle({ type: 'grants' }, sender);
    assert.equal(model.badge, catalogs[language].badge_on.message);
    await worker.handle({ type: 'enabled', value: false }, sender);
    assert.equal(model.badge, catalogs[language].badge_off.message);
    const broken = browserDouble({ schemaVersion: 99 });
    broken.api.i18n = i18nDouble(locale);
    const failed = installBackground(broken.api);
    const result = await failed.handle({ type: 'status' }, broken.sender);
    assert.equal(result.error, catalogs[language].error_initialization.message);
  }
});
