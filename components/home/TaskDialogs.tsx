'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/Modal';
import { formatDateLabel, getWeekday, parseDateKey } from '@/services/task-date';
import type { Responsibility } from '@/services/responsibilities.service';
import type {
  CreateTaskInput,
  SaveTaskDelegationInput,
  TaskMonthlyPatternMode,
  TaskOrdinal,
  TaskOverviewItem,
  TaskRecurrenceType,
  TaskWeekday,
  UpdateTaskInput,
} from '@/types/tasks';

type ComposerMode = 'day' | 'responsibility';

type DelegationAction =
  | { type: 'clear' }
  | { type: 'save'; input: SaveTaskDelegationInput };

export type TaskEditSubmit = {
  taskUpdate: UpdateTaskInput;
  delegationAction: DelegationAction;
};

const weekdayOptions: Array<{ value: TaskWeekday; label: string }> = [
  { value: 'mon', label: 'Mo' },
  { value: 'tue', label: 'Di' },
  { value: 'wed', label: 'Mi' },
  { value: 'thu', label: 'Do' },
  { value: 'fri', label: 'Fr' },
  { value: 'sat', label: 'Sa' },
  { value: 'sun', label: 'So' },
];

const recurrenceOptions: Array<{ value: TaskRecurrenceType; label: string }> = [
  { value: 'none', label: 'Keine Wiederholung' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'quarterly', label: 'Quartärlich' },
  { value: 'yearly', label: 'Jährlich' },
];

const ordinalOptions: Array<{ value: TaskOrdinal; label: string }> = [
  { value: 1, label: 'Erster' },
  { value: 2, label: 'Zweiter' },
  { value: 3, label: 'Dritter' },
  { value: 4, label: 'Vierter' },
  { value: -1, label: 'Letzter' },
];

type RecurrenceDraft = {
  recurrenceType: TaskRecurrenceType;
  weekdays: TaskWeekday[];
  monthlyMode: TaskMonthlyPatternMode;
  monthlyDayOfMonth: number;
  monthlyOrdinal: TaskOrdinal;
  monthlyWeekday: TaskWeekday;
  quarterlyMode: TaskMonthlyPatternMode;
  quarterlyDayOfMonth: number;
  quarterlyOrdinal: TaskOrdinal;
  quarterlyWeekday: TaskWeekday;
  yearlyMonth: number;
  yearlyDay: number;
  endMode: 'never' | 'onDate';
  endDate: string;
};

type DelegationDraft = {
  enabled: boolean;
  mode: 'singleDate' | 'recurring';
  weekdays: TaskWeekday[];
};

function buildInitialRecurrenceDraft(task: TaskOverviewItem, selectedDate: string): RecurrenceDraft {
  const anchorDate = task.selectedDate ?? selectedDate;
  const parsedAnchor = parseDateKey(anchorDate);
  const monthlyPattern = task.recurrenceConfig?.monthlyPattern;
  const quarterlyPattern = task.recurrenceConfig?.quarterlyPattern;

  return {
    recurrenceType: task.recurrenceType,
    weekdays: task.recurrenceConfig?.weekdays?.length
      ? task.recurrenceConfig.weekdays
      : task.recurrenceType === 'daily'
        ? weekdayOptions.map((entry) => entry.value)
        : [getWeekday(anchorDate)],
    monthlyMode: monthlyPattern?.mode ?? 'dayOfMonth',
    monthlyDayOfMonth: monthlyPattern?.mode === 'dayOfMonth' ? monthlyPattern.dayOfMonth : parsedAnchor.day,
    monthlyOrdinal: monthlyPattern?.mode === 'weekdayOfMonth' ? monthlyPattern.ordinal : 1,
    monthlyWeekday: monthlyPattern?.mode === 'weekdayOfMonth' ? monthlyPattern.weekday : getWeekday(anchorDate),
    quarterlyMode: quarterlyPattern?.mode ?? 'dayOfMonth',
    quarterlyDayOfMonth: quarterlyPattern?.mode === 'dayOfMonth' ? quarterlyPattern.dayOfMonth : parsedAnchor.day,
    quarterlyOrdinal: quarterlyPattern?.mode === 'weekdayOfMonth' ? quarterlyPattern.ordinal : 1,
    quarterlyWeekday: quarterlyPattern?.mode === 'weekdayOfMonth' ? quarterlyPattern.weekday : getWeekday(anchorDate),
    yearlyMonth: task.recurrenceConfig?.yearlyMonth ?? parsedAnchor.month,
    yearlyDay: task.recurrenceConfig?.yearlyDay ?? parsedAnchor.day,
    endMode: task.endMode,
    endDate: task.endDate ?? '',
  };
}

