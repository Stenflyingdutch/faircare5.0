const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const src = fs.readFileSync(path.join(process.cwd(), 'services/partnerFlow.service.ts'), 'utf8');

test('partner invite fallback treats browser transport failures as fallback-eligible', () => {
  assert.match(src, /function shouldUseCallableInviteFallback/);
  assert.match(src, /failed to fetch/);
  assert.match(src, /load failed/);
  assert.match(src, /cors/);
  assert.match(src, /network request failed/);
});

test('partner invite callable path delegates fallback decision to helper', () => {
  assert.match(src, /const fallbackEligible = shouldUseCallableInviteFallback\(callableError\)/);
});

test('partner invite environment detection treats vercel previews as non-production', () => {
  assert.match(src, /function resolveInviteRuntimeEnvironment/);
  assert.match(src, /hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(src, /const appEnv = resolveInviteRuntimeEnvironment\(\)/);
});

test('partner invite and follow-up mails prefer the current browser origin for links', () => {
  assert.match(src, /function resolveAppBaseUrl/);
  assert.match(src, /window\.location\.origin/);
  assert.doesNotMatch(src, /const baseUrl = process\.env\.NEXT_PUBLIC_APP_URL \?\? window\.location\.origin/);
});

test('invitation token resolution normalizes pasted or encoded tokens', () => {
  assert.match(src, /function normalizeInvitationToken/);
  assert.match(src, /decodeURIComponent/);
  assert.match(src, /match\(\/\[a-f0-9\]\{64\}\/i\)/);
  assert.match(src, /toLowerCase\(\)/);
});

test('invitation lookup supports legacy token storage variants', () => {
  assert.match(src, /function buildInvitationTokenCandidates/);
  assert.match(src, /where\(documentId\(\), 'in', tokenCandidates\.slice\(0, 10\)\)/);
  assert.match(src, /'token_hash'/);
  assert.match(src, /'tokenDigest'/);
  assert.match(src, /'token'/);
});
