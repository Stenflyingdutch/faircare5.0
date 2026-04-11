const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const authServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/auth.service.ts'), 'utf8');
const passwordResetRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/auth/password-reset/route.ts'), 'utf8');
const passwordResetServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/server/password-reset.service.ts'), 'utf8');
const passwordResetLinkServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/password-reset-link.service.ts'), 'utf8');
const resetPageSrc = fs.readFileSync(path.join(process.cwd(), 'app/reset-password/ResetPasswordPageClient.tsx'), 'utf8');
const loginPageSrc = fs.readFileSync(path.join(process.cwd(), 'app/login/page.tsx'), 'utf8');
const loginClientSrc = fs.readFileSync(path.join(process.cwd(), 'app/login/LoginPageClient.tsx'), 'utf8');

test('forgot-password submits through the server-side password-reset route', () => {
  assert.match(authServiceSrc, /fetch\('\/api\/auth\/password-reset'/);
  assert.doesNotMatch(authServiceSrc, /sendPasswordResetEmail/);
});

test('password-reset API route delegates to server dispatch and hides account existence', () => {
  assert.match(passwordResetRouteSrc, /await dispatchPasswordResetEmail\(email\)/);
  assert.match(passwordResetRouteSrc, /Wenn ein Konto zu dieser E-Mail existiert, wurde ein Reset-Link versendet/);
});

test('server password-reset service generates a Firebase action link and rewrites it to the app reset route', () => {
  assert.match(passwordResetServiceSrc, /generatePasswordResetLink/);
  assert.match(passwordResetServiceSrc, /buildAppPasswordResetUrl/);
  assert.match(passwordResetServiceSrc, /type: 'password_reset'/);
});

test('password-reset base-url resolver falls back to production and rejects preview-style Vercel domains unless opted in', () => {
  assert.match(passwordResetLinkServiceSrc, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(passwordResetLinkServiceSrc, /preview_domain_requires_opt_in/);
  assert.match(passwordResetLinkServiceSrc, /source: 'vercel_project_production_url'/);
});

test('reset page sanitizes completion redirects and sends users back to login after success', () => {
  assert.match(resetPageSrc, /resolvePasswordResetCompletionPath\(continueUrl\)/);
  assert.match(resetPageSrc, /router\.replace\(successPath\)/);
  assert.match(resetPageSrc, /verifyPasswordResetCode/);
});

test('login page surfaces a success notice after a completed password reset', () => {
  assert.match(loginPageSrc, /reset === 'success'/);
  assert.match(loginClientSrc, /resetNotice && <p className="helper">/);
});
