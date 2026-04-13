const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('new tasks are persisted with private visibility for creator only', () => {
  const service = read('services/server/tasks.service.ts');

  assert.match(service, /visibilityMode:\s*'private'/);
  assert.match(service, /visibleToUserIds:\s*\[context\.userId\]/);
  assert.match(service, /creatorUserId:\s*context\.userId/);
});

test('overview reads only user-visible tasks and keeps legacy fallback paths', () => {
  const service = read('services/server/tasks.service.ts');

  assert.match(service, /where\('visibleToUserIds', 'array-contains', userId\)/);
  assert.match(service, /where\('createdByUserId', '==', userId\)/);
  assert.match(service, /where\('delegatedToUserId', '==', userId\)/);
  assert.match(service, /canUserSeeTask\(task, userId\)/);
});

test('delegation uses exact system message text and updates visibility state', () => {
  const service = read('services/server/tasks.service.ts');

  assert.match(service, /const systemText = 'Diese Aufgabe wurde dir übergeben\.'/);
  assert.match(service, /visibilityMode:\s*'delegated'/);
  assert.match(service, /unreadForUserIds:\s*\[context\.partnerUserId\]/);
});

test('delegation chat message has deterministic idempotency key', () => {
  const service = read('services/server/task-chat.service.ts');

  assert.match(service, /system_task_delegated_/);
  assert.match(service, /if \(params\.idempotencyKey && messageSnap\.exists\)/);
});

test('chat list loads inbox entries from per-user state', () => {
  const chatService = read('services/server/task-chat.service.ts');

  assert.match(chatService, /collection\('inboxEntries'\)/);
  assert.match(chatService, /where\('isOpen', '==', true\)/);
});

test('chat messages keep both partner ids as participants for inbox routing', () => {
  const chatService = read('services/server/task-chat.service.ts');

  assert.match(chatService, /\.\.\.resolveTaskVisibleToUserIds\(task\)/);
  assert.match(chatService, /\.\.\.params\.participantUserIds/);
});

test('write access is restricted to currently assigned user once delegated', () => {
  const service = read('services/server/tasks.service.ts');
  const logic = read('services/tasks.logic.ts');

  assert.match(logic, /export function canUserEditTask/);
  assert.match(logic, /if \(task\.delegatedToUserId\)\s*{\s*return task\.delegatedToUserId === userId;/);
  assert.match(service, /assertTaskWriteAccess\(existingTask, context\.userId\)/);
  assert.match(service, /assertTaskWriteAccess\(task, context\.userId\)/);
});

test('task list renders assigned label for assignee and delegated read-only state for creator', () => {
  const taskListItem = read('components/home/TaskListItem.tsx');

  assert.match(taskListItem, /label: isAssignedToCurrentUser \? 'Übernommen' : 'Übergeben'/);
  assert.match(taskListItem, /isDelegatedAwayFromCurrentUser \? 'is-delegated' : ''/);
  assert.match(taskListItem, /task\.delegatedToUserId\s*\?\s*task\.delegatedToUserId === currentUserId/);
});
