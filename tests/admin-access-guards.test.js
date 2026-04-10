const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (filePath) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');

test('admin layout redirects unauthenticated and non-admin users', () => {
  const src = read('app/admin/layout.tsx');
  assert.match(src, /redirect\('\/login\?redirectTo=\/admin'\)/);
  assert.match(src, /redirect\('\/app\/home'\)/);
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

test('admin user delete delegates to the centralized delete service', () => {
  const src = read('app/api/admin/users/[userId]/route.ts');
  assert.match(src, /executeUserDeletion/);
  assert.match(src, /mode: 'admin'/);
  assert.match(src, /alreadyDeleted/);
});

test('centralized user delete keeps last-admin protection and tolerates missing auth user', () => {
  const src = read('services/server/user-delete.service.ts');
  assert.match(src, /user_delete\/last_admin/);
  assert.match(src, /auth\/user-not-found/);
  assert.match(src, /alreadyDeleted/);
});

test('admin profile helper requires an active account in addition to adminRole', () => {
  const src = read('services/user-profile.service.ts');
  assert.match(src, /resolveAdminRole\(profile\) === 'admin' && resolveAccountStatus\(profile\) === 'active'/);
});
