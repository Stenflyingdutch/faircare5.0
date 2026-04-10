const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (filePath) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');

const registerSrc = read('app/register/page.tsx');
const registerAfterTestSrc = read('app/register-after-test/page.tsx');
const authServiceSrc = read('services/auth.service.ts');
const partnerFlowSrc = read('services/partnerFlow.service.ts');
const signupDebugSrc = read('services/signup-debug.service.ts');
const rulesSrc = read('firestore.rules');
const loginClientSrc = read('app/login/LoginPageClient.tsx');
const personalAreaShellSrc = read('components/personal/PersonalAreaShell.tsx');

test('signup debug helper logs auth state and invite context metadata without exposing tokens', () => {
  assert.match(signupDebugSrc, /hasAuthCurrentUser: Boolean\(currentUser\)/);
  assert.match(signupDebugSrc, /hasInviteContext: Boolean\(context\.inviteContextPresent\)/);
  assert.match(signupDebugSrc, /projectId: firebaseProjectId \?\? null/);
  assert.match(signupDebugSrc, /errorCode: \(error as \{ code\?: string \}\)\?\.code \?\? null/);
});

test('register flow emits explicit signup diagnostics and separates missing invite context', () => {
  assert.match(registerSrc, /signup\.submit\.start/);
  assert.match(registerSrc, /invite_link_context\.missing/);
  assert.match(registerSrc, /signup\.auth_state\.available/);
  assert.match(registerSrc, /signup\.auth_state\.missing/);
  assert.match(registerSrc, /signup\.finalize\.start/);
  assert.match(registerSrc, /signup\.finalize\.success/);
  assert.match(registerSrc, /signup\.finalize\.failed/);
  assert.match(registerSrc, /signup\.redirect\.start/);
  assert.match(registerSrc, /signup\.redirect\.target/);
  assert.match(registerSrc, /signup\.flow\.failed/);
});

test('partner registration flow logs invite detection and technical finalize failures', () => {
  assert.match(registerAfterTestSrc, /invite_link_context\.detected/);
  assert.match(registerAfterTestSrc, /invite_link_context\.missing/);
  assert.match(registerAfterTestSrc, /signup\.finalize\.start/);
  assert.match(registerAfterTestSrc, /signup\.finalize\.success/);
  assert.match(registerAfterTestSrc, /signup\.finalize\.failed/);
  assert.match(registerAfterTestSrc, /signup\.redirect\.start/);
  assert.match(registerAfterTestSrc, /signup\.redirect\.target/);
  assert.match(registerAfterTestSrc, /signup\.flow\.failed/);
});

test('auth creation and profile bootstrap log the exact Firestore steps behind permission-denied', () => {
  assert.match(authServiceSrc, /auth\.create_user\.start/);
  assert.match(authServiceSrc, /auth\.create_user\.success/);
  assert.match(authServiceSrc, /auth\.create_user\.failed/);
  assert.match(partnerFlowSrc, /user_doc\.read\.start/);
  assert.match(partnerFlowSrc, /user_doc\.read\.success/);
  assert.match(partnerFlowSrc, /user_doc\.read\.failed/);
  assert.match(partnerFlowSrc, /signup\.next_read\.start/);
  assert.match(partnerFlowSrc, /signup\.next_read\.success/);
  assert.match(partnerFlowSrc, /signup\.next_read\.failed/);
  assert.match(partnerFlowSrc, /user_profile\.create\.start/);
  assert.match(partnerFlowSrc, /user_profile\.create\.success/);
  assert.match(partnerFlowSrc, /user_profile\.create\.failed/);
  assert.match(partnerFlowSrc, /user_doc\.create\.start/);
  assert.match(partnerFlowSrc, /user_doc\.create\.success/);
  assert.match(partnerFlowSrc, /user_doc\.create\.failed/);
  assert.match(partnerFlowSrc, /family_doc\.create\.start/);
  assert.match(partnerFlowSrc, /family_doc\.create\.success/);
  assert.match(partnerFlowSrc, /family_doc\.create\.failed/);
});

