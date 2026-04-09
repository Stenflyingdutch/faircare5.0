const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const resetRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/auth/password-reset/route.ts'), 'utf8');
const forgotPasswordPageSrc = fs.readFileSync(path.join(process.cwd(), 'app/forgot-password/page.tsx'), 'utf8');
const resetPasswordPageSrc = fs.readFileSync(path.join(process.cwd(), 'app/reset-password/page.tsx'), 'utf8');
const authServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/auth.service.ts'), 'utf8');

test('password reset api validates config and uses firebase admin reset link generation', () => {
  assert.match(resetRouteSrc, /PASSWORD_RESET_ERROR_CODE = 'auth\/password-reset-config-invalid'/);
  assert.match(resetRouteSrc, /adminAuth\.generatePasswordResetLink/);
  assert.match(resetRouteSrc, /reason: 'missing app url'/);
  assert.match(resetRouteSrc, /reason: 'firebase authorized domain likely missing'/);
  assert.match(resetRouteSrc, /dispatchMail\(\{/);
  assert.match(resetRouteSrc, /type: 'password_reset'/);
  assert.match(resetRouteSrc, /const resetUrl = `\$\{actionUrl\}\?mode=resetPassword&oobCode=/);
});

test('client reset request uses dedicated api endpoint and maps config errors', () => {
  assert.match(authServiceSrc, /'\/api\/auth\/password-reset'/);
  assert.match(authServiceSrc, /auth\/password-reset-config-invalid/);
  assert.match(authServiceSrc, /auth\/password-reset-delivery-failed/);
});

test('forgot-password and reset-password routes exist with form handling', () => {
  assert.match(forgotPasswordPageSrc, /Passwort vergessen/);
  assert.match(forgotPasswordPageSrc, /requestPasswordReset/);
  assert.match(resetPasswordPageSrc, /confirmPasswordReset/);
  assert.match(resetPasswordPageSrc, /verifyPasswordResetCode/);
  assert.match(resetPasswordPageSrc, /mode === 'resetPassword'/);
});
