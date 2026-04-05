const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('admin routes enforce server-side admin check', () => {
  const usersRoute = read('app/api/admin/users/route.ts');
  const suspendRoute = read('app/api/admin/users/[userId]/suspend/route.ts');
  const deleteRoute = read('app/api/admin/users/[userId]/route.ts');

  assert.match(usersRoute, /requireAdmin/);
  assert.match(suspendRoute, /requireAdmin/);
  assert.match(deleteRoute, /requireAdmin/);
});

test('admin UI includes user management page with search, sort and critical actions', () => {
  const usersPage = read('app/admin/users/page.tsx');

  assert.match(usersPage, /Admin · User Management/);
  assert.match(usersPage, /placeholder="Name oder E-Mail"/);
  assert.match(usersPage, /Sortieren nach/);
  assert.match(usersPage, /Entsperren|Sperren/);
  assert.match(usersPage, /Endgültig löschen/);
  assert.match(usersPage, /window\.confirm/);
});

test('deletion flow has guard rails for admin self-delete and last-admin protection', () => {
  const service = read('services/server/admin/user-management.service.ts');

  assert.match(service, /Du kannst dein eigenes Admin-Konto nicht löschen/);
  assert.match(service, /Der letzte Admin kann nicht gelöscht werden/);
  assert.match(service, /updateAuthUserState\(params\.userId, true\)/);
  assert.match(service, /deleteAuthUser\(params\.userId\)/);
});

test('firestore rules block suspended users and limit user management to admins', () => {
  const rules = read('firestore.rules');

  assert.match(rules, /function isSuspended\(\)/);
  assert.match(rules, /function isActiveSignedIn\(\)/);
  assert.match(rules, /allow read: if isSelf\(userId\) \|\| isAdmin\(\)/);
  assert.match(rules, /match \/adminAuditLogs\/{logId}/);
});
