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
