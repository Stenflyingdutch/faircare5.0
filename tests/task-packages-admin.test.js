const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function loadTsModule(relPath) {
  const source = read(relPath);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(path.join(repoRoot, relPath)),
    __filename: path.join(repoRoot, relPath),
  };
  vm.runInNewContext(compiled, context, { filename: relPath });
  return module.exports;
}

test('ownership task package seeds contain 48 final packages for every age group', () => {
  const { ownershipTaskPackageSeedByAgeGroup } = loadTsModule('data/ownershipTaskPackageTemplates.ts');
  const ageGroups = ['0_1', '1_3', '3_6', '6_10', '10_plus'];

  for (const ageGroup of ageGroups) {
    const categories = ownershipTaskPackageSeedByAgeGroup[ageGroup];
    assert.ok(categories, `expected seed block for ${ageGroup}`);

    const categoryKeys = Object.keys(categories);
    assert.deepEqual(categoryKeys, [
      'betreuung_entwicklung',
      'gesundheit',
      'babyalltag_pflege',
      'haushalt_einkaeufe_vorraete',
    ]);

    const itemCount = Object.values(categories).reduce((sum, items) => sum + items.length, 0);
    assert.equal(itemCount, 48, `expected exactly 48 task packages for ${ageGroup}`);
    assert.equal(categories.betreuung_entwicklung.length, 13, `expected 13 task packages in ${ageGroup}/betreuung_entwicklung`);
    assert.equal(categories.gesundheit.length, 9, `expected 9 task packages in ${ageGroup}/gesundheit`);
    assert.equal(categories.babyalltag_pflege.length, 13, `expected 13 task packages in ${ageGroup}/babyalltag_pflege`);
    assert.equal(categories.haushalt_einkaeufe_vorraete.length, 13, `expected 13 task packages in ${ageGroup}/haushalt_einkaeufe_vorraete`);
  }
});

test('task package seed keeps localized structure and fills all prepared ages', () => {
  const { ownershipTaskPackageSeedByAgeGroup } = loadTsModule('data/ownershipTaskPackageTemplates.ts');
  const typeSrc = read('types/ownership.ts');
  const serviceSrc = read('services/ownership.service.ts');

  assert.match(typeSrc, /details: LocalizedTextList;/);
  assert.match(serviceSrc, /function getOwnershipTaskPackageSeed\(ageGroup: AgeGroup, categoryKey: QuizCategory\)/);

  for (const ageGroup of ['0_1', '1_3', '3_6', '6_10', '10_plus']) {
    for (const items of Object.values(ownershipTaskPackageSeedByAgeGroup[ageGroup])) {
      for (const entry of items) {
        assert.ok(typeof entry.title.de === 'string' && entry.title.de.length > 0);
        assert.ok(Array.isArray(entry.details.de) && entry.details.de.length >= 1);
        assert.ok(Array.isArray(entry.details.en) && entry.details.en.length === 0);
        assert.ok(Array.isArray(entry.details.nl) && entry.details.nl.length === 0);
      }
    }
  }
});

test('task package service still normalizes details and seeds deterministic ids', () => {
  const src = read('services/ownership.service.ts');

  assert.match(src, /function normalizeTaskPackageTemplate\(template: TaskPackageTemplate\)/);
  assert.match(src, /details: entry\.details,/);
  assert.match(src, /const id = `\$\{ageGroup\}_\$\{categoryKey\}_\$\{index \+ 1\}`;/);
  assert.doesNotMatch(src, /const count = existingByCategory/);
});

test('admin task packages page supports age filter, language switch, detail lists and renamed display labels', () => {
  const src = read('app/admin/task-packages/page.tsx');
  const configSrc = read('components/test/test-config.ts');

  assert.match(src, /const ageGroups: AgeGroup\[] = \['0_1', '1_3', '3_6', '6_10', '10_plus'\];/);
  assert.match(src, /const locales: Locale\[] = \['de', 'en', 'nl'\];/);
  assert.match(src, /const \[activeLocale, setActiveLocale\] = useState<Locale>\('de'\);/);
  assert.match(src, /Details \(\{activeLocale\.toUpperCase\(\)\}\)/);
  assert.match(src, /template\.details\[activeLocale\] \|\| template\.details\.de \|\| \[\]/);
  assert.match(src, /updateDetail\(index, e\.target\.value\)/);
  assert.match(src, /resolveAgeGroupLabel\(draft\.ageGroup\)/);
  assert.match(configSrc, /return '6–12 Jahre';/);
  assert.match(configSrc, /return '12–18 Jahre';/);
});

test('seed includes the final fixed titles for every age range', () => {
  const { ownershipTaskPackageSeedByAgeGroup } = loadTsModule('data/ownershipTaskPackageTemplates.ts');

  assert.equal(ownershipTaskPackageSeedByAgeGroup['0_1'].betreuung_entwicklung[0].title.de, 'Schlafrhythmus im Blick behalten');
  assert.equal(ownershipTaskPackageSeedByAgeGroup['1_3'].betreuung_entwicklung[0].title.de, 'Schlaf, Pausen und Tagesablauf planen');
  assert.equal(ownershipTaskPackageSeedByAgeGroup['3_6'].gesundheit[0].title.de, 'Vorsorge, Impfungen und Zahnarzt nachhalten');
  assert.equal(ownershipTaskPackageSeedByAgeGroup['6_10'].haushalt_einkaeufe_vorraete[0].title.de, 'Schulmaterial rechtzeitig ergänzen');
  assert.equal(ownershipTaskPackageSeedByAgeGroup['10_plus'].babyalltag_pflege[0].title.de, 'Essen, Trinken und Tagesstruktur im Blick behalten');
});
