const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const inviteEntrySrc = fs.readFileSync(path.join(process.cwd(), 'app/invite/page.tsx'), 'utf8');
const inviteTokenPageSrc = fs.readFileSync(path.join(process.cwd(), 'app/invite/[token]/page.tsx'), 'utf8');
const partnerFlowSrc = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');
const mailServiceSrc = fs.readFileSync(path.join(process.cwd(), 'services/server/mail.service.ts'), 'utf8');

test('legacy invite query links are redirected to token path route', () => {
  assert.match(inviteEntrySrc, /resolvedSearchParams\?\.token/);
  assert.match(inviteEntrySrc, /sanitizeInvitationToken\(rawToken\)/);
  assert.match(inviteEntrySrc, /redirect\(`\/invite\/\$\{encodeURIComponent\(token\)\}`\)/);
});

test('invite page keeps invalid-state messaging distinct from transient lookup failures', () => {
  assert.match(inviteTokenPageSrc, /setReason\('lookup_failed'\)/);
  assert.match(inviteTokenPageSrc, /reason === 'lookup_failed'/);
  assert.match(inviteTokenPageSrc, /Die Einladung konnte gerade nicht geprüft werden/);
});

test('invite base-url resolution prefers Vercel production custom domain over deployment url', () => {
  assert.match(partnerFlowSrc, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(mailServiceSrc, /VERCEL_PROJECT_PRODUCTION_URL/);
});
