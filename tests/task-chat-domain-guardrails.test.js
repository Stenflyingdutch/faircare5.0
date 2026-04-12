const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('thread message endpoint enforces one conversation per task', () => {
  const route = read('app/api/task-threads/[threadId]/messages/route.ts');

  assert.match(route, /const taskId = body\.taskId \?\? threadId/);
  assert.match(route, /if \(taskId !== threadId\)/);
  assert.match(route, /Thread und Aufgabe stimmen nicht überein/);
  assert.match(route, /replyToTaskConversation\(/);
});

test('overview badges and inbox derive from open inbox and task badge state, not unread-only counts', () => {
  const service = read('services/server/task-chat.service.ts');

  assert.match(service, /where\('isOpen', '==', true\)/);
  assert.match(service, /const hasTaskBadge = state\?\.hasTaskBadge \?\? false/);
  assert.match(service, /unreadCount: hasTaskBadge \? 1 : 0/);
  assert.match(service, /const inboxRows = rows\.filter\(\(row\) => openInboxThreadIds\.has\(row\.taskId\)\)/);
  assert.match(service, /unreadChatCount: inboxRows\.length/);
});

test('mark as read updates read state but leaves inbox open-state untouched', () => {
  const service = read('services/server/task-chat.service.ts');
  const markReadSection = service.split('export async function markTaskThreadAsRead')[1] ?? '';

  assert.match(service, /markTaskThreadAsRead/);
  assert.match(service, /hasUnread: false/);
  assert.match(service, /unreadCount: 0/);
  assert.match(service, /isUnread: false/);
  assert.doesNotMatch(markReadSection, /isOpen: false/);
});

test('firestore rules block client-side system messages and per-user state tampering', () => {
  const rules = read('firestore.rules');

  assert.match(rules, /request\.resource\.data\.type == 'user_message'/);
  assert.match(rules, /request\.resource\.data\.senderUserId == request\.auth\.uid/);
  assert.match(rules, /match \/conversationStates\/\{taskId\}[\s\S]*allow create, update, delete: if false;/);
  assert.match(rules, /match \/inboxEntries\/\{taskId\}[\s\S]*allow create, update, delete: if false;/);
});
