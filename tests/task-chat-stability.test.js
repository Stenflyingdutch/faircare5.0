const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('thread list loader normalizes and skips invalid chat docs instead of crashing', () => {
  const service = read('services/server/task-chat.service.ts');

  assert.match(service, /function normalizeChatThread\(/);
  assert.match(service, /async function ensureFamilyUserDoc/);
  assert.match(service, /parentCreated: true/);
  assert.match(service, /threads\.normalize\.skip/);
  assert.match(service, /resultCountRaw/);
  assert.match(service, /resultCountNormalized/);
});

test('thread list loader falls back when firestore composite index is missing', () => {
  const service = read('services/server/task-chat.service.ts');

  assert.match(service, /threads\.all\.queryFallback/);
  assert.match(service, /threads\.inbox\.queryFallback/);
  assert.match(service, /missing-composite-index-lastMessageAt/);
  assert.match(service, /where\('participantUserIds', 'array-contains', params\.userId\)\s*\.get\(\)/);
});

test('task threads route returns structured success and failure payloads', () => {
  const route = read('app/api/task-threads/route.ts');

  assert.match(route, /route\.taskThreads\.request/);
  assert.match(route, /route\.taskThreads\.success/);
  assert.match(route, /success: true, scope, items: threads, threads/);
  assert.match(route, /items: \[\]/);
  assert.match(route, /CHAT_QUERY_PRECONDITION_FAILED/);
  assert.match(route, /details:/);
  assert.match(route, /errorCode: 'CHAT_THREADS_LOAD_FAILED'/);
  assert.match(route, /mapErrorToHttpStatus/);
});

test('exchange content distinguishes empty inbox and empty threads states', () => {
  const exchange = read('components/review/ExchangeContent.tsx');

  assert.match(exchange, /Keine offenen Fälle\./);
  assert.match(exchange, /Noch keine Chatverläufe vorhanden\./);
  assert.match(exchange, /!loading && !lastQueryError && !threads\.length/);
  assert.match(exchange, /loadRequestIdRef/);
});
