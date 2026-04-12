const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('task threads route logs structured scope/auth/mapping diagnostics and normalizes payload for UI contract', () => {
  const route = read('app/api/task-threads/route.ts');

  assert.match(route, /rawQuery: request\.nextUrl\.search/);
  assert.match(route, /resolvedScope/);
  assert.match(route, /mapping\.start/);
  assert.match(route, /mapping\.success/);
  assert.match(route, /firestoreCode/);
  assert.match(route, /query\.start/);
  assert.match(route, /query\.result/);
  assert.match(route, /query\.recoverableError/);
  assert.match(route, /isRecoverableThreadReadError/);
  assert.match(route, /preview: thread\.lastMessageText \|\| ''/);
  assert.match(route, /participants: Array\.isArray\(thread\.participantUserIds\) \? thread\.participantUserIds : \[\]/);
  assert.match(route, /return NextResponse\.json\(\{ threads: normalizedThreads \}\)/);
});

test('server task chat service normalizes legacy thread docs instead of crashing on optional fields', () => {
  const service = read('services/server/task-chat.service.ts');

  assert.match(service, /function normalizeThreadListItem/);
  assert.match(service, /function toIsoString/);
  assert.match(service, /loadInbox\.snapshot\.raw/);
  assert.match(service, /loadInbox\.thread\.skipped\.invalid/);
  assert.match(service, /normalizeInboxEntry/);
  assert.match(service, /toThreadFromInboxEntry/);
  assert.match(service, /loadInbox\.thread\.fallbackFromInboxEntry/);
  assert.match(service, /normalizeStringArray/);
});
