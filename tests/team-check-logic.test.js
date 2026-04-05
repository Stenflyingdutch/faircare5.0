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

test('settings contain shared rhythm and individual email preference controls', () => {
  const src = read('app/app/einstellungen/page.tsx');
  assert.match(src, /Team-Check Rhythmus/);
  assert.match(src, /Frequenz/);
  assert.match(src, /E-Mail-Erinnerung/);
  assert.match(src, /saveTeamCheckPlan/);
  assert.match(src, /saveTeamCheckEmailPreference/);
});

test('biweekly scheduling uses a central interval-anchor approach without blind extra jump', () => {
  const src = read('services/teamCheck.logic.ts');
  assert.match(src, /computeNextIntervalDate/);
  assert.match(src, /resolveFixedWeekdayAnchor/);
  assert.match(src, /intervalDays:\s*14/);
  assert.doesNotMatch(src, /fallback\.setDate\(fallback\.getDate\(\) \+ params\.intervalDays\)/);
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
