const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const partnerFlowSrc = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');
const invitePageSrc = fs.readFileSync(path.join(process.cwd(), 'app/invite/[token]/page.tsx'), 'utf8');

test('invite lookup supports legacy plain token docs before tokenHash fallback', () => {
  assert.match(partnerFlowSrc, /const hashFields = \['tokenHash', 'inviteTokenHash', 'token_hash'\]/);
  assert.match(partnerFlowSrc, /const plainTokenFields = \['token', 'inviteToken'\]/);
  assert.match(partnerFlowSrc, /doc\(db, firestoreCollections\.invitations, normalizedToken\)/);
});

test('invite lookup distinguishes lookup failures from truly invalid links', () => {
  assert.match(partnerFlowSrc, /status: 'error'/);
  assert.match(partnerFlowSrc, /reason: 'lookup_failed'/);
  assert.match(invitePageSrc, /setStatus\('error'\)/);
  assert.match(invitePageSrc, /Der Einladungslink konnte gerade nicht geprüft werden/);
});

test('partner session falls back to questionIds when legacy invites have no snapshot', () => {
  assert.match(partnerFlowSrc, /invitation\.questionSetSnapshot\?\.length/);
  assert.match(partnerFlowSrc, /invitation\.questionIds\?\.length \? await getQuestionSnapshot\(invitation\.questionIds\)/);
  assert.match(partnerFlowSrc, /questionSetId: invitation\.questionSetId \?\? `invite-\$\{invitation\.id\}`/);
});
