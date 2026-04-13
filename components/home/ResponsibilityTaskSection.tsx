import { TaskListItem } from '@/components/home/TaskListItem';
import type { TaskOverviewItem } from '@/types/tasks';

function ChevronIcon({ expanded }: { expanded: boolean }) {
  const path = expanded ? 'm5 12 5-5 5 5' : 'm5 8 5 5 5-5';
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function ResponsibilityTaskSection({
  currentUserId,
  emptyLabel = 'Noch keine Aufgaben',
  isExpanded,
  onEditTask,
  onChatTask,
  onReclaimDelegation,
  onSwipeTaskDelete,
  onSwipeTaskDelegate,
  onToggle,
  onToggleTaskStatus,
  selectedDate,
  tasks,
  unreadCountForTask,
  hasTaskMessages,
}: {
  currentUserId: string | null;
  emptyLabel?: string;
  isExpanded: boolean;
  onEditTask: (task: TaskOverviewItem) => void;
  onChatTask?: (task: TaskOverviewItem) => void;
  onReclaimDelegation?: (task: TaskOverviewItem) => void;
  onSwipeTaskDelete?: (task: TaskOverviewItem) => void;
  onSwipeTaskDelegate?: (task: TaskOverviewItem) => void;
  onToggle: () => void;
  onToggleTaskStatus: (task: TaskOverviewItem) => void;
  selectedDate: string;
  tasks: TaskOverviewItem[];
  unreadCountForTask?: (taskId: string) => number;
  hasTaskMessages?: (taskId: string) => boolean;
}) {

  return (
    <section className={`responsibility-task-section ${isExpanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="responsibility-task-toggle"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="responsibility-task-toggle-copy">
          <span className="responsibility-task-toggle-title">Aufgaben ({tasks.length})</span>
        </div>
        <ChevronIcon expanded={isExpanded} />
      </button>

      <div className={`responsibility-task-panel ${isExpanded ? 'is-expanded' : ''}`}>
        <div className="responsibility-task-panel-inner">
          {tasks.length ? (
            <div className="responsibility-task-list">
              {tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  currentUserId={currentUserId}
                  task={task}
                  selectedDate={selectedDate}
                  onEdit={() => onEditTask(task)}
                  onChat={onChatTask ? () => onChatTask(task) : undefined}
                  onReclaimDelegation={onReclaimDelegation ? () => onReclaimDelegation(task) : undefined}
                  onToggleStatus={() => onToggleTaskStatus(task)}
                  onSwipeLeft={() => onSwipeTaskDelegate?.(task)}
                  onSwipeRight={() => onSwipeTaskDelete?.(task)}
                  unreadCount={unreadCountForTask?.(task.id) ?? 0}
                  hasTaskMessages={hasTaskMessages?.(task.id) ?? false}
                />
              ))}
            </div>
          ) : (
            <p className="responsibility-task-empty">{emptyLabel}</p>
          )}
        </div>
      </div>
    </section>
  );
}
