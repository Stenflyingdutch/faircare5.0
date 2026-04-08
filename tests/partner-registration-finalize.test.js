const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const partnerFlowSrc = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');
const authServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/auth.service.ts'), 'utf8');
const finalizeRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/partner/finalize-registration/route.ts'), 'utf8');
const unlockRouteSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/partner/unlock-results/route.ts'), 'utf8');
const finalizeServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/server/partner-registration.service.ts'), 'utf8');

test('partner registration finalization is routed through a server endpoint', () => {
  assert.match(partnerFlowSrc, /fetch\('\/api\/partner\/finalize-registration'/);
  assert.match(partnerFlowSrc, /credentials: 'same-origin'/);
  assert.match(finalizeRouteSrc, /verifyAdminSessionCookie/);
  assert.match(finalizeRouteSrc, /partner_registration\/unauthorized/);
});

test('server-side partner finalization marks invites accepted and writes with admin db', () => {
  const plainTokenLookupIndex = finalizeServiceSrc.indexOf("for (const field of ['token', 'inviteToken'])");
  const tokenHashLookupIndex = finalizeServiceSrc.indexOf("for (const field of ['tokenHash', 'inviteTokenHash', 'token_hash'])");
  assert.ok(plainTokenLookupIndex > -1, 'plain token lookup should exist');
  assert.ok(tokenHashLookupIndex > -1, 'token hash lookup should exist');
  assert.ok(plainTokenLookupIndex < tokenHashLookupIndex, 'server should resolve plain token before token hash');
  assert.match(finalizeServiceSrc, /adminDb\.runTransaction/);
  assert.match(finalizeServiceSrc, /collection\(firestoreCollections\.invitations\)\.doc\(invitation\.id\)/);
  assert.match(finalizeServiceSrc, /status: 'accepted'/);
  assert.match(finalizeServiceSrc, /acceptedAt: createdAt/);
  assert.match(finalizeServiceSrc, /partnerDisplayName:/);
});

test('joint result unlock is routed through a session-protected server endpoint', () => {
  assert.match(partnerFlowSrc, /fetch\('\/api\/partner\/unlock-results'/);
  assert.match(unlockRouteSrc, /verifyAdminSessionCookie/);
  assert.match(unlockRouteSrc, /partner_unlock\/unauthorized/);
  assert.match(finalizeServiceSrc, /PartnerFlowAdminError/);
  assert.match(finalizeServiceSrc, /unlockJointResultsWithAdmin/);
});

test('initiator unlock mails emit structured trigger and send diagnostics', () => {
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.trigger_check/);
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.trigger_reached/);
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.prepare\.start/);
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.prepare\.success/);
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.send\.start/);
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.send\.success/);
  assert.match(finalizeServiceSrc, /invite\.unlock_mail\.send\.failed/);
  assert.match(finalizeServiceSrc, /validateMailConfig\(\)/);
  assert.match(finalizeServiceSrc, /resolveRecipient\(initiatorProfile\.email\)/);
});

test('registration error handling exposes partner finalization and session sync failures', () => {
  assert.match(authServiceSrc, /auth\/session-sync-failed/);
  assert.match(authServiceSrc, /code\?\.startsWith\('partner_registration\/'\)/);
  assert.match(authServiceSrc, /Deine Anmeldung konnte nicht bestätigt werden/);
  assert.match(authServiceSrc, /auth\/operation-not-allowed/);
  assert.match(authServiceSrc, /auth\/network-request-failed/);
  assert.match(authServiceSrc, /auth\/too-many-requests/);
  assert.match(authServiceSrc, /auth\/quota-exceeded/);
  assert.match(authServiceSrc, /auth\/unauthorized-domain/);
  assert.match(authServiceSrc, /Registrierung mit Firebase fehlgeschlagen/);
  assert.match(partnerFlowSrc, /partner_registration\/network_failed/);
});
