const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (filePath) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');

test('admin layout redirects unauthenticated users', () => {
  const src = read('app/admin/layout.tsx');
  assert.match(src, /redirect\('\/login\?redirectTo=\/admin'\)/);
  assert.doesNotMatch(src, /redirect\('\/app\/home'\)/);
});

test('firestore rules use adminRole and accountStatus for admin access checks', () => {
  const src = read('firestore.rules');
  assert.match(src, /data\.adminRole == 'admin'/);
  assert.match(src, /accountStatus/);
  assert.match(src, /match \/questionPools\/\{docId\}/);
  assert.match(src, /match \/templates\/\{docId\}/);
});

test('admin user api protects the last admin from destructive actions', () => {
  const src = read('app/api/admin/users/[userId]/route.ts');
  assert.match(src, /Der letzte Admin kann nicht gesperrt, entmachtet oder gelöscht werden/);
  assert.match(src, /ensureNotLastAdmin/);
});

test('admin user delete supports auth-only users without a Firestore profile', () => {
  const src = read('app/api/admin/users/[userId]/route.ts');
  assert.match(src, /const \{ profile, authUser, userRef \} = await getAdminUserState\(userId\)/);
  assert.match(src, /if \(!profile && !authUser\)/);
  assert.match(src, /profile \? userRef\.delete\(\) : Promise\.resolve\(\)/);
  assert.match(src, /if \(authUser\) {\s+await adminAuth\.deleteUser\(userId\);/);
});
