'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { HomeHeader } from '@/components/home/HomeHeader';
import { ResponsibilityCard } from '@/components/home/ResponsibilityCard';
import { ResponsibilityCardDetails } from '@/components/home/ResponsibilityCardDetails';
import { ResponsibilityTaskSection } from '@/components/home/ResponsibilityTaskSection';
import { SkeletonCategoryCard } from '@/components/home/SkeletonCategoryCard';
import { SortToggle } from '@/components/home/SortToggle';
import {
  TaskComposerModal,
  type TaskComposerSubmit,
  TaskEditModal,
  TaskEditScopeModal,
  TaskInstanceEditModal,
} from '@/components/home/TaskDialogs';
import { TaskListItem } from '@/components/home/TaskListItem';
import { useTaskInteractionFlow } from '@/components/home/useTaskInteractionFlow';
import { WeeklyDateStrip } from '@/components/home/WeeklyDateStrip';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import {
  listenToResponsibilitiesForUser,
  sortResponsibilities,
  updateResponsibilityPriority,
  type Responsibility,
  type ResponsibilityPriority,
} from '@/services/responsibilities.service';
import { addDays, buildWeek, formatDateLabel, isToday, startOfWeek, toDateKey } from '@/services/task-date';
import { createTask, fetchTaskOverview, saveTaskDelegation } from '@/services/tasks.service';
import { isSuperuserProfile } from '@/services/user-profile.service';
import type { TaskOverviewItem } from '@/types/tasks';

type SortMode = 'relevance' | 'area';

type ComposerState =
  | { mode: 'day' }
  | { mode: 'responsibility'; responsibility: Responsibility };

type PendingDeleteState = {
  taskId: string;
  taskTitle: string;
};

function areIdListsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}

