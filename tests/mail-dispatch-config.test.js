const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('non-production recipient override is optional and no hardcoded fallback recipient is used', () => {
  const src = read('services/server/mail.service.ts');

  assert.match(src, /const overrideRecipient = process\.env\.TEST_EMAIL_OVERRIDE\?\.trim\(\);/);
  assert.match(src, /if \(!overrideRecipient\) {\s*return \{ actualRecipient: email, subjectPrefix: '\[TEST\] ' \};\s*}/);
  assert.doesNotMatch(src, /DEFAULT_TEST_RECIPIENT/);
});

