'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Modal } from '@/components/Modal';
import { formatDateLabel, getWeekday, parseDateKey } from '@/services/task-date';
import { getTaskTimingLabel, resolveTaskInstanceDate, resolveTaskInstanceState } from '@/services/tasks.logic';
import { sendTaskMessageByTask } from '@/services/task-chat.service';
import type { Responsibility } from '@/services/responsibilities.service';
import type {
  CreateTaskInput,
  SaveTaskDelegationInput,
  TaskDelegationRecurringStrategy,
  TaskMonthlyPatternMode,
  TaskOrdinal,
  TaskOverviewItem,
  TaskRecurrenceType,
  TaskWeekday,
  UpdateTaskInput,
  UpdateTaskInstanceInput,
} from '@/types/tasks';

type ComposerMode = 'day' | 'responsibility';

type DelegationAction =
  | { type: 'clear' }
  | { type: 'save'; input: SaveTaskDelegationInput };

export type TaskEditSubmit = {
  taskUpdate: UpdateTaskInput;
  delegationAction: DelegationAction;
};

export type TaskInstanceEditSubmit = {
  instanceDate: string;
  taskUpdate: UpdateTaskInstanceInput;
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
  { value: 'none', label: 'Keine' },
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
  recurringStrategy: TaskDelegationRecurringStrategy;
};

function getSortedDelegationCandidates(task: TaskOverviewItem) {
  return [...task.delegations].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function findSingleDateDelegation(task: TaskOverviewItem, dateKey: string) {
  return getSortedDelegationCandidates(task).find((delegation) => delegation.mode === 'singleDate' && delegation.date === dateKey) ?? null;
}

function findSeriesDelegation(task: TaskOverviewItem, selectedDate: string) {
  const recurring = getSortedDelegationCandidates(task).find((delegation) => delegation.mode === 'recurring');
  if (recurring) {
    return recurring;
  }

  return findSingleDateDelegation(task, selectedDate);
}

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
        : task.recurrenceType === 'weekly'
          ? ['mon']
          : [getWeekday(anchorDate)],
    monthlyMode: monthlyPattern?.mode ?? 'weekdayOfMonth',
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
  const existingDelegation = findSeriesDelegation(task, selectedDate);
  return {
    enabled: Boolean(existingDelegation),
    mode: existingDelegation?.mode ?? 'singleDate',
    weekdays: existingDelegation?.weekdays?.length ? existingDelegation.weekdays : [getWeekday(selectedDate)],
    recurringStrategy: existingDelegation?.recurringStrategy ?? 'always',
  };
}

function buildInitialInstanceDelegationDraft(task: TaskOverviewItem, instanceDate: string): DelegationDraft {
  return {
    enabled: Boolean(findSingleDateDelegation(task, instanceDate)),
    mode: 'singleDate',
    weekdays: [getWeekday(instanceDate)],
    recurringStrategy: 'always',
  };
}

function toggleWeekday(current: TaskWeekday[], weekday: TaskWeekday, singleSelect = false) {
  if (singleSelect) {
    return [weekday];
  }

  return current.includes(weekday)
    ? current.filter((entry) => entry !== weekday)
    : [...current, weekday];
}

function WeekdaySelector({
  value,
  singleSelect = false,
  onChange,
}: {
  value: TaskWeekday[];
  singleSelect?: boolean;
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
            onClick={() => onChange(toggleWeekday(value, option.value, singleSelect))}
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h12" />
      <path d="M7 5V3.8c0-.5.4-.8.8-.8h4.4c.5 0 .8.3.8.8V5" />
      <path d="m7.2 8 .3 8h5l.3-8" />
    </svg>
  );
}

