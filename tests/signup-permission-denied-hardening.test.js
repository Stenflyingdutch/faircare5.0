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

test('signup debug helper logs auth state and invite context metadata without exposing tokens', () => {
  assert.match(signupDebugSrc, /hasAuthCurrentUser: Boolean\(currentUser\)/);
  assert.match(signupDebugSrc, /hasInviteContext: Boolean\(context\.inviteContextPresent\)/);
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
});

test('partner registration flow logs invite detection and technical finalize failures', () => {
  assert.match(registerAfterTestSrc, /invite_link_context\.detected/);
  assert.match(registerAfterTestSrc, /invite_link_context\.missing/);
  assert.match(registerAfterTestSrc, /signup\.finalize\.start/);
  assert.match(registerAfterTestSrc, /signup\.finalize\.success/);
  assert.match(registerAfterTestSrc, /signup\.finalize\.failed/);
});

test('auth creation and profile bootstrap log the exact Firestore steps behind permission-denied', () => {
  assert.match(authServiceSrc, /auth\.create_user\.start/);
  assert.match(authServiceSrc, /auth\.create_user\.success/);
  assert.match(authServiceSrc, /auth\.create_user\.failed/);
  assert.match(partnerFlowSrc, /user_doc\.read\.start/);
  assert.match(partnerFlowSrc, /user_doc\.read\.success/);
  assert.match(partnerFlowSrc, /user_doc\.read\.failed/);
  assert.match(partnerFlowSrc, /user_doc\.create\.start/);
  assert.match(partnerFlowSrc, /user_doc\.create\.success/);
  assert.match(partnerFlowSrc, /user_doc\.create\.failed/);
  assert.match(partnerFlowSrc, /family_doc\.create\.start/);
  assert.match(partnerFlowSrc, /family_doc\.create\.success/);
  assert.match(partnerFlowSrc, /family_doc\.create\.failed/);
});

test('firestore rules allow initial self-read for a missing users document but keep update guarded by active accounts', () => {
  assert.match(rulesSrc, /allow read: if \(isSelf\(userId\) && \(/);
  assert.match(rulesSrc, /!exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
  assert.match(rulesSrc, /allow update: if \(isSelf\(userId\) && isActiveAccount\(\)\) \|\| isAdmin\(\);/);
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
