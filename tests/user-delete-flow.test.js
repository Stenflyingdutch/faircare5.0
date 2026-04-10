const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (filePath) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');

const personalSettingsSrc = read('app/app/einstellungen/persoenliche-einstellungen/page.tsx');
const adminUsersPageSrc = read('app/admin/users/page.tsx');
const selfDeleteRouteSrc = read('app/api/users/me/delete/route.ts');
const adminDeleteRouteSrc = read('app/api/admin/users/[userId]/route.ts');
const deleteServiceSrc = read('services/server/user-delete.service.ts');
const userSettingsServiceSrc = read('services/userSettings.service.ts');

test('self delete route is session-protected and uses centralized deletion', () => {
  assert.match(selfDeleteRouteSrc, /verifyAdminSessionCookie/);
  assert.match(selfDeleteRouteSrc, /executeUserDeletion/);
  assert.match(selfDeleteRouteSrc, /mode: 'self'/);
  assert.match(selfDeleteRouteSrc, /targetUserId: decodedToken\.uid/);
});

test('admin delete route uses the same centralized deletion flow', () => {
  assert.match(adminDeleteRouteSrc, /executeUserDeletion/);
  assert.match(adminDeleteRouteSrc, /mode: 'admin'/);
});

test('personal settings contain required irreversible delete dialog copy', () => {
  assert.match(personalSettingsSrc, /Konto löschen/);
  assert.match(personalSettingsSrc, /Bist du sicher, dass du dein Konto löschen möchtest\?/);
  assert.match(
    personalSettingsSrc,
    /Dein Konto, deine persönlichen Daten, deine Quizdaten und deine persönlichen Ergebnisse werden dauerhaft gelöscht\. Dieser Vorgang kann nicht rückgängig gemacht werden\./,
  );
  assert.match(personalSettingsSrc, /Endgültig löschen/);
  assert.match(userSettingsServiceSrc, /fetch\('\/api\/users\/me\/delete'/);
});

test('admin user management uses irreversible warning text before delete actions', () => {
  assert.match(adminUsersPageSrc, /Bist du sicher, dass du dein Konto löschen möchtest\?/);
  assert.match(
    adminUsersPageSrc,
    /Dein Konto, deine persönlichen Daten, deine Quizdaten und deine persönlichen Ergebnisse werden dauerhaft gelöscht\. Dieser Vorgang kann nicht rückgängig gemacht werden\./,
  );
  assert.match(adminUsersPageSrc, /Endgültig löschen/);
});

test('central deletion service emits the required lifecycle logs', () => {
  assert.match(deleteServiceSrc, /user\.delete\.requested/);
  assert.match(deleteServiceSrc, /user\.delete\.authorized/);
  assert.match(deleteServiceSrc, /user\.delete\.collect_references\.start/);
  assert.match(deleteServiceSrc, /user\.delete\.collect_references\.success/);
  assert.match(deleteServiceSrc, /user\.delete\.partner_cleanup\.start/);
  assert.match(deleteServiceSrc, /user\.delete\.partner_cleanup\.success/);
  assert.match(deleteServiceSrc, /user\.delete\.firestore_cleanup\.start/);
  assert.match(deleteServiceSrc, /user\.delete\.firestore_cleanup\.success/);
  assert.match(deleteServiceSrc, /user\.delete\.auth_cleanup\.start/);
  assert.match(deleteServiceSrc, /user\.delete\.auth_cleanup\.success/);
  assert.match(deleteServiceSrc, /user\.delete\.completed/);
  assert.match(deleteServiceSrc, /user\.delete\.failed/);
});

test('partner cleanup converts remaining account into a consistent single-user state', () => {
  assert.match(deleteServiceSrc, /role: 'initiator'/);
  assert.match(deleteServiceSrc, /partnerUserId: null/);
  assert.match(deleteServiceSrc, /partnerDisplayName: null/);
  assert.match(deleteServiceSrc, /resultsUnlocked: false/);
  assert.match(deleteServiceSrc, /sharedResultsOpened: false/);
  assert.match(deleteServiceSrc, /status: 'invited'/);
});

test('delete cleanup covers per-user quiz data and legacy user reference collections', () => {
  assert.match(deleteServiceSrc, /firestoreCollections\.quizAnswers/);
  assert.match(deleteServiceSrc, /firestoreCollections\.quizSessions/);
  assert.match(deleteServiceSrc, /firestoreCollections\.quizResults/);
  assert.match(deleteServiceSrc, /firestoreCollections\.userResults/);
  assert.match(deleteServiceSrc, /firestoreCollections\.results/);
  assert.match(deleteServiceSrc, /actionBoards/);
  assert.match(deleteServiceSrc, /actionBoardCards/);
  assert.match(deleteServiceSrc, /publicTestResponses/);
  assert.match(deleteServiceSrc, /personal_area/);
  assert.match(deleteServiceSrc, /memberIds/);
  assert.match(deleteServiceSrc, /ownerIds/);
  assert.match(deleteServiceSrc, /participants/);
});
