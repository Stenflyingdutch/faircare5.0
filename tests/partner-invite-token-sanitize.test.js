const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const partnerFlowSrc = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');
const invitePageSrc = fs.readFileSync(path.join(process.cwd(), 'app/invite/[token]/page.tsx'), 'utf8');

test('invitation tokens are sanitized before hash lookup', () => {
  assert.match(partnerFlowSrc, /export function sanitizeInvitationToken/);
  assert.match(partnerFlowSrc, /const normalizedToken = sanitizeInvitationToken\(token\)/);
  assert.match(partnerFlowSrc, /tokenCandidates = Array\.from\(new Set\(\[normalizedToken, normalizedToken\.toLowerCase\(\)\]\)\)/);
});

test('token sanitizer extracts token from full invite URLs and query params', () => {
  assert.match(partnerFlowSrc, /parsed\.searchParams\.get\('token'\)/);
  assert.match(partnerFlowSrc, /const segments = parsed\.pathname\.split\('\/'\)\.filter\(Boolean\)/);
  assert.match(partnerFlowSrc, /token = segments\.at\(-1\) \?\? token/);
});

test('invite landing page normalizes route token before resolving invitations', () => {
  assert.match(invitePageSrc, /sanitizeInvitationToken\(params\?\.token\)/);
});