function buildInitialDelegationDraft(task: TaskOverviewItem, selectedDate: string): DelegationDraft {
  const existingDelegation = task.delegations[0] ?? null;
  return {
    enabled: Boolean(existingDelegation),
    mode: existingDelegation?.mode ?? 'singleDate',
    weekdays: existingDelegation?.weekdays?.length ? existingDelegation.weekdays : [getWeekday(selectedDate)],
  };
}

function toggleWeekday(current: TaskWeekday[], weekday: TaskWeekday) {
  return current.includes(weekday)
    ? current.filter((entry) => entry !== weekday)
    : [...current, weekday];
}

function WeekdaySelector({
  value,
  onChange,
}: {
  value: TaskWeekday[];
  onChange: (nextValue: TaskWeekday[]) => void;
}) {
  return (
    <div className="task-weekday-grid">
      {weekdayOptions.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={`task-weekday-chip ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onChange(toggleWeekday(value, option.value))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DialogHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="task-dialog-header">
      <h2 className="task-dialog-title">{title}</h2>
      {subtitle ? <p className="task-dialog-subtitle">{subtitle}</p> : null}
    </header>
  );
}

function DialogActions({
  submitLabel,
  onCancel,
  disabled,
  busy,
}: {
  submitLabel: string;
  onCancel: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="task-dialog-actions">
      <button type="button" className="task-secondary-button" onClick={onCancel}>
        Abbrechen
      </button>
      <button type="submit" className="task-primary-button" disabled={disabled || busy}>
        {busy ? 'Speichert …' : submitLabel}
      </button>
    </div>
  );
}

function RecurrenceFields({
  draft,
  onChange,
}: {
  draft: RecurrenceDraft;
  onChange: (nextValue: RecurrenceDraft) => void;
}) {
  return (
    <>
      <label className="task-field">
        <span className="task-field-label">Wiederholung</span>
        <select
          className="input"
          value={draft.recurrenceType}
          onChange={(event) => onChange({
            ...draft,
            recurrenceType: event.target.value as TaskRecurrenceType,
          })}
        >
          {recurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      {draft.recurrenceType === 'daily' ? (
        <div className="task-field">
          <span className="task-field-label">Tage</span>
          <WeekdaySelector value={draft.weekdays} onChange={(weekdays) => onChange({ ...draft, weekdays })} />
        </div>
      ) : null}

      {draft.recurrenceType === 'weekly' ? (
        <div className="task-field">
          <span className="task-field-label">Wochentage</span>
          <WeekdaySelector value={draft.weekdays} onChange={(weekdays) => onChange({ ...draft, weekdays })} />
        </div>
      ) : null}

      {draft.recurrenceType === 'monthly' ? (
        <div className="task-stack">
          <label className="task-field">
            <span className="task-field-label">Monatlich nach</span>
            <select
              className="input"
              value={draft.monthlyMode}
              onChange={(event) => onChange({ ...draft, monthlyMode: event.target.value as TaskMonthlyPatternMode })}
            >
              <option value="dayOfMonth">Tag im Monat</option>
              <option value="weekdayOfMonth">Wochentag im Monat</option>
            </select>
          </label>

          {draft.monthlyMode === 'dayOfMonth' ? (
            <label className="task-field">
              <span className="task-field-label">Tag</span>
              <input
                className="input"
                type="number"
                min={1}
                max={31}
                value={draft.monthlyDayOfMonth}
                onChange={(event) => onChange({ ...draft, monthlyDayOfMonth: Number(event.target.value || 1) })}
              />
            </label>
          ) : (
            <div className="task-inline-grid">
              <label className="task-field">
                <span className="task-field-label">Position</span>
                <select
                  className="input"
                  value={String(draft.monthlyOrdinal)}
                  onChange={(event) => onChange({ ...draft, monthlyOrdinal: Number(event.target.value) as TaskOrdinal })}
                >
                  {ordinalOptions.map((option) => (
                    <option key={option.label} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="task-field">
                <span className="task-field-label">Wochentag</span>
                <select
                  className="input"
                  value={draft.monthlyWeekday}
                  onChange={(event) => onChange({ ...draft, monthlyWeekday: event.target.value as TaskWeekday })}
                >
                  {weekdayOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      ) : null}

      {draft.recurrenceType === 'quarterly' ? (
        <div className="task-stack">
          <label className="task-field">
            <span className="task-field-label">Quartalsweise nach</span>
            <select
              className="input"
              value={draft.quarterlyMode}
              onChange={(event) => onChange({ ...draft, quarterlyMode: event.target.value as TaskMonthlyPatternMode })}
            >
              <option value="dayOfMonth">Tag im Monat</option>
              <option value="weekdayOfMonth">Wochentag im Monat</option>
            </select>
          </label>

          {draft.quarterlyMode === 'dayOfMonth' ? (
            <label className="task-field">
              <span className="task-field-label">Tag</span>
              <input
                className="input"
                type="number"
                min={1}
                max={31}
                value={draft.quarterlyDayOfMonth}
                onChange={(event) => onChange({ ...draft, quarterlyDayOfMonth: Number(event.target.value || 1) })}
              />
            </label>
          ) : (
            <div className="task-inline-grid">
              <label className="task-field">
                <span className="task-field-label">Position</span>
                <select
                  className="input"
                  value={String(draft.quarterlyOrdinal)}
                  onChange={(event) => onChange({ ...draft, quarterlyOrdinal: Number(event.target.value) as TaskOrdinal })}
                >
                  {ordinalOptions.map((option) => (
                    <option key={option.label} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="task-field">
                <span className="task-field-label">Wochentag</span>
                <select
                  className="input"
                  value={draft.quarterlyWeekday}
                  onChange={(event) => onChange({ ...draft, quarterlyWeekday: event.target.value as TaskWeekday })}
                >
                  {weekdayOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      ) : null}

      {draft.recurrenceType === 'yearly' ? (
        <div className="task-inline-grid">
          <label className="task-field">
            <span className="task-field-label">Monat</span>
            <input
              className="input"
              type="number"
              min={1}
              max={12}
              value={draft.yearlyMonth}
              onChange={(event) => onChange({ ...draft, yearlyMonth: Number(event.target.value || 1) })}
            />
          </label>
          <label className="task-field">
            <span className="task-field-label">Tag</span>
            <input
              className="input"
              type="number"
              min={1}
              max={31}
              value={draft.yearlyDay}
              onChange={(event) => onChange({ ...draft, yearlyDay: Number(event.target.value || 1) })}
            />
          </label>
        </div>
      ) : null}

      {draft.recurrenceType !== 'none' ? (
        <div className="task-stack">
          <label className="task-field">
            <span className="task-field-label">Bis wann soll sich die Aufgabe wiederholen?</span>
            <select
              className="input"
              value={draft.endMode}
              onChange={(event) => onChange({ ...draft, endMode: event.target.value as 'never' | 'onDate' })}
            >
              <option value="never">Nie</option>
              <option value="onDate">Bis Datum</option>
            </select>
          </label>

          {draft.endMode === 'onDate' ? (
            <label className="task-field">
              <span className="task-field-label">Enddatum</span>
              <input
                className="input"
                type="date"
                value={draft.endDate}
                onChange={(event) => onChange({ ...draft, endDate: event.target.value })}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function DelegationFields({
  draft,
  canUseRecurring,
  selectedDate,
  showEnabledToggle = true,
  onChange,
}: {
  draft: DelegationDraft;
  canUseRecurring: boolean;
  selectedDate: string;
  showEnabledToggle?: boolean;
  onChange: (nextValue: DelegationDraft) => void;
}) {
  return (
    <div className="task-stack">
      {showEnabledToggle ? (
        <div className="task-segmented">
          <button
            type="button"
            className={`task-segment ${!draft.enabled ? 'is-selected' : ''}`}
            onClick={() => onChange({ ...draft, enabled: false })}
          >
            Nein
          </button>
          <button
            type="button"
            className={`task-segment ${draft.enabled ? 'is-selected' : ''}`}
            onClick={() => onChange({ ...draft, enabled: true })}
          >
            Ja, an Partner
          </button>
        </div>
      ) : null}

      {draft.enabled ? (
        <>
          <div className="task-segmented">
            <button
              type="button"
              className={`task-segment ${draft.mode === 'singleDate' ? 'is-selected' : ''}`}
              onClick={() => onChange({ ...draft, mode: 'singleDate' })}
            >
              Einmalig für diesen Tag
            </button>
            {canUseRecurring ? (
              <button
                type="button"
                className={`task-segment ${draft.mode === 'recurring' ? 'is-selected' : ''}`}
                onClick={() => onChange({ ...draft, mode: 'recurring' })}
              >
                Regelmäßig
              </button>
            ) : null}
          </div>

          {draft.mode === 'singleDate' ? (
            <p className="task-inline-hint">Datum: {formatDateLabel(selectedDate)}</p>
          ) : null}

          {draft.mode === 'recurring' ? (
            <div className="task-field">
              <span className="task-field-label">Wochentage</span>
              <WeekdaySelector value={draft.weekdays} onChange={(weekdays) => onChange({ ...draft, weekdays })} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function TaskComposerModal({
  isOpen,
  mode,
  selectedDate,
  responsibility,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  mode: ComposerMode;
  selectedDate: string;
  responsibility?: Responsibility | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [createForSelectedDay, setCreateForSelectedDay] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setNotes('');
    setCreateForSelectedDay(true);
  }, [isOpen, mode, responsibility?.id, selectedDate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    if (mode === 'day') {
      await onSubmit({
        taskType: 'dayTask',
        title,
        notes,
        selectedDate,
        recurrenceType: 'none',
        endMode: 'never',
      });
      return;
    }

    await onSubmit({
      taskType: 'responsibilityTask',
      responsibilityId: responsibility?.id ?? null,
      categoryKey: responsibility?.categoryKey ?? null,
      title,
      notes,
      selectedDate: createForSelectedDay ? selectedDate : null,
      recurrenceType: 'none',
      endMode: 'never',
    });
  }

  const dialogTitle = mode === 'day' ? 'Einmalige Aufgabe' : 'Aufgabe hinzufügen';
  const dialogSubtitle = mode === 'day'
    ? 'Was soll an diesem Tag erledigt werden?'
    : 'Was muss konkret gemacht werden?';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="task-dialog-shell" onSubmit={handleSubmit}>
        <DialogHeader title={dialogTitle} subtitle={dialogSubtitle} />

        {mode === 'responsibility' && responsibility ? (
          <p className="task-inline-hint">Verantwortungsgebiet: {responsibility.title}</p>
        ) : null}

        <div className="task-date-pill">Datum: {formatDateLabel(selectedDate)}</div>

        <label className="task-field">
          <span className="task-field-label">Aufgabe</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Zum Beispiel Apotheke anrufen"
          />
        </label>

        <label className="task-field">
          <span className="task-field-label">Notiz</span>
          <textarea
            className="input task-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional"
          />
        </label>

        {mode === 'responsibility' ? (
          <label className="task-checkbox-row">
            <input
              type="checkbox"
              checked={createForSelectedDay}
              onChange={(event) => setCreateForSelectedDay(event.target.checked)}
            />
            <span>Einmalig für den ausgewählten Tag erstellen</span>
          </label>
        ) : null}

        <DialogActions submitLabel="Erstellen" onCancel={onClose} disabled={!title.trim()} busy={isSubmitting} />
      </form>
    </Modal>
  );
}

export function TaskEditModal({
  isOpen,
  task,
  selectedDate,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  selectedDate: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: TaskEditSubmit) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrenceDraft, setRecurrenceDraft] = useState<RecurrenceDraft | null>(null);
  const [delegationDraft, setDelegationDraft] = useState<DelegationDraft | null>(null);

  useEffect(() => {
    if (!isOpen || !task) return;
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setRecurrenceDraft(buildInitialRecurrenceDraft(task, selectedDate));
    setDelegationDraft(buildInitialDelegationDraft(task, selectedDate));
  }, [isOpen, selectedDate, task]);

  if (!task || !recurrenceDraft || !delegationDraft) {
    return null;
  }

  const currentTask = task;
  const currentRecurrenceDraft = recurrenceDraft;
  const currentDelegationDraft = delegationDraft;
  const allowRecurringDelegation = currentTask.taskType !== 'dayTask' && currentRecurrenceDraft.recurrenceType !== 'none';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    const nextRecurrenceType = currentTask.taskType === 'dayTask' ? 'none' : currentRecurrenceDraft.recurrenceType;
    const nextSelectedDate = currentTask.taskType === 'dayTask'
      ? currentTask.selectedDate ?? selectedDate
      : nextRecurrenceType === 'none'
        ? (currentTask.selectedDate ?? null)
        : (currentTask.selectedDate ?? selectedDate);

    const taskUpdate: UpdateTaskInput = {
      title,
      notes,
      selectedDate: nextSelectedDate,
      recurrenceType: nextRecurrenceType,
      recurrenceConfig: nextRecurrenceType === 'daily' || nextRecurrenceType === 'weekly'
        ? { weekdays: currentRecurrenceDraft.weekdays }
        : nextRecurrenceType === 'monthly'
          ? {
            monthlyPattern: currentRecurrenceDraft.monthlyMode === 'dayOfMonth'
              ? { mode: 'dayOfMonth', dayOfMonth: currentRecurrenceDraft.monthlyDayOfMonth }
              : {
                mode: 'weekdayOfMonth',
                ordinal: currentRecurrenceDraft.monthlyOrdinal,
                weekday: currentRecurrenceDraft.monthlyWeekday,
              },
          }
          : nextRecurrenceType === 'quarterly'
            ? {
              quarterlyPattern: currentRecurrenceDraft.quarterlyMode === 'dayOfMonth'
                ? { mode: 'dayOfMonth', dayOfMonth: currentRecurrenceDraft.quarterlyDayOfMonth }
                : {
                  mode: 'weekdayOfMonth',
                  ordinal: currentRecurrenceDraft.quarterlyOrdinal,
                  weekday: currentRecurrenceDraft.quarterlyWeekday,
                },
            }
            : nextRecurrenceType === 'yearly'
              ? {
                yearlyMonth: currentRecurrenceDraft.yearlyMonth,
                yearlyDay: currentRecurrenceDraft.yearlyDay,
              }
              : null,
      endMode: nextRecurrenceType === 'none' ? 'never' : currentRecurrenceDraft.endMode,
      endDate: nextRecurrenceType === 'none' || currentRecurrenceDraft.endMode === 'never' ? null : currentRecurrenceDraft.endDate,
    };

    const delegationAction: DelegationAction = currentDelegationDraft.enabled
      ? {
        type: 'save',
        input: currentDelegationDraft.mode === 'recurring' && allowRecurringDelegation
          ? { mode: 'recurring', weekdays: currentDelegationDraft.weekdays }
          : { mode: 'singleDate', date: selectedDate },
      }
      : { type: 'clear' };

    await onSubmit({ taskUpdate, delegationAction });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="task-dialog-shell" onSubmit={handleSubmit}>
        <DialogHeader title="Aufgabe bearbeiten" />

        <label className="task-field">
          <span className="task-field-label">Aufgabe</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="task-field">
          <span className="task-field-label">Notiz</span>
          <textarea className="input task-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        {currentTask.taskType !== 'dayTask' ? (
          <div className="task-stack">
            <p className="task-section-title">Wiederholt sich diese Aufgabe?</p>
            <RecurrenceFields draft={currentRecurrenceDraft} onChange={setRecurrenceDraft} />
          </div>
        ) : (
          <div className="task-date-pill">Datum: {formatDateLabel(currentTask.selectedDate ?? selectedDate)}</div>
        )}

        <div className="task-stack">
          <p className="task-section-title">Soll die Aufgabe delegiert werden?</p>
          <DelegationFields
            draft={currentDelegationDraft}
            canUseRecurring={allowRecurringDelegation}
            selectedDate={selectedDate}
            onChange={setDelegationDraft}
          />
        </div>

        <DialogActions submitLabel="Speichern" onCancel={onClose} disabled={!title.trim()} busy={isSubmitting} />
      </form>
    </Modal>
  );
}

export function TaskDelegationModal({
  isOpen,
  task,
  selectedDate,
  isSubmitting,
  onClose,
  onSubmit,
  onClear,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  selectedDate: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: SaveTaskDelegationInput) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<DelegationDraft | null>(null);

  useEffect(() => {
    if (!isOpen || !task) return;
    setDraft(buildInitialDelegationDraft(task, selectedDate));
  }, [isOpen, selectedDate, task]);

  if (!task || !draft) {
    return null;
  }

  const currentTask = task;
  const currentDraft = draft;
  const canUseRecurring = currentTask.taskType !== 'dayTask' && currentTask.recurrenceType !== 'none';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(
      currentDraft.mode === 'recurring' && canUseRecurring
        ? { mode: 'recurring', weekdays: currentDraft.weekdays }
        : { mode: 'singleDate', date: selectedDate },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="task-dialog-shell" onSubmit={handleSubmit}>
        <DialogHeader title="Delegieren" subtitle="Wie soll diese Aufgabe delegiert werden?" />

        <DelegationFields
          draft={{ ...currentDraft, enabled: true }}
          canUseRecurring={canUseRecurring}
          selectedDate={selectedDate}
          showEnabledToggle={false}
          onChange={setDraft}
        />

        <div className="task-dialog-actions">
          <button type="button" className="task-secondary-button" onClick={onClose}>
            Abbrechen
          </button>
          {currentTask.delegations.length ? (
            <button type="button" className="task-ghost-button" onClick={() => void onClear()}>
              Entfernen
            </button>
          ) : null}
          <button type="submit" className="task-primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Speichert …' : 'Delegieren'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function TaskActionModal({
  isOpen,
  task,
  selectedDate,
  responsibilityTitle,
  onClose,
  onEdit,
  onDelegate,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  selectedDate: string;
  responsibilityTitle?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelegate: () => void;
}) {
  if (!task) {
    return null;
  }

  const subtitle = responsibilityTitle
    ? responsibilityTitle
    : `Datum: ${formatDateLabel(task.selectedDate ?? selectedDate)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="task-dialog-shell">
        <DialogHeader title={task.title} subtitle={subtitle} />

        <div className="task-stack">
          <button type="button" className="task-action-button" onClick={onEdit}>
            Bearbeiten
          </button>
          <button type="button" className="task-action-button" onClick={onDelegate}>
            Delegieren
          </button>
          <button type="button" className="task-secondary-button" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </Modal>
  );
}
