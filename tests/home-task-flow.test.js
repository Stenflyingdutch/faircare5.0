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
  assert.match(homePage, /TaskEditScopeModal/);
  assert.match(homePage, /TaskInstanceEditModal/);
  assert.match(homePage, /ResponsibilityTaskSection/);
  assert.match(homePage, /useTaskInteractionFlow/);
  assert.match(homePage, /isSuperuserProfile/);
  assert.match(homePage, /Für diesen Tag gibt es noch keine Aufgaben\./);
  assert.match(homePage, /responsibility-task-add-button/);
  assert.match(homePage, /Möchtest Du die Aufgabe zurücknehmen\?/);
  assert.match(homePage, /onReclaimDelegation/);
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
  assert.match(dialogs, /Nur heute/);
  assert.match(dialogs, /Ganze Serie/);
  assert.match(dialogs, /In Wechsel/);
  assert.match(dialogs, /Immer/);
  assert.match(dialogs, /const \[draftDate, setDraftDate\] = useState\(selectedDate\)/);
  assert.match(dialogs, /type="date"/);
  assert.match(dialogs, /selectedDate: draftDate/);
  assert.doesNotMatch(dialogs, /Vorschlag|Vorschläge|Katalog|Vorlage|Empfehlung/);
});

test('ownership dashboard exposes task badge counts and a shared task sheet flow', () => {
  const dashboard = read('app/app/ownership-dashboard/page.tsx');
  const board = read('components/ownership/OwnershipBoard.tsx');

  assert.match(dashboard, /ResponsibilityTasksSheet/);
  assert.match(dashboard, /TaskEditScopeModal/);
  assert.match(dashboard, /TaskInstanceEditModal/);
  assert.match(dashboard, /taskCountByCard/);
  assert.match(board, /ownership-task-indicator/);
  assert.match(board, /onOpenTasks/);
});

test('creating a one-time task for another day switches the selected date to the chosen target day', () => {
  const homePage = read('app/app/home/page.tsx');

  assert.match(homePage, /input\.taskType === 'dayTask' && input\.selectedDate && input\.selectedDate !== selectedDate/);
  assert.match(homePage, /setSelectedDate\(input\.selectedDate\)/);
  assert.match(homePage, /setVisibleWeekStart\(startOfWeek\(input\.selectedDate\)\)/);
});
