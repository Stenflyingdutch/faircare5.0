const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('OwnershipBoard sends explicit activation patch only for activation toggle', () => {
  const src = read('components/ownership/OwnershipBoard.tsx');

  assert.match(src, /buildOwnershipActivationPatch\(nextActive\)/);
  assert.match(src, /buildOwnershipOwnerPatch\(nextOwner\)/);
  assert.match(src, /buildOwnershipFocusPatch\(nextLevel\)/);
  assert.match(src, /buildOwnershipMetaPatch\(\{/);

  assert.doesNotMatch(src, /isActive:\s*resolveCardIsActive\(card\)/);
});

test('upsertOwnershipCard supports partial updates and does not require isActive for unrelated updates', () => {
  const src = read('services/ownership.service.ts');

  assert.match(src, /payload:\s*Partial<Pick<OwnershipCardDocument/);
  assert.match(src, /if \(!existing\.exists\(\)\) \{/);
  assert.match(src, /nextPayload\.isActive = params\.payload\.isActive \?\? false;/);

  // For update path we should not force-write isActive from stale snapshots.
  assert.doesNotMatch(src, /isActive:\s*params\.payload\.isActive,\s*\n\s*isDeleted/s);
});

test('owner/focus/meta helper patches are field-selective', () => {
  const src = read('services/ownershipCardPayloads.ts');

  assert.match(src, /export function buildOwnershipOwnerPatch\(ownerUserId: string \| null\)/);
  assert.match(src, /return \{ ownerUserId \};/);

  assert.match(src, /export function buildOwnershipFocusPatch\(focusLevel: OwnershipFocusLevel \| null\)/);
  assert.match(src, /return \{ focusLevel \};/);

  assert.match(src, /export function buildOwnershipMetaPatch\(input: \{ title: string; note: string \}\)/);
  assert.match(src, /title: input\.title/);
  assert.match(src, /note: input\.note/);
});
