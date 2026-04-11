'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryFilterButtons } from '@/components/home/CategoryFilterButtons';
import { ResponsibilityCard } from '@/components/home/ResponsibilityCard';
import { ResponsibilityCardDetails } from '@/components/home/ResponsibilityCardDetails';
import {
  TaskActionModal,
  TaskComposerModal,
  TaskDelegationModal,
  TaskEditModal,
  type TaskEditSubmit,
} from '@/components/home/TaskDialogs';
import { SkeletonCategoryCard } from '@/components/home/SkeletonCategoryCard';
import { SortToggle } from '@/components/home/SortToggle';
import { WeeklyDateStrip } from '@/components/home/WeeklyDateStrip';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import {
  extractRelevantCategories,
  listenToResponsibilitiesForUser,
  sortCategoriesByRelevance,
  sortResponsibilities,
  updateResponsibilityPriority,
  type Responsibility,
  type ResponsibilityPriority,
} from '@/services/responsibilities.service';
import { addDays, buildWeek, formatDateLabel, isToday, startOfWeek, toDateKey } from '@/services/task-date';
import { getTaskTimingLabel } from '@/services/tasks.logic';
import { clearTaskDelegation, createTask, fetchTaskOverview, saveTaskDelegation, updateTask } from '@/services/tasks.service';
import { isSuperuserProfile } from '@/services/user-profile.service';
import type { QuizCategory } from '@/types/quiz';
import type { SaveTaskDelegationInput, TaskOverviewItem } from '@/types/tasks';

type SortMode = 'relevance' | 'area';

type ComposerState =
  | { mode: 'day' }
  | { mode: 'responsibility'; responsibility: Responsibility };

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

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 3.5 2 2" />
      <path d="M4 13.9V16h2.1L15 7.1 12.9 5z" />
    </svg>
  );
}

function getTaskChips(task: TaskOverviewItem) {
  const chips: string[] = [];

  if (task.recurrenceType === 'none') {
    chips.push('Einmalig');
  } else {
    chips.push(getTaskTimingLabel(task));
  }

  if (task.isDelegated) {
    chips.push('Delegiert');
  }

  return chips;
}

