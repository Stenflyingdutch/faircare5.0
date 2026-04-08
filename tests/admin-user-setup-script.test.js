const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('admin setup script does not hardcode credentials and requires runtime arguments', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'scripts/upsert-admin-user.mjs'), 'utf8');
  assert.match(src, /ADMIN_USER_PASSWORD/);
  assert.match(src, /readArg\('--password'\)/);
  assert.match(src, /--grant-only/);
  assert.match(src, /ADMIN_GRANT_ONLY/);
  assert.doesNotMatch(src, /CatsGoesMax2026!/);
  assert.doesNotMatch(src, /tenijenhuis@gmail\.com/);
});
