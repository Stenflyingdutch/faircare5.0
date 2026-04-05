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

  assert.match(src, /toggleOwnershipCardActive\(\{/);
  assert.match(src, /updateOwnershipCardOwner\(\{/);
  assert.match(src, /updateOwnershipCardFocus\(\{/);
  assert.match(src, /updateOwnershipCardMeta\(\{/);

  assert.doesNotMatch(src, /isActive:\s*resolveCardIsActive\(card\)/);
  assert.doesNotMatch(src, /\{\s*\.\.\.card,/);
});

test('upsertOwnershipCard supports partial updates and does not require isActive for unrelated updates', () => {
  const src = read('services/ownership.service.ts');

  assert.match(src, /payload:\s*Partial<Pick<OwnershipCardDocument/);
  assert.match(src, /if \(!existing\.exists\(\)\) \{/);
  assert.match(src, /nextPayload\.isActive = params\.payload\.isActive \?\? false;/);

  // For update path we should not force-write isActive from stale snapshots.
  assert.doesNotMatch(src, /isActive:\s*params\.payload\.isActive,\s*\n\s*isDeleted/s);
});

test('service wrappers are field-selective (owner/focus/meta/activation)', () => {
  const src = read('services/ownership.service.ts');

  const ownerBlock = src.match(/export async function updateOwnershipCardOwner[\s\S]*?\n}\n\nexport async function updateOwnershipCardFocus/);
  assert.ok(ownerBlock, 'owner wrapper block not found');
  assert.match(ownerBlock[0], /ownerUserId: params\.ownerUserId/);
  assert.doesNotMatch(ownerBlock[0], /isActive:/);

  const focusBlock = src.match(/export async function updateOwnershipCardFocus[\s\S]*?\n}\n\nexport async function toggleOwnershipCardActive/);
  assert.ok(focusBlock, 'focus wrapper block not found');
  assert.match(focusBlock[0], /focusLevel: params\.focusLevel/);
  assert.doesNotMatch(focusBlock[0], /isActive:/);

  const metaBlock = src.match(/export async function updateOwnershipCardMeta[\s\S]*?\n}\n\nexport async function updateOwnershipCardOwner/);
  assert.ok(metaBlock, 'meta wrapper block not found');
  assert.match(metaBlock[0], /title: params\.title/);
  assert.match(metaBlock[0], /note: params\.note/);
  assert.doesNotMatch(metaBlock[0], /isActive:/);

  const toggleBlock = src.match(/export async function toggleOwnershipCardActive[\s\S]*?\n}\n\nexport async function softDeleteOwnershipCard/);
  assert.ok(toggleBlock, 'toggle wrapper block not found');
  assert.match(toggleBlock[0], /isActive: params\.isActive/);
});

test('stale local snapshot cannot force isActive in unrelated owner update path', () => {
  const src = read('components/ownership/OwnershipBoard.tsx');
  const ownerUpdateBlock = src.match(/async function cycleOwner[\s\S]*?\n  }\n\n  async function setCardActivation/);
  assert.ok(ownerUpdateBlock, 'cycleOwner block not found');
  assert.doesNotMatch(ownerUpdateBlock[0], /isActive:/);
});