export default function PersonalHomePage() {
  const router = useRouter();
  const today = useMemo(() => toDateKey(new Date()), []);
  const [userFirstName, setUserFirstName] = useState('');
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuizCategory | 'all' | null>('all');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [orderedResponsibilityIds, setOrderedResponsibilityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleWeekStart, setVisibleWeekStart] = useState(startOfWeek(today));
  const [dayTasks, setDayTasks] = useState<TaskOverviewItem[]>([]);
  const [responsibilityTasks, setResponsibilityTasks] = useState<TaskOverviewItem[]>([]);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isTaskMutationPending, setIsTaskMutationPending] = useState(false);
  const [taskRefreshNonce, setTaskRefreshNonce] = useState(0);
  const [composerState, setComposerState] = useState<ComposerState | null>(null);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [delegatingTaskId, setDelegatingTaskId] = useState<string | null>(null);
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

  const relevantCategories = useMemo(
    () => sortCategoriesByRelevance(extractRelevantCategories(responsibilities), responsibilities),
    [responsibilities],
  );

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

  const filteredResponsibilities = useMemo(() => {
    if (activeFilter === 'all' || !activeFilter) return sortedResponsibilities;
    return sortedResponsibilities.filter((item) => item.categoryKey === activeFilter);
  }, [sortedResponsibilities, activeFilter]);

  const responsibilityTasksByCard = useMemo(() => responsibilityTasks.reduce<Map<string, TaskOverviewItem[]>>((map, task) => {
    if (!task.responsibilityId) return map;
    const bucket = map.get(task.responsibilityId) ?? [];
    bucket.push(task);
    map.set(task.responsibilityId, bucket);
    return map;
  }, new Map()), [responsibilityTasks]);

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskOverviewItem>();
    [...dayTasks, ...responsibilityTasks].forEach((task) => map.set(task.id, task));
    return map;
  }, [dayTasks, responsibilityTasks]);

  const activeTask = actionTaskId ? taskMap.get(actionTaskId) ?? null : null;
  const editingTask = editingTaskId ? taskMap.get(editingTaskId) ?? null : null;
  const delegatingTask = delegatingTaskId ? taskMap.get(delegatingTaskId) ?? null : null;

  async function handlePriorityChange(responsibility: Responsibility, newPriority: ResponsibilityPriority) {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityPriority(familyId, responsibility.id, newPriority, userId);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  }

  async function handleCreateTask(input: Parameters<typeof createTask>[0]) {
    setIsTaskMutationPending(true);
    setTaskError(null);
    try {
      await createTask(input);
      if (input.taskType === 'dayTask' && input.selectedDate && input.selectedDate !== selectedDate) {
        setSelectedDate(input.selectedDate);
        setVisibleWeekStart(startOfWeek(input.selectedDate));
      }
      setComposerState(null);
      setTaskRefreshNonce((current) => current + 1);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht erstellt werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  async function handleEditTask(input: TaskEditSubmit) {
    if (!editingTask) return;

    setIsTaskMutationPending(true);
    setTaskError(null);

    try {
      await updateTask(editingTask.id, input.taskUpdate);

      if (input.delegationAction.type === 'clear') {
        await clearTaskDelegation(editingTask.id);
      } else {
        await saveTaskDelegation(editingTask.id, input.delegationAction.input);
      }

      setEditingTaskId(null);
      setActionTaskId(null);
      setTaskRefreshNonce((current) => current + 1);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Aufgabe konnte nicht aktualisiert werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  async function handleSaveDelegation(input: SaveTaskDelegationInput) {
    if (!delegatingTask) return;

    setIsTaskMutationPending(true);
    setTaskError(null);

    try {
      await saveTaskDelegation(delegatingTask.id, input);
      setDelegatingTaskId(null);
      setActionTaskId(null);
      setTaskRefreshNonce((current) => current + 1);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Delegation konnte nicht gespeichert werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  async function handleClearDelegation() {
    if (!delegatingTask) return;

    setIsTaskMutationPending(true);
    setTaskError(null);

    try {
      await clearTaskDelegation(delegatingTask.id);
      setDelegatingTaskId(null);
      setActionTaskId(null);
      setTaskRefreshNonce((current) => current + 1);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'Delegation konnte nicht entfernt werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
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

                <button
                  type="button"
                  className="task-inline-add-button"
                  onClick={() => setComposerState({ mode: 'day' })}
                >
                  <PlusIcon />
                  <span>Einmalige Aufgabe</span>
                </button>
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
                  {dayTasks.map((task) => {
                    const responsibility = task.responsibilityId ? responsibilityMap.get(task.responsibilityId) : null;
                    return (
                      <div
                        key={task.id}
                        className="task-day-row"
                        onClick={() => setActionTaskId(task.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setActionTaskId(task.id);
                          }
                        }}
                      >
                        <div className="task-row-copy">
                          <strong className="task-row-title">{task.title}</strong>
                          {responsibility ? (
                            <span className="task-row-subtitle">{responsibility.title}</span>
                          ) : task.categoryKey ? (
                            <span className="task-row-subtitle">{categoryLabelMap[task.categoryKey] || task.categoryKey}</span>
                          ) : null}
                          <div className="task-chip-row">
                            {getTaskChips(task).map((chip) => (
                              <span key={`${task.id}-${chip}`} className="task-chip">{chip}</span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="task-row-icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingTaskId(task.id);
                          }}
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}

        <CategoryFilterButtons
          categories={relevantCategories}
          activeCategory={activeFilter}
          onSelect={(category) => setActiveFilter(category)}
        />

        <div className="home-toolbar-row">
          <p className="caption" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            {filteredResponsibilities.length} {filteredResponsibilities.length === 1 ? 'Verantwortung' : 'Verantwortungen'}
          </p>
          <SortToggle sortMode={sortMode} onChange={setSortMode} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonCategoryCard key={index} />)
          ) : filteredResponsibilities.length === 0 ? (
            <div style={{ padding: '24px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="h2" style={{ margin: 0 }}>Du hast aktuell keine Verantwortungen</h2>
              <p className="body" style={{ margin: '12px 0 0 0', color: 'var(--color-text-secondary)' }}>
                Sobald dir etwas zugeordnet ist, erscheint es hier
              </p>
            </div>
          ) : (
            filteredResponsibilities.map((responsibility) => {
              const cardTasks = responsibilityTasksByCard.get(responsibility.id) ?? [];
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
                    cardTasks.length ? (
                      <div className="responsibility-task-list">
                        {cardTasks.map((task) => (
                          <div key={task.id} className="responsibility-task-row">
                            <div className="task-row-copy">
                              <strong className="task-row-title">{task.title}</strong>
                              <span className="task-row-subtitle">{getTaskTimingLabel(task)}</span>
                            </div>
                            <button
                              type="button"
                              className="task-row-icon-button"
                              aria-label={`Aufgabe ${task.title} bearbeiten`}
                              onClick={() => setEditingTaskId(task.id)}
                            >
                              <PencilIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="caption" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                        Keine Aufgaben
                      </p>
                    )
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
        isSubmitting={isTaskMutationPending}
        onClose={() => setComposerState(null)}
        onSubmit={handleCreateTask}
      />

      <TaskActionModal
        isOpen={Boolean(actionTaskId)}
        task={activeTask}
        selectedDate={selectedDate}
        responsibilityTitle={activeTask?.responsibilityId ? responsibilityMap.get(activeTask.responsibilityId)?.title : null}
        onClose={() => setActionTaskId(null)}
        onEdit={() => {
          if (!activeTask) return;
          setActionTaskId(null);
          setEditingTaskId(activeTask.id);
        }}
        onDelegate={() => {
          if (!activeTask) return;
          setActionTaskId(null);
          setDelegatingTaskId(activeTask.id);
        }}
      />

      <TaskEditModal
        isOpen={Boolean(editingTaskId)}
        task={editingTask}
        selectedDate={selectedDate}
        isSubmitting={isTaskMutationPending}
        onClose={() => setEditingTaskId(null)}
        onSubmit={handleEditTask}
      />

      <TaskDelegationModal
        isOpen={Boolean(delegatingTaskId)}
        task={delegatingTask}
        selectedDate={selectedDate}
        isSubmitting={isTaskMutationPending}
        onClose={() => setDelegatingTaskId(null)}
        onSubmit={handleSaveDelegation}
        onClear={handleClearDelegation}
      />
    </div>
  );
}
