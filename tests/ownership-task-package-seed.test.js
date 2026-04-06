const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('Ownership task package seed contains only the final 0_1 categories', () => {
  const src = read('data/ownershipTaskPackageTemplates.ts');
  const categoryKeys = [...src.matchAll(/^\s*([a-z_]+): \[/gm)].map((match) => match[1]);
  assert.deepEqual(categoryKeys, ['betreuung_entwicklung', 'gesundheit', 'babyalltag_pflege', 'haushalt_einkaeufe_vorraete']);
  assert.doesNotMatch(src, /termine_planung_absprachen/);

  const quizTypes = read('types/quiz.ts');
  assert.doesNotMatch(quizTypes, /termine_planung_absprachen/);

  const stressConfig = read('components/test/test-config.ts');
  assert.doesNotMatch(stressConfig, /termine_planung_absprachen/);
});

test('Ownership seed logic is restricted to age group 0_1', () => {
  const src = read('services/ownership.service.ts');
  assert.match(src, /if \(ageGroup !== '0_1'\) \{\s*return 0;\s*\}/);
});

test('Admin task packages page documents 0_1 only seeding', () => {
  const src = read('app/admin/task-packages/page.tsx');
  assert.match(src, /Standardpakete \(10 pro Kategorie\) für 0_1 ergänzen/);
  assert.match(src, /Das voreingestellte 0_1-Set ist nur für die Altersgruppe 0_1 verfügbar\./);
});
