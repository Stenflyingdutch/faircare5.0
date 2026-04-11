import { getTaskTimingLabel } from '@/services/tasks.logic';
import type { TaskOverviewItem } from '@/types/tasks';

function CheckIcon({ completed }: { completed: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7.2" />
      {completed ? <path d="m6.8 10 2.1 2.1 4.3-4.4" /> : null}
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 3.5 2 2" />
      <path d="M4 13.9V16h2.1L15 7.1 12.9 5z" />
    </svg>
  );
}

export function TaskListItem({
  task,
  selectedDate,
  onEdit,
  onToggleStatus,
}: {
  task: TaskOverviewItem;
  selectedDate: string;
  onEdit: () => void;
  onToggleStatus?: () => void;
}) {
  const canToggleStatus = task.recurrenceType === 'none'
    ? task.selectedDate === selectedDate
    : task.isDueOnSelectedDate;
  const showInstanceState = canToggleStatus;
  const chips = [getTaskTimingLabel(task)];

  if (showInstanceState && task.isDelegated) {
    chips.push('Delegiert');
  }

  if (showInstanceState && task.isCompleted) {
    chips.push('Erledigt');
  }

  return (
    <div
      className={`task-list-item ${canToggleStatus ? 'is-clickable' : ''} ${task.isCompleted ? 'is-completed' : ''}`}
      onClick={canToggleStatus ? onToggleStatus : undefined}
      role={canToggleStatus ? 'button' : undefined}
      tabIndex={canToggleStatus ? 0 : undefined}
      onKeyDown={canToggleStatus ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleStatus?.();
        }
      } : undefined}
    >
      <div className={`task-list-toggle ${task.isCompleted ? 'is-completed' : ''}`} aria-hidden="true">
        <CheckIcon completed={task.isCompleted} />
      </div>

      <div className="task-row-copy">
        <strong className={`task-row-title ${task.isCompleted ? 'is-completed' : ''} ${task.isDelegated ? 'is-delegated' : ''}`}>
          {task.displayTitle}
        </strong>
        {task.displayNotes ? <span className="task-row-note">{task.displayNotes}</span> : null}
        <div className="task-chip-row">
          {chips.map((chip) => (
            <span key={`${task.id}-${chip}`} className="task-chip">{chip}</span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="task-row-icon-button"
        aria-label={`Aufgabe ${task.displayTitle} bearbeiten`}
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
      >
        <PencilIcon />
      </button>
    </div>
  );
}
