const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('0_1 ownership task package seed contains exactly 40 final packages grouped into 4 categories', () => {
  const src = read('data/ownershipTaskPackageTemplates.ts');
  const ageBlock = src.match(/'0_1': \{([\s\S]*?)\n  \},/);

  assert.ok(ageBlock, '0_1 seed block not found');
  const categoryBlocks = [...ageBlock[1].matchAll(/([a-z_]+): \[(.*?)\n    \],/gs)];
  assert.equal(categoryBlocks.length, 4, 'expected 4 categories for 0_1');

  const itemCount = [...ageBlock[1].matchAll(/\bitem\('/g)].length;
  assert.equal(itemCount, 40, 'expected exactly 40 task packages for 0_1');

  for (const [, categoryKey, block] of categoryBlocks) {
    const count = [...block.matchAll(/\bitem\('/g)].length;
    assert.equal(count, 10, `expected 10 task packages in ${categoryKey}`);
  }
});

test('0_1 task package seed includes localized detail lists and no new ages are filled', () => {
  const dataSrc = read('data/ownershipTaskPackageTemplates.ts');
  const typeSrc = read('types/ownership.ts');
  const serviceSrc = read('services/ownership.service.ts');

  assert.match(typeSrc, /details: LocalizedTextList;/);
  assert.match(dataSrc, /details: \{ de: details, en: \[\], nl: \[\] \}/);
  assert.doesNotMatch(dataSrc, /'1_3': \{/);
  assert.doesNotMatch(dataSrc, /'3_6': \{/);
  assert.doesNotMatch(dataSrc, /'6_10': \{/);
  assert.doesNotMatch(dataSrc, /'10_plus': \{/);
  assert.match(serviceSrc, /function getOwnershipTaskPackageSeed\(ageGroup: AgeGroup, categoryKey: QuizCategory\)/);
});

test('task package service normalizes details and seeds deterministic 0_1 ids without duplicate count logic', () => {
  const src = read('services/ownership.service.ts');

  assert.match(src, /function normalizeTaskPackageTemplate\(template: TaskPackageTemplate\)/);
  assert.match(src, /details: entry\.details,/);
  assert.match(src, /const id = `\$\{ageGroup\}_\$\{categoryKey\}_\$\{index \+ 1\}`;/);
  assert.doesNotMatch(src, /const count = existingByCategory/);
});

test('admin task packages page supports age filter, language switch, and editable detail list fields', () => {
  const src = read('app/admin/task-packages/page.tsx');

  assert.match(src, /const ageGroups: AgeGroup\[] = \['0_1', '1_3', '3_6', '6_10', '10_plus'\];/);
  assert.match(src, /const locales: Locale\[] = \['de', 'en', 'nl'\];/);
  assert.match(src, /const \[activeLocale, setActiveLocale\] = useState<Locale>\('de'\);/);
  assert.match(src, /Details \(\{activeLocale\.toUpperCase\(\)\}\)/);
  assert.match(src, /template\.details\[activeLocale\] \|\| template\.details\.de \|\| \[\]/);
  assert.match(src, /updateDetail\(index, e\.target\.value\)/);
});

test('seed includes the final fixed titles for each category', () => {
  const src = read('data/ownershipTaskPackageTemplates.ts');

  assert.match(src, /Wer wählt passende Spiel- und Lernimpulse aus/);
  assert.match(src, /Wer behält Vorsorgeuntersuchungen im Blick/);
  assert.match(src, /Wer behält den Überblick über tägliche Routinen/);
  assert.match(src, /Wer plant den Wocheneinkauf gedanklich/);
});
