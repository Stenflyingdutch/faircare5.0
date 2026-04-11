const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('home page mounts weekly strip and selected-day task section for superusers', () => {
  const homePage = read('app/app/home/page.tsx');

  assert.match(homePage, /WeeklyDateStrip/);
  assert.match(homePage, /TaskComposerModal/);
  assert.match(homePage, /TaskEditModal/);
  assert.match(homePage, /TaskDelegationModal/);
  assert.match(homePage, /isSuperuserProfile/);
  assert.match(homePage, /Einmalige Aufgabe/);
  assert.match(homePage, /Für diesen Tag gibt es noch keine Aufgaben\./);
  assert.match(homePage, /responsibility-task-add-button/);
});

test('weekly strip is a custom seven-day component with arrows and range title', () => {
  const weeklyStrip = read('components/home/WeeklyDateStrip.tsx');

  assert.match(weeklyStrip, /formatWeekRange/);
  assert.match(weeklyStrip, /formatStripDate/);
  assert.match(weeklyStrip, /formatWeekdayLabel/);
  assert.match(weeklyStrip, /onShiftWeek\(-1\)/);
  assert.match(weeklyStrip, /onShiftWeek\(1\)/);
  assert.match(weeklyStrip, /buildWeek\(visibleWeekStart\)/);
});

test('task dialogs stay manual-only without suggestions or catalog text', () => {
  const dialogs = read('components/home/TaskDialogs.tsx');

  assert.match(dialogs, /Einmalige Aufgabe/);
  assert.match(dialogs, /Aufgabe hinzufügen/);
  assert.match(dialogs, /Aufgabe bearbeiten/);
  assert.match(dialogs, /Delegieren/);
  assert.doesNotMatch(dialogs, /Vorschlag|Vorschläge|Katalog|Vorlage|Empfehlung/);
});
