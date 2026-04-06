const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('quiz catalog contains only the four final categories', () => {
  const src = read('data/questionTemplates.ts');
  const blueprintBlock = src.match(/const categoryBlueprints = \[(.*?)\] as const;/s);

  assert.ok(blueprintBlock, 'categoryBlueprints block not found');
  const keys = [...blueprintBlock[1].matchAll(/key: '([^']+)'/g)].map((match) => match[1]);

  assert.deepEqual(keys, [
    'betreuung_entwicklung',
    'gesundheit',
    'babyalltag_pflege',
    'haushalt_einkaeufe_vorraete',
  ]);
  assert.doesNotMatch(src, /termine_planung_absprachen/);
});

test('stress/admin-facing category options no longer expose the removed term category', () => {
  const typeSrc = read('types/quiz.ts');
  const configSrc = read('components/test/test-config.ts');

  assert.doesNotMatch(typeSrc, /termine_planung_absprachen/);
  assert.doesNotMatch(configSrc, /termine_planung_absprachen/);

  const stressBlock = configSrc.match(/export const stressOptions:[\s\S]*?=\s*\[(.*?)\];/s);
  assert.ok(stressBlock, 'stressOptions block not found');
  const stressOptionCount = (stressBlock[1].match(/value: '/g) || []).length;
  assert.equal(stressOptionCount, 5, 'expected 4 stress categories plus the none-option');
});

test('legacy term questions were either reassigned to valid categories or removed', () => {
  const src = read('data/questionTemplates.ts');

  assert.match(src, /q_0_1_termine_5/);
  assert.match(src, /q_0_1_termine_7/);
  assert.match(src, /q_0_1_termine_9/);
  assert.match(src, /q_0_1_termine_10/);
  assert.match(src, /q_0_1_termine_11/);
  assert.match(src, /q_0_1_termine_12/);
  assert.match(src, /q_0_1_termine_13/);
  assert.match(src, /q_0_1_termine_14/);

  assert.doesNotMatch(src, /'q_0_1_termine_1'/);
  assert.doesNotMatch(src, /'q_0_1_termine_2'/);
  assert.doesNotMatch(src, /'q_0_1_termine_3'/);
  assert.doesNotMatch(src, /'q_0_1_termine_4'/);
  assert.doesNotMatch(src, /'q_0_1_termine_6'/);
  assert.doesNotMatch(src, /'q_0_1_termine_8'/);
  assert.doesNotMatch(src, /'q_0_1_termine_15'/);

  assert.match(src, /Wer erkennt, wann Unterstützung durch Großeltern oder Babysitter sinnvoll ist\?/);
  assert.match(src, /Wer hat auf dem Schirm, was für unterwegs gebraucht wird\?/);
  assert.match(src, /Wer denkt rechtzeitig daran, wie Übergänge zwischen euch beiden gut funktionieren\?/);
  assert.doesNotMatch(src, /categoryKey:\s*''/);
});

test('quiz generation and catalog validation remain category-driven after cleanup', () => {
  const generatorSrc = read('services/questionGenerator.ts');
  const validationSrc = read('services/catalogValidation.ts');

  assert.match(generatorSrc, /const categories = catalog\.categories[\s\S]*?\.map\(\(entry\) => entry\.key\);/);
  assert.match(validationSrc, /const validCategoryPairs = new Set\(fallback\.categories\.map/);
  assert.match(validationSrc, /const validCategoryKeys = new Set\(fallback\.categories\.map/);
  assert.match(validationSrc, /const questions = source\.questions\.filter\(\(entry\) => validCategoryKeys\.has\(entry\.categoryKey\)\);/);
});

test('ownership task package seeds contain no term category anymore', () => {
  const src = read('data/ownershipTaskPackageTemplates.ts');

  assert.match(src, /ownershipTaskPackageSeedByAgeGroup/);
  assert.match(src, /'0_1': \{/);
  const keys = [...src.matchAll(/^    ([a-z_]+): \[/gm)].map((match) => match[1]);
  assert.deepEqual(keys, [
    'betreuung_entwicklung',
    'gesundheit',
    'babyalltag_pflege',
    'haushalt_einkaeufe_vorraete',
  ]);
  assert.doesNotMatch(src, /termine_planung_absprachen/);
});

test('productive source files no longer reference the removed term category', () => {
  try {
    const output = execSync(
      "rg -n \"termine_planung_absprachen|Termine, Planung & Absprachen\" app components data services types",
      { cwd: repoRoot, encoding: 'utf8' },
    ).trim();
    assert.equal(output, '');
  } catch (error) {
    assert.equal(error.status, 1);
    assert.equal(error.stdout, '');
  }
});
