const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execSync } = require('node:child_process');
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

const forbiddenLegacyCategoryKey = ['termine', 'planung', 'absprachen'].join('_');

test('quiz catalog contains only the four final categories across all age groups', () => {
  const { quizCatalog } = loadTsModule('data/questionTemplates.ts');
  const keys = [...new Set(quizCatalog.categories.map((entry) => entry.key))];

  assert.deepEqual(keys, [
    'betreuung_entwicklung',
    'gesundheit',
    'babyalltag_pflege',
    'haushalt_einkaeufe_vorraete',
  ]);

  const ageGroups = ['0_1', '1_3', '3_6', '6_10', '10_plus'];
  for (const ageGroup of ageGroups) {
    const categories = quizCatalog.categories.filter((entry) => entry.ageGroup === ageGroup);
    assert.equal(categories.length, 4, `expected 4 categories for ${ageGroup}`);
    assert.ok(categories.every((entry) => entry.isActive), `expected all categories active for ${ageGroup}`);
  }

  const zeroToOneCare = quizCatalog.categories.find((entry) => entry.ageGroup === '0_1' && entry.key === 'babyalltag_pflege');
  const oneToThreeCare = quizCatalog.categories.find((entry) => entry.ageGroup === '1_3' && entry.key === 'babyalltag_pflege');
  const tenPlusCare = quizCatalog.categories.find((entry) => entry.ageGroup === '10_plus' && entry.key === 'babyalltag_pflege');

  assert.equal(zeroToOneCare.label.de, 'Babyalltag');
  assert.equal(oneToThreeCare.label.de, 'Alltag');
  assert.equal(tenPlusCare.label.de, 'Alltag');
  assert.doesNotMatch(read('data/questionTemplates.ts'), /Inhalt folgt\./);
  assert.doesNotMatch(read('data/questionTemplates.ts'), new RegExp(forbiddenLegacyCategoryKey));
});

test('quiz catalog includes fully populated question sets for every non-baby age group', () => {
  const { quizCatalog } = loadTsModule('data/questionTemplates.ts');
  const questionCountByAge = Object.groupBy(quizCatalog.questions, (entry) => entry.ageGroup);

  assert.equal(questionCountByAge['0_1']?.length, 68);
  assert.equal(questionCountByAge['1_3']?.length, 60);
  assert.equal(questionCountByAge['3_6']?.length, 60);
  assert.equal(questionCountByAge['6_10']?.length, 60);
  assert.equal(questionCountByAge['10_plus']?.length, 60);

  const categories = ['betreuung_entwicklung', 'gesundheit', 'babyalltag_pflege', 'haushalt_einkaeufe_vorraete'];
  for (const ageGroup of ['1_3', '3_6', '6_10', '10_plus']) {
    for (const categoryKey of categories) {
      const questions = quizCatalog.questions.filter((entry) => entry.ageGroup === ageGroup && entry.categoryKey === categoryKey);
      assert.equal(questions.length, 15, `expected 15 questions in ${ageGroup}/${categoryKey}`);
      assert.ok(questions.every((entry) => entry.isActive), `expected active questions in ${ageGroup}/${categoryKey}`);
    }
  }

  const selectedTexts = quizCatalog.questions.map((entry) => entry.questionText.de);
  assert.ok(selectedTexts.includes('Wer hält den Überblick über Rhythmus, Entwicklung und passende Begleitung?'));
  assert.ok(selectedTexts.includes('Wer hält den Überblick über Entwicklung, Begleitung und passende Unterstützung?'));
  assert.ok(selectedTexts.includes('Wer hält den Überblick über die täglichen Bedürfnisse und Routinen des Jugendlichen?'));
});

test('stress/admin-facing options use the existing keys with updated labels', () => {
  const { ageGroupOptions, stressOptions, resolveAgeGroupLabel } = loadTsModule('components/test/test-config.ts');
  const typeSrc = read('types/quiz.ts');

  assert.doesNotMatch(typeSrc, new RegExp(forbiddenLegacyCategoryKey));

  assert.equal(resolveAgeGroupLabel('6_10'), '6–12 Jahre');
  assert.equal(resolveAgeGroupLabel('10_plus'), '12–18 Jahre');
  assert.equal(ageGroupOptions.find((entry) => entry.value === '6_10')?.label, '6–12 Jahre');
  assert.equal(ageGroupOptions.find((entry) => entry.value === '10_plus')?.label, '12–18 Jahre');
  assert.equal(stressOptions.find((entry) => entry.value === 'babyalltag_pflege')?.label, 'Alltag');
  assert.equal(stressOptions.length, 5, 'expected 4 stress categories plus the none-option');
});

test('legacy 0_1 term question ids remain reassigned to valid categories', () => {
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
});

test('quiz generation/filtering stays category-driven and no longer hard-blocks later ages', () => {
  const generatorSrc = read('services/questionGenerator.ts');
  const validationSrc = read('services/catalogValidation.ts');
  const filterSrc = read('app/quiz/filter/page.tsx');
  const textsSrc = read('data/textBlocks.ts');

  assert.match(generatorSrc, /const categories = catalog\.categories[\s\S]*?\.map\(\(entry\) => entry\.key\);/);
  assert.match(validationSrc, /const validCategoryPairs = new Set\(fallback\.categories\.map/);
  assert.match(validationSrc, /const validCategoryKeys = new Set\(fallback\.categories\.map/);
  assert.match(validationSrc, /const questions = source\.questions\.filter\(\(entry\) => validCategoryKeys\.has\(entry\.categoryKey\)\);/);
  assert.doesNotMatch(filterSrc, /youngestAgeGroup !== '0_1'/);
  assert.match(textsSrc, /Für diese Altersgruppe konnten gerade keine passenden Fragen geladen werden\./);
});

test('productive source files no longer reference the removed term category', () => {
  try {
    const output = execSync(
      `rg -n "${forbiddenLegacyCategoryKey}" app components data services types`,
      { cwd: repoRoot, encoding: 'utf8' },
    ).trim();
    assert.equal(output, '');
  } catch (error) {
    assert.equal(error.status, 1);
    assert.equal(error.stdout, '');
  }
});
