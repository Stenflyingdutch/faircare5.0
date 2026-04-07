const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const partnerFlowSrc = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');
const authServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/auth.service.ts'), 'utf8');
const finalizeRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/partner/finalize-registration/route.ts'), 'utf8');
const finalizeServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/server/partner-registration.service.ts'), 'utf8');

test('partner registration finalization is routed through a server endpoint', () => {
  assert.match(partnerFlowSrc, /fetch\('\/api\/partner\/finalize-registration'/);
  assert.match(partnerFlowSrc, /credentials: 'same-origin'/);
  assert.match(finalizeRouteSrc, /verifyAdminSessionCookie/);
  assert.match(finalizeRouteSrc, /partner_registration\/unauthorized/);
});

test('server-side partner finalization marks invites accepted and writes with admin db', () => {
  assert.match(finalizeServiceSrc, /adminDb\.runTransaction/);
  assert.match(finalizeServiceSrc, /collection\(firestoreCollections\.invitations\)\.doc\(invitation\.id\)/);
  assert.match(finalizeServiceSrc, /status: 'accepted'/);
  assert.match(finalizeServiceSrc, /acceptedAt: createdAt/);
});

test('registration error handling exposes partner finalization and session sync failures', () => {
  assert.match(authServiceSrc, /auth\/session-sync-failed/);
  assert.match(authServiceSrc, /code\?\.startsWith\('partner_registration\/'\)/);
  assert.match(authServiceSrc, /Deine Anmeldung konnte nicht bestätigt werden/);
});
