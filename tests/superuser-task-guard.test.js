const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('superuser helper and firestore task gates exist', () => {
  const profileHelpers = read('services/user-profile.service.ts');
  const rules = read('firestore.rules');

  assert.match(profileHelpers, /export function isSuperuserProfile/);
  assert.match(profileHelpers, /resolveSuperuserFlag/);
  assert.match(rules, /function isSuperuser\(\)/);
  assert.match(rules, /match \/tasks\/\{taskId\}/);
  assert.match(rules, /match \/taskDelegations\/\{delegationId\}/);
  assert.match(rules, /isFamilyMember\(familyId\) && isSuperuser\(\)/);
  assert.match(rules, /!\('isSuperuser' in request\.resource\.data\)/);
});

test('task server access is tied to superuser + selected-date resolver', () => {
  const service = read('services/server/tasks.service.ts');
  const route = read('app/api/tasks/overview/route.ts');
  const taskChatService = read('services/server/task-chat.service.ts');

  assert.match(service, /if \(!isSuperuserProfile\(profile\)\)/);
  assert.match(service, /export async function getTasksForSelectedDate/);
  assert.match(service, /export async function getTaskOverviewForSelectedDate/);
  assert.match(route, /getTaskOverviewForSelectedDate/);
  assert.match(route, /SESSION_COOKIE_NAME/);
  assert.match(taskChatService, /collection\('conversationStates'\)/);
  assert.match(taskChatService, /collection\('inboxEntries'\)/);
});

test('admin user management exposes superuser toggle', () => {
  const adminUsersPage = read('app/admin/users/page.tsx');
  const adminUsersRoute = read('app/api/admin/users/[userId]/route.ts');

  assert.match(adminUsersPage, /Superuser/);
  assert.match(adminUsersPage, /Superuser geben/);
  assert.match(adminUsersPage, /Superuser entziehen/);
  assert.match(adminUsersRoute, /isSuperuser\?: boolean/);
  assert.match(adminUsersRoute, /isSuperuser: nextIsSuperuser/);
});
