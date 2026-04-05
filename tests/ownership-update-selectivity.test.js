const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('OwnershipBoard sends field-selective patches for owner/focus/meta updates', () => {
  const src = read('components/ownership/OwnershipBoard.tsx');

  assert.match(src, /updateOwnershipCardOwner\(\{/);
  assert.match(src, /updateOwnershipCardFocus\(\{/);
  assert.match(src, /updateOwnershipCardMeta\(\{/);

  assert.doesNotMatch(src, /isActive:\s*resolveCardIsActive\(card\)/);
  assert.doesNotMatch(src, /\{\s*\.\.\.card,/);
});

test('ownership update path uses patch updates (no generic full-card upsert path)', () => {
  const src = read('services/ownership.service.ts');

  assert.match(src, /async function patchOwnershipCard/);
  assert.match(src, /await updateDoc\(cardRef, updatePayload\)/);
  assert.doesNotMatch(src, /export async function upsertOwnershipCard/);
});

test('service wrappers are field-selective (owner/focus/meta/activation)', () => {
  const src = read('services/ownership.service.ts');

  const ownerBlock = src.match(/export async function updateOwnershipCardOwner[\s\S]*?\n}\n\nexport async function updateOwnershipCardFocus/);
  assert.ok(ownerBlock, 'owner wrapper block not found');
  assert.match(ownerBlock[0], /ownerUserId: params\.patch\.ownerUserId/);
  assert.doesNotMatch(ownerBlock[0], /isActive:/);

  const focusBlock = src.match(/export async function updateOwnershipCardFocus[\s\S]*?\n}\n\nexport async function toggleOwnershipCardActive/);
  assert.ok(focusBlock, 'focus wrapper block not found');
  assert.match(focusBlock[0], /focusLevel: params\.patch\.focusLevel/);
  assert.doesNotMatch(focusBlock[0], /isActive:/);

  const metaBlock = src.match(/export async function updateOwnershipCardMeta[\s\S]*?\n}\n\nexport async function updateOwnershipCardOwner/);
  assert.ok(metaBlock, 'meta wrapper block not found');
  assert.match(metaBlock[0], /\.\.\.params\.patch/);
  assert.doesNotMatch(metaBlock[0], /isActive:/);

  const toggleBlock = src.match(/export async function toggleOwnershipCardActive[\s\S]*?\n}\n\nexport async function softDeleteOwnershipCard/);
  assert.ok(toggleBlock, 'toggle wrapper block not found');
  assert.match(toggleBlock[0], /isActive: params\.patch\.isActive/);
});

test('stale local snapshot cannot force isActive in unrelated owner update path', () => {
  const src = read('components/ownership/OwnershipBoard.tsx');
  const ownerUpdateBlock = src.match(/async function cycleOwner[\s\S]*?\n  }\n\n  function toggleCategory/);
  assert.ok(ownerUpdateBlock, 'cycleOwner block not found');
  assert.doesNotMatch(ownerUpdateBlock[0], /isActive:/);
});

test('type-level guard rails exist for ownership patch payload kinds', () => {
  const src = read('services/ownership.service.ts');
  assert.match(src, /export interface OwnershipCardOwnerPatch/);
  assert.match(src, /export interface OwnershipCardFocusPatch/);
  assert.match(src, /export interface OwnershipCardContentPatch/);
  assert.match(src, /export interface OwnershipCardActivationPatch/);
});

test('P1 regression guard: forbidden stale activation pattern is absent', () => {
  const board = read('components/ownership/OwnershipBoard.tsx');
  const service = read('services/ownership.service.ts');

  // Exact review snippet must never return.
  assert.doesNotMatch(board, /isActive:\s*resolveCardIsActive\(card\)/);

  // No broad helper with this name should exist in write path anymore.
  assert.doesNotMatch(service, /upsertOwnershipCard/);

  // Owner/Focus/Meta handlers should only send targeted patch keys.
  const metaCall = board.match(/updateOwnershipCardMeta\(\{[\s\S]*?\}\);/);
  assert.ok(metaCall);
  assert.match(metaCall[0], /patch:\s*\{\s*title:/);
  assert.match(metaCall[0], /note:/);
  assert.doesNotMatch(metaCall[0], /isActive:/);

  const ownerCall = board.match(/updateOwnershipCardOwner\(\{[\s\S]*?\}\);/);
  assert.ok(ownerCall);
  assert.match(ownerCall[0], /patch:\s*\{\s*ownerUserId:/);
  assert.doesNotMatch(ownerCall[0], /isActive:/);

  const focusCall = board.match(/updateOwnershipCardFocus\(\{[\s\S]*?\}\);/);
  assert.ok(focusCall);
  assert.match(focusCall[0], /patch:\s*\{\s*focusLevel:/);
  assert.doesNotMatch(focusCall[0], /isActive:/);
});
