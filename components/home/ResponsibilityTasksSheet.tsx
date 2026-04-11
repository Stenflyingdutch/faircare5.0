import { Modal } from '@/components/Modal';
import { TaskListItem } from '@/components/home/TaskListItem';
import type { TaskOverviewItem } from '@/types/tasks';

export function ResponsibilityTasksSheet({
  isOpen,
  onClose,
  onEditTask,
  onToggleTaskStatus,
  responsibilityTitle,
  selectedDate,
  tasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  onEditTask: (task: TaskOverviewItem) => void;
  onToggleTaskStatus: (task: TaskOverviewItem) => void;
  responsibilityTitle: string;
  selectedDate: string;
  tasks: TaskOverviewItem[];
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="task-sheet-shell">
        <header className="task-sheet-header">
          <div className="task-sheet-copy">
            <p className="task-sheet-kicker">Zugeordnete Aufgaben</p>
            <h2 className="task-sheet-title">{responsibilityTitle}</h2>
            <p className="task-sheet-subtitle">
              {tasks.length === 1 ? '1 Aufgabe' : `${tasks.length} Aufgaben`}
            </p>
          </div>
        </header>

        <div className="task-sheet-body">
          {tasks.length ? (
            <div className="responsibility-task-list">
              {tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  selectedDate={selectedDate}
                  onEdit={() => onEditTask(task)}
                  onToggleStatus={() => onToggleTaskStatus(task)}
                />
              ))}
            </div>
          ) : (
            <p className="responsibility-task-empty">Noch keine Aufgaben für dieses Verantwortungsgebiet.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
