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
