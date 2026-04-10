const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const registerAfterTestSrc = fs.readFileSync(path.join(process.cwd(), 'app/register-after-test/page.tsx'), 'utf8');
const loginClientSrc = fs.readFileSync(path.join(process.cwd(), 'app/login/LoginPageClient.tsx'), 'utf8');
const forgotPasswordClientSrc = fs.readFileSync(path.join(process.cwd(), 'app/forgot-password/ForgotPasswordPageClient.tsx'), 'utf8');
const authServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/auth.service.ts'), 'utf8');
const authSessionRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/auth/session/route.ts'), 'utf8');
const mailRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/mail/route.ts'), 'utf8');

test('register-after-test supports both registration and login continuation for invites', () => {
  assert.match(registerAfterTestSrc, /const \[mode, setMode\] = useState<'register' \| 'login'>\('register'\)/);
  assert.match(registerAfterTestSrc, /mode === 'register'\s*\?\s*await registerUser\(email, password, \{ inviteContextPresent \}\)\s*:\s*await loginUser\(email, password\)/);
  assert.match(registerAfterTestSrc, /observeAuthState/);
  assert.match(registerAfterTestSrc, /continueWithActiveSession/);
  assert.match(registerAfterTestSrc, /mode === 'login' && activeSessionEmail/);
  assert.match(registerAfterTestSrc, /finalizeStarted\s*\?\s*resolvePostLoginBootstrapErrorMessage\(submitError\)\s*:\s*resolveLoginErrorMessage\(submitError\)/);
});

test('login routes to transparency while shared results are still locked', () => {
  assert.match(loginClientSrc, /const sharedResultsReleased = Boolean\(bundle\.family\?\.resultsUnlocked\)/);
  assert.match(loginClientSrc, /if \(!sharedResultsReleased\) \{\s*router\.push\('\/app\/transparenz'\);\s*return;\s*\}/);
});

test('forgot-password flow surfaces concrete firebase reset errors', () => {
  assert.match(forgotPasswordClientSrc, /resolvePasswordResetErrorMessage/);
  assert.match(forgotPasswordClientSrc, /setError\(resolvePasswordResetErrorMessage\(submitError\)\)/);
  assert.match(authServiceSrc, /export function resolvePasswordResetErrorMessage/);
});

test('auth session api wraps cookie creation failures with deterministic error response', () => {
  assert.match(authSessionRouteSrc, /auth\.session\.sync\.failed/);
  assert.match(authSessionRouteSrc, /Deine Anmeldung konnte nicht bestätigt werden\. Bitte versuche es erneut\./);
  assert.match(authSessionRouteSrc, /await request\.json\(\)\.catch\(\(\) => null\)/);
});

test('mail api requires authenticated session before dispatching provider calls', () => {
  assert.match(mailRouteSrc, /verifyAdminSessionCookie/);
  assert.match(mailRouteSrc, /mail\.dispatch\.unauthorized/);
  assert.match(mailRouteSrc, /code: 'mail_auth_unauthorized'/);
});
