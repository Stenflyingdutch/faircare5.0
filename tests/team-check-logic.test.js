const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

test('team check reminder defaults to 09:00 when no time is set', () => {
  const src = read('services/teamCheck.logic.ts');
  assert.match(src, /const DEFAULT_REMINDER_HOUR = '09:00'/);
  assert.match(src, /computeReminderAt/);
});

test('team check badge is a dot only in personal nav and not a number/text badge', () => {
  const shell = read('components/personal/PersonalAreaShell.tsx');
  const css = read('app/globals.css');
  assert.match(shell, /team-check-nav-dot/);
  assert.doesNotMatch(shell, /\d+/);
  assert.match(css, /\.team-check-nav-dot/);
  assert.match(css, /width:\s*8px/);
});

test('results pages no longer expose an Einstellungen entry point', () => {
  const shell = read('components/personal/PersonalAreaShell.tsx');
  const results = read('components/review/ReviewResultsContent.tsx');
  assert.match(shell, /const showNavigation = !pathname\.startsWith\('\/app\/ergebnisse'\)/);
  assert.match(shell, /\{showNavigation && \(/);
  assert.doesNotMatch(results, /href="\/app\/einstellungen"/);
  assert.doesNotMatch(results, />\s*Einstellungen\s*</);
});

test('settings start page contains the base entries and gates admin area by role', () => {
  const src = read('app/app/einstellungen/page.tsx');
  assert.match(src, /Persönliche Einstellungen/);
  assert.match(src, /Check-in Planung/);
  assert.match(src, /Quizergebnisse einsehen/);
  assert.match(src, /Adminbereich/);
  assert.match(src, /isAdminProfile/);
  assert.doesNotMatch(src, /Team-Check Rhythmus/);
});

test('team check planning screen contains shared plan and individual reminder controls', () => {
  const src = read('app/app/einstellungen/team-check-planung/page.tsx');
  assert.match(src, /Rhythmus/);
  assert.match(src, /Tag/);
  assert.match(src, /Uhrzeit/);
  assert.match(src, /E-Mail-Erinnerung/);
  assert.match(src, /saveTeamCheckPlan/);
  assert.match(src, /saveTeamCheckEmailPreference/);
  assert.match(src, /Keine Uhrzeit/);
});

test('biweekly scheduling uses a central interval-anchor approach without blind extra jump', () => {
  const src = read('services/teamCheck.logic.ts');
  assert.match(src, /computeNextIntervalDate/);
  assert.match(src, /resolveFixedWeekdayAnchor/);
  assert.match(src, /intervalDays:\s*14/);
  assert.doesNotMatch(src, /fallback\.setDate\(fallback\.getDate\(\) \+ params\.intervalDays\)/);
});

test('reminder offset is 1 day before next check-in', () => {
  const src = read('services/teamCheck.logic.ts');
  assert.match(src, /reminder.setDate\(reminder.getDate\(\) - 1\)/);
});

test('check-in save flow is transaction-based and idempotent per cycle', () => {
  const src = read('services/teamCheck.service.ts');
  assert.match(src, /runTransaction\(db,\s*async \(transaction\)/);
  assert.match(src, /cycle_\$\{scheduledForKey\}/);
  assert.match(src, /existingRecord\.exists\(\)/);
  assert.match(src, /snapshotBeforeCards/);
  assert.match(src, /transaction\.set\(recordRef,/);
  assert.match(src, /transaction\.set\(familyRef,/);
});

test('component delegates owner updates to atomic service save instead of direct owner patching', () => {
  const src = read('components/review/TeamCheckContent.tsx');
  assert.match(src, /saveTeamCheckRecord\(\{/);
  assert.match(src, /ownerDecisions:/);
  assert.doesNotMatch(src, /updateOwnershipCardOwner/);
});
