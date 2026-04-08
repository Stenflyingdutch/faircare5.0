const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const contentAccess = fs.readFileSync(path.join(process.cwd(), 'lib/content-access.ts'), 'utf8');
const contentBlocksService = fs.readFileSync(path.join(process.cwd(), 'services/contentBlocks.service.ts'), 'utf8');
const adminTextsPage = fs.readFileSync(path.join(process.cwd(), 'app/admin/texts/page.tsx'), 'utf8');

test('content access defines central locale settings and translation gap tracking', () => {
  assert.match(contentAccess, /export const supportedLocales: Locale\[] = \['de', 'en', 'nl'\]/);
  assert.match(contentAccess, /defaultContentLocaleSettings/);
  assert.match(contentAccess, /collectMissingTranslations/);
  assert.match(contentAccess, /\[\[missing:/);
});

test('content block persistence stores locale settings together with blocks', () => {
  assert.match(contentBlocksService, /localeSettings\?: Partial<ContentLocaleSettings>/);
  assert.match(contentBlocksService, /content:\s*\{[\s\S]*blocks: normalized,[\s\S]*localeSettings/);
});

test('admin text management exposes incomplete translation controls', () => {
  assert.match(adminTextsPage, /Nur unvollständige Übersetzungen anzeigen/);
  assert.match(adminTextsPage, /Fehlend:/);
  assert.match(adminTextsPage, /Spracheinstellungen/);
  assert.match(adminTextsPage, /Fallback Sprache/);
});
