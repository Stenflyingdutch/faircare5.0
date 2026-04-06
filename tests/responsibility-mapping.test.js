const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('Responsibility mapping preserves partial legacy schema and document ID', () => {
  const src = read('services/responsibilities.service.ts');

  assert.match(src, /const assignedTo = card\.assignedTo \?\? \(card\.ownerUserId === currentUserId \? 'user' : card\.ownerUserId \? 'partner' : null\);/);
  assert.match(src, /const priority = card\.priority \?\? priorityMapOldToNew\[card\.focusLevel \?\? 'later'\] \?\? 'observe';/);
  assert.match(src, /const card = \{ \.{3}\(doc\.data\(\) as OwnershipCardDocument\), id: doc\.id \};/);
  assert.match(src, /return mapCardToResponsibility\(card, userId\);/);
});

test('Start listener filters responsibilities to current user only', () => {
  const src = read('services/responsibilities.service.ts');

  assert.match(src, /\.filter\(\(resp\): resp is Responsibility => resp !== null\)\s*\.filter\(\(resp\) => resp\.assignedTo === 'user'\);/);
});

test('Fallback categories are merged into Aufteilen filter results', () => {
  const src = read('services/responsibilities.service.ts');

  assert.match(src, /export function mergeResponsibilitiesWithCatalogFallback\(/);
  assert.match(src, /buildCatalogFallbackResponsibilities\(categoryKey, locale\)/);
  assert.match(src, /assignedTo: 'unassigned'/);
});

test('Unassigned fallback cards use visible text in assign mode', () => {
  const src = read('components/home/ResponsibilityCard.tsx');

  assert.match(src, /const textColor = mode === 'start'\s*\? priorityConfig\[responsibility\.priority\]\.text\s*:\s*responsibility\.assignedTo === 'unassigned'\s*\? 'var\(--color-text-primary\)'\s*:\s*'#FFFFFF';/);
});

test('Ownership dashboard ensures missing category cards even when some cards already exist', () => {
  const src = read('app/app/ownership-dashboard/page.tsx');

  assert.match(src, /if \(!categoryKeys\.length\) return;/);
  assert.doesNotMatch(src, /if \(!categoryKeys\.length \|\| cards\.length > 0\) return;/);
  assert.match(src, /ensureOwnershipCardsForCategories\({/);
});

test('OwnershipBoard uses catalog fallbacks for empty dashboard categories', () => {
  const src = read('components/ownership/OwnershipBoard.tsx');

  assert.match(src, /buildCatalogOwnershipCards\(/);
  assert.match(src, /const cardsForCategory = list\.length > 0 \|\| mode === 'home'\s*\? list\s*:\s*buildCatalogOwnershipCards\(category\);/);
});