test('profile bootstrap still attempts users write when initial self-read is denied on legacy rules', () => {
  assert.match(partnerFlowSrc, /if \(code === 'permission-denied' \|\| code === 'firestore\/permission-denied'\) \{/);
  assert.match(partnerFlowSrc, /existingSnapshot = null;/);
});

test('signup bootstrap reads own userResults by deterministic document id instead of a blocked collection query', () => {
  assert.match(partnerFlowSrc, /getDoc\(doc\(db, firestoreCollections\.userResults, userId\)\)/);
  assert.doesNotMatch(partnerFlowSrc, /collection\(db, firestoreCollections\.userResults\), where\('userId', '==', userId\), limit\(1\)/);
});

test('dashboard and initiator bootstrap fetch own quizResults via userId-constrained query', () => {
  assert.match(partnerFlowSrc, /where\('userId', '==', userId\)/);
  assert.match(partnerFlowSrc, /fetchOwnResultByRole\(userId, ownRole, familyId\)/);
  assert.match(partnerFlowSrc, /fetchOwnResultByRole\(userId, 'initiator', profile\.familyId\)/);
});

test('dashboard bootstrap emits explicit profile and family diagnostics for login forensics', () => {
  assert.match(partnerFlowSrc, /bootstrap\.dashboard\.load\.start/);
  assert.match(partnerFlowSrc, /bootstrap\.dashboard\.load\.success/);
  assert.match(partnerFlowSrc, /bootstrap\.dashboard\.load\.failed/);
  assert.match(partnerFlowSrc, /bootstrap\.user_profile\.read\.start/);
  assert.match(partnerFlowSrc, /bootstrap\.user_profile\.read\.success/);
  assert.match(partnerFlowSrc, /bootstrap\.user_profile\.read\.failed/);
  assert.match(partnerFlowSrc, /bootstrap\.family\.read\.start/);
  assert.match(partnerFlowSrc, /bootstrap\.family\.read\.success/);
  assert.match(partnerFlowSrc, /bootstrap\.family\.read\.failed/);
  assert.match(partnerFlowSrc, /bootstrap\.family\.read\.skipped_missing_family_id/);
});

test('personal area shell logs dedicated bootstrap read lifecycle around dashboard hydration', () => {
  assert.match(personalAreaShellSrc, /bootstrap\.personal_area\.read\.start/);
  assert.match(personalAreaShellSrc, /bootstrap\.personal_area\.read\.success/);
  assert.match(personalAreaShellSrc, /bootstrap\.personal_area\.read\.failed/);
});

test('firestore rules allow initial self-read for a missing users document while protecting admin fields on self writes', () => {
  assert.match(rulesSrc, /allow read: if \(isSelf\(userId\) && \(/);
  assert.match(rulesSrc, /!exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
  assert.match(rulesSrc, /allow create: if isSelf\(userId\)/);
  assert.match(rulesSrc, /!\('adminRole' in request\.resource\.data\)/);
  assert.match(rulesSrc, /!\('accountStatus' in request\.resource\.data\)/);
  assert.match(rulesSrc, /request\.resource\.data\.adminRole == resource\.data\.adminRole/);
  assert.match(rulesSrc, /request\.resource\.data\.accountStatus == resource\.data\.accountStatus/);
  assert.doesNotMatch(rulesSrc, /allow read,\s*write:\s*if true;/);
});

test('registration error mapping treats Firestore permission-denied as a technical failure instead of bad input', () => {
  assert.match(authServiceSrc, /code === 'permission-denied' \|\| code === 'firestore\/permission-denied'/);
  assert.match(authServiceSrc, /bevor dein Profil vollständig gespeichert werden konnte/);
});

test('login flow still repairs auth-only initiator accounts after a failed first profile bootstrap', () => {
  assert.match(loginClientSrc, /let bundle = await fetchDashboardBundle\(userId\)/);
  assert.match(loginClientSrc, /if \(bundle\.profile\?\.role !== 'partner' && !bundle\.profile\?\.familyId\) \{/);
  assert.match(loginClientSrc, /await ensureInitiatorFamilySetup\(userId\)/);
});

test('login flow separates auth failures from post-login bootstrap failures in the UI', () => {
  assert.match(authServiceSrc, /export function resolvePostLoginBootstrapErrorMessage/);
  assert.match(authServiceSrc, /Dein Login war erfolgreich, aber die zugehoerigen Familiendaten konnten nicht geladen werden/);
  assert.match(loginClientSrc, /resolvePostLoginBootstrapErrorMessage/);
  assert.match(loginClientSrc, /bootstrap\.session\.sync\.failed/);
  assert.match(loginClientSrc, /bootstrap\.dashboard\.load\.start/);
  assert.match(loginClientSrc, /bootstrap\.dashboard\.load\.failed/);
  assert.match(loginClientSrc, /login\.ui\.error\.set/);
  assert.match(loginClientSrc, /phase: 'auth'/);
  assert.match(loginClientSrc, /phase: 'bootstrap'/);
});