function DialogActions({
  submitLabel,
  onCancel,
  disabled,
  busy,
  leadingAction,
}: {
  submitLabel: string;
  onCancel: () => void;
  disabled?: boolean;
  busy?: boolean;
  leadingAction?: ReactNode;
}) {
  return (
    <div className="task-dialog-actions">
      {leadingAction ? <div className="task-dialog-actions-leading">{leadingAction}</div> : null}
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
            weekdays: event.target.value === 'daily'
              ? weekdayOptions.map((entry) => entry.value)
              : event.target.value === 'weekly'
                ? ['mon']
                : draft.weekdays,
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
          <WeekdaySelector value={draft.weekdays} singleSelect onChange={(weekdays) => onChange({ ...draft, weekdays: weekdays.length ? weekdays : ['mon'] })} />
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
              <option value="weekdayOfMonth">Wochentag im Monat</option>
              <option value="dayOfMonth">Tag im Monat</option>
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
              <option value="weekdayOfMonth">Wochentag im Monat</option>
              <option value="dayOfMonth">Tag im Monat</option>
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
  recurrenceType,
  selectedDate,
  showEnabledToggle = true,
  onChange,
}: {
  draft: DelegationDraft;
  canUseRecurring: boolean;
  recurrenceType: TaskRecurrenceType;
  selectedDate: string;
  showEnabledToggle?: boolean;
  onChange: (nextValue: DelegationDraft) => void;
}) {
  const usesRecurringStrategy = recurrenceType === 'weekly' || recurrenceType === 'monthly' || recurrenceType === 'quarterly' || recurrenceType === 'yearly';

  return (
    <div className="task-stack">
      <div className="task-segmented">
        <button
          type="button"
          className={`task-segment ${draft.enabled && draft.mode === 'singleDate' ? 'is-selected' : ''}`}
          onClick={() => onChange({
            ...draft,
            enabled: !(draft.enabled && draft.mode === 'singleDate'),
            mode: 'singleDate',
          })}
        >
          Nur heute
        </button>
        {canUseRecurring ? (
          <button
            type="button"
            className={`task-segment ${draft.enabled && draft.mode === 'recurring' ? 'is-selected' : ''}`}
            onClick={() => onChange({
              ...draft,
              enabled: !(draft.enabled && draft.mode === 'recurring'),
              mode: 'recurring',
            })}
          >
            Ganze Serie
          </button>
        ) : null}
      </div>

      {showEnabledToggle && !draft.enabled ? (
        <p className="task-inline-hint">Nicht übergeben.</p>
      ) : null}

      {draft.enabled ? (
        <>
          <p className="task-inline-hint">Hinweis: Die Aufgabe erscheint beim Partner.</p>

          {draft.mode === 'singleDate' ? (
            <p className="task-inline-hint">Datum: {formatDateLabel(selectedDate)}</p>
          ) : null}

          {draft.mode === 'recurring' ? (
            usesRecurringStrategy ? (
              <div className="task-segmented">
                <button
                  type="button"
                  className={`task-segment ${draft.recurringStrategy === 'alternating' ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...draft, recurringStrategy: 'alternating' })}
                >
                  In Wechsel
                </button>
                <button
                  type="button"
                  className={`task-segment ${draft.recurringStrategy === 'always' ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...draft, recurringStrategy: 'always' })}
                >
                  Immer
                </button>
              </div>
            ) : (
              <div className="task-field">
                <span className="task-field-label">Wochentage</span>
                <WeekdaySelector value={draft.weekdays} onChange={(weekdays) => onChange({ ...draft, weekdays })} />
              </div>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export type TaskComposerSubmit = {
  createInput: CreateTaskInput;
  delegationAction: DelegationAction;
};

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
  onSubmit: (input: TaskComposerSubmit) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [recurrenceDraft, setRecurrenceDraft] = useState<RecurrenceDraft>({
    recurrenceType: 'none',
    weekdays: ['mon'],
    monthlyMode: 'weekdayOfMonth',
    monthlyDayOfMonth: parseDateKey(selectedDate).day,
    monthlyOrdinal: 1,
    monthlyWeekday: getWeekday(selectedDate),
    quarterlyMode: 'dayOfMonth',
    quarterlyDayOfMonth: parseDateKey(selectedDate).day,
    quarterlyOrdinal: 1,
    quarterlyWeekday: getWeekday(selectedDate),
    yearlyMonth: parseDateKey(selectedDate).month,
    yearlyDay: parseDateKey(selectedDate).day,
    endMode: 'never',
    endDate: '',
  });
  const [delegationDraft, setDelegationDraft] = useState<DelegationDraft>({
    enabled: false,
    mode: 'singleDate',
    weekdays: [getWeekday(selectedDate)],
    recurringStrategy: 'always',
  });

  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseDateKey(selectedDate);
    setTitle('');
    setNotes('');
    setDraftDate(selectedDate);
    setIsDatePickerOpen(false);
    setRecurrenceDraft({
      recurrenceType: 'none',
      weekdays: ['mon'],
      monthlyMode: 'weekdayOfMonth',
      monthlyDayOfMonth: parsed.day,
      monthlyOrdinal: 1,
      monthlyWeekday: getWeekday(selectedDate),
      quarterlyMode: 'dayOfMonth',
      quarterlyDayOfMonth: parsed.day,
      quarterlyOrdinal: 1,
      quarterlyWeekday: getWeekday(selectedDate),
      yearlyMonth: parsed.month,
      yearlyDay: parsed.day,
      endMode: 'never',
      endDate: '',
    });
    setDelegationDraft({
      enabled: false,
      mode: 'singleDate',
      weekdays: [getWeekday(selectedDate)],
      recurringStrategy: 'always',
    });
  }, [isOpen, mode, responsibility?.id, selectedDate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    if (mode === 'day') {
      await onSubmit({
        createInput: {
          taskType: 'dayTask',
          title,
          notes,
          selectedDate: draftDate,
          recurrenceType: 'none',
          endMode: 'never',
        },
        delegationAction: { type: 'clear' },
      });
      return;
    }

    const createInput: CreateTaskInput = {
      taskType: 'responsibilityTask',
      responsibilityId: responsibility?.id ?? null,
      categoryKey: responsibility?.categoryKey ?? null,
      title,
      notes,
      selectedDate,
      recurrenceType: recurrenceDraft.recurrenceType,
      recurrenceConfig: recurrenceDraft.recurrenceType === 'daily' || recurrenceDraft.recurrenceType === 'weekly'
        ? { weekdays: recurrenceDraft.weekdays }
        : recurrenceDraft.recurrenceType === 'monthly'
          ? {
            monthlyPattern: recurrenceDraft.monthlyMode === 'dayOfMonth'
              ? { mode: 'dayOfMonth', dayOfMonth: recurrenceDraft.monthlyDayOfMonth }
              : { mode: 'weekdayOfMonth', ordinal: recurrenceDraft.monthlyOrdinal, weekday: recurrenceDraft.monthlyWeekday },
          }
          : recurrenceDraft.recurrenceType === 'quarterly'
            ? {
              quarterlyPattern: recurrenceDraft.quarterlyMode === 'dayOfMonth'
                ? { mode: 'dayOfMonth', dayOfMonth: recurrenceDraft.quarterlyDayOfMonth }
                : { mode: 'weekdayOfMonth', ordinal: recurrenceDraft.quarterlyOrdinal, weekday: recurrenceDraft.quarterlyWeekday },
            }
            : recurrenceDraft.recurrenceType === 'yearly'
              ? { yearlyMonth: recurrenceDraft.yearlyMonth, yearlyDay: recurrenceDraft.yearlyDay }
              : null,
      endMode: recurrenceDraft.recurrenceType === 'none' ? 'never' : recurrenceDraft.endMode,
      endDate: recurrenceDraft.recurrenceType === 'none' || recurrenceDraft.endMode === 'never' ? null : recurrenceDraft.endDate,
    };

    await onSubmit({
      createInput,
      delegationAction: delegationDraft.enabled
        ? delegationDraft.mode === 'recurring' && recurrenceDraft.recurrenceType !== 'none'
          ? {
            type: 'save',
            input: recurrenceDraft.recurrenceType === 'weekly'
              || recurrenceDraft.recurrenceType === 'monthly'
              || recurrenceDraft.recurrenceType === 'quarterly'
              || recurrenceDraft.recurrenceType === 'yearly'
              ? {
                mode: 'recurring',
                recurringStrategy: delegationDraft.recurringStrategy,
                date: delegationDraft.recurringStrategy === 'alternating' ? selectedDate : null,
              }
              : { mode: 'recurring', weekdays: delegationDraft.weekdays },
          }
          : { type: 'save', input: { mode: 'singleDate', date: selectedDate } }
        : { type: 'clear' },
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="task-dialog-shell" onSubmit={handleSubmit}>
        <DialogHeader title={mode === 'day' ? 'Einmalige Aufgabe' : 'Aufgabe hinzufügen'} />

        {mode === 'day' ? (
          <div className="task-date-stack">
            <button
              type="button"
              className={`task-date-pill task-date-pill-button ${isDatePickerOpen ? 'is-open' : ''}`}
              onClick={() => setIsDatePickerOpen((current) => !current)}
              aria-expanded={isDatePickerOpen}
            >
              Datum: {formatDateLabel(draftDate)}
            </button>

            {isDatePickerOpen ? (
              <label className="task-field">
                <span className="task-field-label">Anderes Datum wählen</span>
                <input
                  className="input"
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <label className="task-field">
          <span className="task-field-label">Aufgabe</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="task-field">
          <span className="task-field-label">Notiz</span>
          <textarea className="input task-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </label>

        {mode === 'responsibility' ? (
          <>
            <div className="task-stack">
              <p className="task-section-title">Wiederholt sich diese Aufgabe?</p>
              <RecurrenceFields draft={recurrenceDraft} onChange={setRecurrenceDraft} />
            </div>

            <div className="task-stack">
              <p className="task-section-title">Soll die Aufgabe übergeben werden?</p>
              <DelegationFields
                draft={delegationDraft}
                canUseRecurring={recurrenceDraft.recurrenceType !== 'none'}
                recurrenceType={recurrenceDraft.recurrenceType}
                selectedDate={selectedDate}
                onChange={setDelegationDraft}
              />
            </div>
          </>
        ) : null}

        <DialogActions submitLabel="Speichern" onCancel={onClose} disabled={!title.trim()} busy={isSubmitting} />
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
  onDelete,
  onSubmit,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  selectedDate: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onDelete: (taskId: string) => Promise<void>;
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
          ? currentRecurrenceDraft.recurrenceType === 'weekly'
            || currentRecurrenceDraft.recurrenceType === 'monthly'
            || currentRecurrenceDraft.recurrenceType === 'quarterly'
            || currentRecurrenceDraft.recurrenceType === 'yearly'
            ? {
              mode: 'recurring',
              recurringStrategy: currentDelegationDraft.recurringStrategy,
              date: currentDelegationDraft.recurringStrategy === 'alternating' ? selectedDate : null,
            }
            : { mode: 'recurring', weekdays: currentDelegationDraft.weekdays }
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
          <p className="task-section-title">Soll die Aufgabe übergeben werden?</p>
          <DelegationFields
            draft={currentDelegationDraft}
            canUseRecurring={allowRecurringDelegation}
            recurrenceType={currentRecurrenceDraft.recurrenceType}
            selectedDate={selectedDate}
            onChange={setDelegationDraft}
          />
        </div>

        <DialogActions
          submitLabel="Speichern"
          onCancel={onClose}
          disabled={!title.trim()}
          busy={isSubmitting}
          leadingAction={(
            <button
              type="button"
              className="task-delete-action"
              onClick={() => {
                const confirmed = window.confirm('Aufgabe wirklich löschen?');
                if (!confirmed) return;
                void onDelete(currentTask.id);
              }}
            >
              <TrashIcon />
              <span>Löschen</span>
            </button>
          )}
        />
      </form>
    </Modal>
  );
}

export function TaskChatModal({
  isOpen,
  task,
  onClose,
  hasThread,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  onClose: () => void;
  hasThread?: boolean;
}) {
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  useEffect(() => {
    if (!isOpen || !task) return;
    setChatMessage('');
  }, [isOpen, task]);

  if (!task) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="task-dialog-shell">
        <DialogHeader title={hasThread ? 'Chat öffnen' : 'Nachricht senden'} subtitle={task.displayTitle} />
        <p className="task-inline-hint">Diese Nachricht gehört zu dieser Aufgabe.</p>
        <textarea
          className="input task-textarea"
          value={chatMessage}
          onChange={(event) => setChatMessage(event.target.value)}
          placeholder="Was möchtest du dazu sagen?"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button type="button" className="task-secondary-button" onClick={onClose}>
            Schließen
          </button>
          <button
            type="button"
            className="task-primary-button"
            disabled={!chatMessage.trim() || isSendingChatMessage}
            onClick={() => {
              if (!chatMessage.trim()) return;
              setIsSendingChatMessage(true);
              void sendTaskMessageByTask(task.id, chatMessage)
                .then(() => {
                  setChatMessage('');
                  onClose();
                })
                .finally(() => setIsSendingChatMessage(false));
            }}
          >
            {isSendingChatMessage ? 'Sendet …' : 'Senden'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function TaskInstanceEditModal({
  isOpen,
  task,
  instanceDate,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  instanceDate: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: TaskInstanceEditSubmit) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [delegationDraft, setDelegationDraft] = useState<DelegationDraft | null>(null);
  useEffect(() => {
    if (!isOpen || !task || !instanceDate) return;
    const instanceState = resolveTaskInstanceState(task, instanceDate);
    setTitle(instanceState.displayTitle);
    setNotes(instanceState.displayNotes ?? '');
    setDelegationDraft(buildInitialInstanceDelegationDraft(task, instanceDate));
  }, [instanceDate, isOpen, task]);

  if (!task || !instanceDate || !delegationDraft) {
    return null;
  }

  const exactSingleDateDelegation = findSingleDateDelegation(task, instanceDate);
  const instanceState = resolveTaskInstanceState(task, instanceDate);
  const delegationComesFromSeries = instanceState.appliedDelegation?.mode === 'recurring' && !exactSingleDateDelegation;
  const currentInstanceDate = instanceDate;
  const currentDelegationDraft = delegationDraft;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    await onSubmit({
      instanceDate: currentInstanceDate,
      taskUpdate: {
        title,
        notes,
      },
      delegationAction: delegationComesFromSeries
        ? { type: 'clear' }
        : currentDelegationDraft.enabled
          ? { type: 'save', input: { mode: 'singleDate', date: currentInstanceDate } }
          : { type: 'clear' },
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="task-dialog-shell" onSubmit={handleSubmit}>
        <DialogHeader
          title="Nur heute"
          subtitle={`${formatDateLabel(instanceDate)} · ${getTaskTimingLabel(task)}`}
        />

        <label className="task-field">
          <span className="task-field-label">Aufgabe</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="task-field">
          <span className="task-field-label">Notiz</span>
          <textarea className="input task-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <div className="task-stack">
          <p className="task-section-title">Übergabe</p>
          {delegationComesFromSeries ? (
            <p className="task-inline-hint">
              Diese Aufgabe wird über die ganze Serie übergeben. Änderungen dafür machst du in der Serie.
            </p>
          ) : (
            <DelegationFields
              draft={delegationDraft}
              canUseRecurring={false}
              recurrenceType="none"
              selectedDate={instanceDate}
              onChange={setDelegationDraft}
            />
          )}
        </div>

        <DialogActions submitLabel="Speichern" onCancel={onClose} disabled={!title.trim()} busy={isSubmitting} />
      </form>
    </Modal>
  );
}

export function TaskEditScopeModal({
  isOpen,
  task,
  selectedDate,
  onClose,
  onEditSeries,
  onEditInstance,
}: {
  isOpen: boolean;
  task: TaskOverviewItem | null;
  selectedDate: string;
  onClose: () => void;
  onEditSeries: () => void;
  onEditInstance: () => void;
}) {
  if (!task) {
    return null;
  }

  const instanceDate = resolveTaskInstanceDate(task, selectedDate);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="task-dialog-shell">
        <DialogHeader title="Was möchtest du ändern?" subtitle={task.displayTitle} />

        <div className="task-scope-stack">
          {instanceDate ? (
            <button type="button" className="task-scope-option" onClick={onEditInstance}>
              <strong>Nur heute</strong>
              <span>{formatDateLabel(instanceDate)}</span>
            </button>
          ) : null}

          <button type="button" className="task-scope-option" onClick={onEditSeries}>
            <strong>Ganze Serie</strong>
            <span>{getTaskTimingLabel(task)}</span>
          </button>
        </div>

        <button type="button" className="task-secondary-button" onClick={onClose}>
          Abbrechen
        </button>
      </div>
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
        ? currentTask.recurrenceType === 'weekly'
          || currentTask.recurrenceType === 'monthly'
          || currentTask.recurrenceType === 'quarterly'
          || currentTask.recurrenceType === 'yearly'
          ? {
            mode: 'recurring',
            recurringStrategy: currentDraft.recurringStrategy,
            date: currentDraft.recurringStrategy === 'alternating' ? selectedDate : null,
          }
          : { mode: 'recurring', weekdays: currentDraft.weekdays }
        : { mode: 'singleDate', date: selectedDate },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form className="task-dialog-shell" onSubmit={handleSubmit}>
        <DialogHeader title="Übergeben" subtitle="Wie soll diese Aufgabe übergeben werden?" />

        <DelegationFields
          draft={{ ...currentDraft, enabled: true }}
          canUseRecurring={canUseRecurring}
          recurrenceType={currentTask.recurrenceType}
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
            {isSubmitting ? 'Speichert …' : 'Übergeben'}
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
            Übergeben
          </button>
          <button type="button" className="task-secondary-button" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </Modal>
  );
}
