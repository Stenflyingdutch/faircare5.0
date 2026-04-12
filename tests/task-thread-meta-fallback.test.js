const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('task overview chat meta tolerates missing firestore composite index', () => {
  const taskChatService = read('services/server/task-chat.service.ts');

  assert.match(taskChatService, /appendThreadMetaToOverview/);
  assert.match(taskChatService, /resolveFirestoreErrorCode/);
  assert.match(taskChatService, /code === 'failed-precondition'/);
  assert.match(taskChatService, /taskThreadMetaByTaskId: \{\}/);
  assert.match(taskChatService, /unreadChatCount: 0/);
});
