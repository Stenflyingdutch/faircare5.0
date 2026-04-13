const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (filePath) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');

const partnerFlowSrc = read('services/partnerFlow.service.ts');
const unlockRouteSrc = read('app/api/partner/unlock-results/route.ts');
const finalizeServiceSrc = read('services/server/partner-registration.service.ts');
const invitePageSrc = read('app/invite/[token]/page.tsx');
const reviewResultsSrc = read('components/review/ReviewResultsContent.tsx');

test('unlock uses an authenticated server endpoint instead of blocked client-side family result queries', () => {
  assert.match(partnerFlowSrc, /fetch\('\/api\/partner\/unlock-results'/);
  assert.match(unlockRouteSrc, /verifyAdminSessionCookie/);
  assert.match(finalizeServiceSrc, /export async function unlockJointResultsWithAdmin/);
  assert.match(finalizeServiceSrc, /fetchResultByFamilyAndRole\(familyId, 'partner'\)/);
  assert.match(finalizeServiceSrc, /initiator\.results\.generate\.start/);
  assert.match(finalizeServiceSrc, /initiator\.results\.generate\.success/);
  assert.match(finalizeServiceSrc, /initiator\.results\.generate\.failed/);
  assert.doesNotMatch(partnerFlowSrc, /const partnerResult = await fetchResultByRole\(profile\.familyId, 'partner'\)/);
});

test('dashboard logs the first family read and resolves names from safe family snapshots', () => {
  assert.match(partnerFlowSrc, /initiator\.dashboard\.load\.start/);
  assert.match(partnerFlowSrc, /initiator\.dashboard\.first_read\.start/);
  assert.match(partnerFlowSrc, /initiator\.dashboard\.first_read\.success/);
  assert.match(partnerFlowSrc, /initiator\.dashboard\.first_read\.failed/);
  assert.match(partnerFlowSrc, /initiatorDisplayName = family\.initiatorDisplayName/);
  assert.match(partnerFlowSrc, /partnerDisplayName = family\.partnerDisplayName/);
  assert.match(partnerFlowSrc, /shouldReadInitiatorProfile/);
  assert.match(partnerFlowSrc, /shouldReadPartnerProfile/);
  assert.match(partnerFlowSrc, /family_profile_read\.start/);
  assert.match(partnerFlowSrc, /family_profile_read\.success/);
  assert.match(partnerFlowSrc, /family_profile_read\.failed/);
  assert.match(partnerFlowSrc, /skipped_optional_permission_denied/);
  assert.doesNotMatch(partnerFlowSrc, /fetchAppUserProfile\(family\.initiatorUserId\)/);
  assert.doesNotMatch(partnerFlowSrc, /fetchAppUserProfile\(family\.partnerUserId\)/);
});

test('invite landing and joint result labels avoid counterpart user document reads', () => {
  assert.doesNotMatch(invitePageSrc, /fetchAppUserProfile\(invitation\.initiatorUserId\)/);
  assert.match(invitePageSrc, /counterpartName: normalizeName\(invitation\.initiatorDisplayName\) \|\| 'Initiator'/);
  assert.match(reviewResultsSrc, /const initiatorFallback = bundle\.profile\?\.role === 'initiator' \? ownDisplayName \?\? 'Initiator' : 'Initiator'/);
  assert.match(reviewResultsSrc, /const partnerFallback = bundle\.profile\?\.role === 'partner'/);
});