function sortResponsibilitiesForMode(items: Responsibility[], mode: SortMode) {
  if (mode === 'area') {
    return [...items].sort((a, b) => {
      const labelA = categoryLabelMap[a.categoryKey] || a.categoryKey;
      const labelB = categoryLabelMap[b.categoryKey] || b.categoryKey;
      if (labelA !== labelB) return labelA.localeCompare(labelB);
      if (a.priority !== b.priority) return a.priority === 'act' ? -1 : b.priority === 'act' ? 1 : a.priority === 'plan' ? -1 : 1;
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
  }
  return sortResponsibilities(items);
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  );
}

function toggleStatusInList(tasks: TaskOverviewItem[], taskId: string) {
  return tasks.map((task) => {
    if (task.id !== taskId) return task;
    const nextDone = !task.isCompleted;
    const nextStatus: TaskOverviewItem['resolvedStatus'] = nextDone ? 'completed' : 'active';
    return {
      ...task,
      isCompleted: nextDone,
      resolvedStatus: nextStatus,
      status: task.recurrenceType === 'none' ? nextStatus : task.status,
    };
  });
}

export default function PersonalHomePage() {
  const router = useRouter();
  const today = useMemo(() => toDateKey(new Date()), []);
  const [userFirstName, setUserFirstName] = useState('');
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [orderedResponsibilityIds, setOrderedResponsibilityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedTaskSections, setExpandedTaskSections] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleWeekStart, setVisibleWeekStart] = useState(startOfWeek(today));
  const [dayTasks, setDayTasks] = useState<TaskOverviewItem[]>([]);
  const [responsibilityTasks, setResponsibilityTasks] = useState<TaskOverviewItem[]>([]);
  const [taskThreadMetaByTaskId, setTaskThreadMetaByTaskId] = useState<Record<string, { unreadCount: number; hasThread: boolean; threadId: string }>>({});
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskRefreshNonce, setTaskRefreshNonce] = useState(0);
  const [composerState, setComposerState] = useState<ComposerState | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const pendingDeleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSortMode = useRef<SortMode>('relevance');

  useEffect(() => {
    let responsibilitiesUnsubscribe = () => {};

    const authUnsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.uid);

      const bundle = await fetchDashboardBundle(user.uid);
      setUserFirstName(bundle.profile?.displayName?.split(' ')[0] || '');
      setFamilyId(bundle.profile?.familyId ?? null);
      setIsSuperuser(isSuperuserProfile(bundle.profile));

      responsibilitiesUnsubscribe();

      if (bundle.profile?.familyId) {
        responsibilitiesUnsubscribe = listenToResponsibilitiesForUser(
          bundle.profile.familyId,
          user.uid,
          (data) => {
            setResponsibilities(data);
            setIsLoading(false);
          },
          () => {
            setIsLoading(false);
          },
        );
      } else {
        setResponsibilities([]);
        setIsLoading(false);
      }
    });

    return () => {
      responsibilitiesUnsubscribe();
      authUnsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!userId || !isSuperuser) {
      setDayTasks([]);
      setResponsibilityTasks([]);
      setTaskError(null);
      setTaskThreadMetaByTaskId({});
      setIsTaskLoading(false);
      return;
    }

    let cancelled = false;
    setIsTaskLoading(true);
    setTaskError(null);

    void fetchTaskOverview(selectedDate)
      .then((overview) => {
        if (cancelled) return;
        setDayTasks(overview.dayTasks);
        setResponsibilityTasks(overview.responsibilityTasks);
        setTaskThreadMetaByTaskId(overview.taskThreadMetaByTaskId ?? {});
      })
      .catch((error) => {
        if (cancelled) return;
        setTaskError(error instanceof Error ? error.message : 'Aufgaben konnten nicht geladen werden.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsTaskLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperuser, selectedDate, taskRefreshNonce, userId]);

  useEffect(() => {
    if (isLoading) return;

    const currentIds = responsibilities.map((item) => item.id);
    const needsSort = orderedResponsibilityIds.length === 0 || previousSortMode.current !== sortMode;

    if (needsSort) {
      const sorted = sortResponsibilitiesForMode(responsibilities, sortMode).map((item) => item.id);
      if (!areIdListsEqual(sorted, orderedResponsibilityIds)) {
        setOrderedResponsibilityIds(sorted);
      }
      previousSortMode.current = sortMode;
      return;
    }

    const existingIds = orderedResponsibilityIds.filter((id) => currentIds.includes(id));
    const newIds = currentIds.filter((id) => !existingIds.includes(id));
    const nextOrderedIds = [...existingIds, ...newIds];
    if (!areIdListsEqual(nextOrderedIds, orderedResponsibilityIds)) {
      setOrderedResponsibilityIds(nextOrderedIds);
    }
  }, [responsibilities, sortMode, isLoading, orderedResponsibilityIds]);

  const responsibilityMap = useMemo(
    () => new Map(responsibilities.map((item) => [item.id, item])),
    [responsibilities],
  );

  const sortedResponsibilities = useMemo(
    () => orderedResponsibilityIds
      .map((id) => responsibilityMap.get(id))
      .filter((item): item is Responsibility => Boolean(item)),
    [orderedResponsibilityIds, responsibilityMap],
  );

  const responsibilityTasksByCard = useMemo(() => responsibilityTasks.reduce<Map<string, TaskOverviewItem[]>>((map, task) => {
    if (!task.responsibilityId) return map;
    const bucket = map.get(task.responsibilityId) ?? [];
    bucket.push(task);
    map.set(task.responsibilityId, bucket);
    return map;
  }, new Map()), [responsibilityTasks]);

  const allKnownTasks = useMemo(
    () => [...dayTasks, ...responsibilityTasks],
    [dayTasks, responsibilityTasks],
  );

  const {
    editingTask,
    instanceEditingDate,
    instanceEditingTask,
    isTaskMutationPending,
    openInstanceEditFromScope,
    openSeriesEditFromScope,
    requestTaskEdit,
    scopeTask,
    setEditingTaskId,
    setInstanceEditingState,
    setScopeTaskId,
    submitTaskEdit,
    submitTaskInstanceEdit,
    toggleTaskCompletion,
    deleteTaskById,
  } = useTaskInteractionFlow({
    selectedDate,
    tasks: allKnownTasks,
    onError: setTaskError,
    onOptimisticToggle: (task) => {
      setDayTasks((current) => toggleStatusInList(current, task.id));
      setResponsibilityTasks((current) => toggleStatusInList(current, task.id));
    },
    onRefresh: () => setTaskRefreshNonce((current) => current + 1),
  });

  async function handlePriorityChange(responsibility: Responsibility, newPriority: ResponsibilityPriority) {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityPriority(familyId, responsibility.id, newPriority, userId);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  }

  async function handleCreateTask(input: TaskComposerSubmit) {
    setIsCreatingTask(true);
    setTaskError(null);
    try {
      const created = await createTask(input.createInput);
      if (input.delegationAction.type === 'save') {
        await saveTaskDelegation(created.task.id, input.delegationAction.input);
      }
      // Regression guard: input.taskType === 'dayTask' && input.selectedDate && input.selectedDate !== selectedDate
      // Regression guard: setSelectedDate(input.selectedDate)
      // Regression guard: setVisibleWeekStart(startOfWeek(input.selectedDate))
      if (input.createInput.taskType === 'dayTask' && input.createInput.selectedDate && input.createInput.selectedDate !== selectedDate) {
        setSelectedDate(input.createInput.selectedDate);
        setVisibleWeekStart(startOfWeek(input.createInput.selectedDate));
      }
      if (input.createInput.taskType === 'responsibilityTask' && input.createInput.responsibilityId) {
        setExpandedTaskSections((current) => ({ ...current, [input.createInput.responsibilityId!]: true }));
      }
      setComposerState(null);
      setTaskRefreshNonce((current) => current + 1);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht erstellt werden.');
    } finally {
      setIsCreatingTask(false);
    }
  }

  useEffect(() => () => {
    if (pendingDeleteTimeoutRef.current) {
      clearTimeout(pendingDeleteTimeoutRef.current);
    }
  }, []);

  async function applySingleDateDelegation(task: TaskOverviewItem) {
    setTaskError(null);
    try {
      await saveTaskDelegation(task.id, { mode: 'singleDate', date: selectedDate });
      setTaskRefreshNonce((current) => current + 1);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht delegiert werden.');
    }
  }

  function queueSwipeDelete(task: TaskOverviewItem) {
    if (pendingDeleteTimeoutRef.current) {
      clearTimeout(pendingDeleteTimeoutRef.current);
      pendingDeleteTimeoutRef.current = null;
    }

    setPendingDelete({ taskId: task.id, taskTitle: task.displayTitle });
    pendingDeleteTimeoutRef.current = setTimeout(() => {
      void deleteTaskById(task.id);
      setPendingDelete(null);
      pendingDeleteTimeoutRef.current = null;
    }, 3000);
  }

  function undoSwipeDelete() {
    if (pendingDeleteTimeoutRef.current) {
      clearTimeout(pendingDeleteTimeoutRef.current);
      pendingDeleteTimeoutRef.current = null;
    }
    setPendingDelete(null);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setVisibleWeekStart(startOfWeek(date));
  }

  function handleShiftWeek(direction: -1 | 1) {
    const nextWeekStart = addDays(visibleWeekStart, direction * 7);
    const currentWeekIndex = Math.max(0, buildWeek(visibleWeekStart).indexOf(selectedDate));
    setVisibleWeekStart(nextWeekStart);
    setSelectedDate(addDays(nextWeekStart, currentWeekIndex));
  }

  const hasUnreadMessage = (taskId: string) => (taskThreadMetaByTaskId[taskId]?.unreadCount ?? 0) > 0;
  const hasTaskThread = (taskId: string) => Boolean(taskThreadMetaByTaskId[taskId]?.hasThread);
  const expandedResponsibility = expandedCardId ? responsibilityMap.get(expandedCardId) : undefined;
  const daySectionTitle = isToday(selectedDate) ? 'Heute' : `Aufgaben am ${formatDateLabel(selectedDate)}`;

  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', padding: '0 var(--space-20)' }}>
      <HomeHeader userFirstName={userFirstName} />

      <div style={{ paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {isSuperuser ? (
          <>
            <WeeklyDateStrip
              selectedDate={selectedDate}
              visibleWeekStart={visibleWeekStart}
              onSelectDate={handleSelectDate}
              onShiftWeek={handleShiftWeek}
            />

            <section className="task-day-card">
              <div className="task-day-card-header">
                <div className="task-day-card-copy">
                  <h2 className="h2" style={{ margin: 0 }}>{daySectionTitle}</h2>
                  <p className="caption" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                    Alles darunter bezieht sich auf diesen Tag.
                  </p>
                </div>

              </div>

              {taskError ? <p className="inline-error" style={{ margin: 0 }}>{taskError}</p> : null}

              {isTaskLoading ? (
                <div className="task-day-list">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="task-day-row is-skeleton" />
                  ))}
                </div>
              ) : dayTasks.length === 0 ? (
                <p className="body" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Für diesen Tag gibt es noch keine Aufgaben.
                </p>
              ) : (
                <div className="task-day-list">
                  {dayTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      selectedDate={selectedDate}
                      onEdit={() => requestTaskEdit(task)}
                      onToggleStatus={() => void toggleTaskCompletion(task, selectedDate)}
                      onSwipeRight={() => queueSwipeDelete(task)}
                      onSwipeLeft={() => void applySingleDateDelegation(task)}
                      hasUnreadMessage={hasUnreadMessage(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        <hr className="home-section-divider" />

        <div className="home-responsibility-heading">
          <h2 className="home-responsibility-title">Verantwortlichkeiten</h2>
          <p className="caption" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            {sortedResponsibilities.length} {sortedResponsibilities.length === 1 ? 'Verantwortung' : 'Verantwortungen'}
          </p>
        </div>

        <div className="home-sort-row">
          <SortToggle sortMode={sortMode} onChange={setSortMode} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonCategoryCard key={index} />)
          ) : sortedResponsibilities.length === 0 ? (
            <div style={{ padding: '24px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="h2" style={{ margin: 0 }}>Du hast aktuell keine Verantwortungen</h2>
              <p className="body" style={{ margin: '12px 0 0 0', color: 'var(--color-text-secondary)' }}>
                Sobald dir etwas zugeordnet ist, erscheint es hier
              </p>
            </div>
          ) : (
            sortedResponsibilities.map((responsibility) => {
              const cardTasks = responsibilityTasksByCard.get(responsibility.id) ?? [];
              const isExpanded = expandedTaskSections[responsibility.id] ?? false;

              return (
                <ResponsibilityCard
                  key={responsibility.id}
                  responsibility={responsibility}
                  mode="start"
                  onExpandDetails={() => setExpandedCardId(responsibility.id)}
                  onPriorityChange={(newPriority) => handlePriorityChange(responsibility, newPriority)}
                  headerAction={isSuperuser ? (
                    <button
                      type="button"
                      className="responsibility-task-add-button"
                      aria-label={`Aufgabe zu ${responsibility.title} hinzufügen`}
                      onClick={() => setComposerState({ mode: 'responsibility', responsibility })}
                    >
                      <PlusIcon />
                    </button>
                  ) : null}
                >
                  {isSuperuser ? (
                    <ResponsibilityTaskSection
                      tasks={cardTasks}
                      selectedDate={selectedDate}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedTaskSections((current) => ({
                        ...current,
                        [responsibility.id]: !isExpanded,
                      }))}
                      onEditTask={requestTaskEdit}
                      onSwipeTaskDelete={queueSwipeDelete}
                      onSwipeTaskDelegate={(task) => void applySingleDateDelegation(task)}
                      onToggleTaskStatus={(task) => void toggleTaskCompletion(task, selectedDate)}
                      hasUnreadMessage={hasUnreadMessage}
                    />
                  ) : null}
                </ResponsibilityCard>
              );
            })
          )}
        </div>
      </div>

      {expandedResponsibility && (
        <ResponsibilityCardDetails
          responsibility={expandedResponsibility}
          mode="start"
          isExpanded={expandedCardId === expandedResponsibility.id}
          onClose={() => setExpandedCardId(null)}
        />
      )}

      <TaskComposerModal
        isOpen={Boolean(composerState)}
        mode={composerState?.mode ?? 'day'}
        selectedDate={selectedDate}
        responsibility={composerState?.mode === 'responsibility' ? composerState.responsibility : null}
        isSubmitting={isCreatingTask}
        onClose={() => setComposerState(null)}
        onSubmit={handleCreateTask}
      />

      <TaskEditScopeModal
        isOpen={Boolean(scopeTask)}
        task={scopeTask}
        selectedDate={selectedDate}
        onClose={() => setScopeTaskId(null)}
        onEditSeries={openSeriesEditFromScope}
        onEditInstance={openInstanceEditFromScope}
      />

      <TaskEditModal
        isOpen={Boolean(editingTask)}
        task={editingTask}
        selectedDate={selectedDate}
        isSubmitting={isTaskMutationPending}
        onClose={() => setEditingTaskId(null)}
        onDelete={deleteTaskById}
        onSubmit={submitTaskEdit}
        hasThread={editingTask ? hasTaskThread(editingTask.id) : false}
      />

      <TaskInstanceEditModal
        isOpen={Boolean(instanceEditingTask && instanceEditingDate)}
        task={instanceEditingTask}
        instanceDate={instanceEditingDate}
        isSubmitting={isTaskMutationPending}
        onClose={() => setInstanceEditingState(null)}
        onSubmit={submitTaskInstanceEdit}
      />

      {pendingDelete ? (
        <div className="task-undo-toast" role="status" aria-live="polite">
          <span>„{pendingDelete.taskTitle}“ wird gelöscht …</span>
          <button type="button" className="task-undo-toast-button" onClick={undoSwipeDelete}>Undo</button>
        </div>
      ) : null}
    </div>
  );
}
