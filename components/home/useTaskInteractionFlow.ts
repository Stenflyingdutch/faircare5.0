'use client';

import { useMemo, useState } from 'react';

import { clearTaskDelegation, deleteTask, saveTaskDelegation, updateTask, updateTaskInstance } from '@/services/tasks.service';
import { resolveTaskInstanceDate, resolveTaskInstanceState } from '@/services/tasks.logic';
import type { TaskOverviewItem } from '@/types/tasks';
import type { TaskEditSubmit, TaskInstanceEditSubmit } from '@/components/home/TaskDialogs';

type InstanceEditingState = {
  date: string;
  taskId: string;
};

export function useTaskInteractionFlow({
  currentUserId,
  selectedDate,
  tasks,
  onError,
  onOptimisticToggle,
  onRefresh,
}: {
  currentUserId: string | null;
  selectedDate: string;
  tasks: TaskOverviewItem[];
  onError: (message: string | null) => void;
  onOptimisticToggle?: (task: TaskOverviewItem, date: string) => void;
  onRefresh: () => void;
}) {
  const [isTaskMutationPending, setIsTaskMutationPending] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [scopeTaskId, setScopeTaskId] = useState<string | null>(null);
  const [instanceEditingState, setInstanceEditingState] = useState<InstanceEditingState | null>(null);

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskOverviewItem>();
    tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [tasks]);

  const editingTask = editingTaskId ? taskMap.get(editingTaskId) ?? null : null;
  const scopeTask = scopeTaskId ? taskMap.get(scopeTaskId) ?? null : null;
  const scopeInstanceDate = scopeTask ? resolveTaskInstanceDate(scopeTask, selectedDate) : null;
  const instanceEditingTask = instanceEditingState ? taskMap.get(instanceEditingState.taskId) ?? null : null;

  function canEditTask(task: TaskOverviewItem) {
    if (!currentUserId) return false;
    if (task.delegatedToUserId) return task.delegatedToUserId === currentUserId;
    return (task.creatorUserId ?? task.createdByUserId) === currentUserId;
  }

  function closeAllTaskFlows() {
    setEditingTaskId(null);
    setScopeTaskId(null);
    setInstanceEditingState(null);
  }

  function requestTaskEdit(task: TaskOverviewItem) {
    if (!canEditTask(task)) return;
    if (task.taskType !== 'dayTask' && task.recurrenceType !== 'none') {
      setScopeTaskId(task.id);
      return;
    }

    setEditingTaskId(task.id);
  }

  function openSeriesEditFromScope() {
    if (!scopeTask) return;
    setEditingTaskId(scopeTask.id);
    setScopeTaskId(null);
  }

  function openInstanceEditFromScope() {
    if (!scopeTask || !scopeInstanceDate) return;
    setInstanceEditingState({ taskId: scopeTask.id, date: scopeInstanceDate });
    setScopeTaskId(null);
  }

  async function submitTaskEdit(input: TaskEditSubmit) {
    if (!editingTask) return;

    setIsTaskMutationPending(true);
    onError(null);

    try {
      await updateTask(editingTask.id, input.taskUpdate);

      if (input.delegationAction.type === 'clear') {
        await clearTaskDelegation(editingTask.id);
      } else {
        await saveTaskDelegation(editingTask.id, input.delegationAction.input);
      }

      closeAllTaskFlows();
      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Aufgabe konnte nicht aktualisiert werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  async function submitTaskInstanceEdit(input: TaskInstanceEditSubmit) {
    if (!instanceEditingTask) return;

    setIsTaskMutationPending(true);
    onError(null);

    try {
      await updateTaskInstance(instanceEditingTask.id, input.instanceDate, input.taskUpdate);

      if (input.delegationAction.type === 'clear') {
        await clearTaskDelegation(instanceEditingTask.id, { mode: 'singleDate', date: input.instanceDate });
      } else {
        await saveTaskDelegation(instanceEditingTask.id, {
          ...input.delegationAction.input,
          mode: 'singleDate',
          date: input.instanceDate,
        });
      }

      closeAllTaskFlows();
      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Aufgabe für diesen Tag konnte nicht aktualisiert werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  async function toggleTaskCompletion(task: TaskOverviewItem, date: string) {
    if (!canEditTask(task)) return;
    onError(null);
    onOptimisticToggle?.(task, date);

    try {
      if (task.recurrenceType === 'none') {
        await updateTask(task.id, { status: task.resolvedStatus === 'completed' ? 'active' : 'completed' });
      } else {
        const instanceState = resolveTaskInstanceState(task, date);
        await updateTaskInstance(task.id, date, {
          status: instanceState.resolvedStatus === 'completed' ? 'active' : 'completed',
        });
      }

      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Status konnte nicht aktualisiert werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  async function deleteTaskById(taskId: string) {
    const task = taskMap.get(taskId);
    if (!task || !canEditTask(task)) return;
    setIsTaskMutationPending(true);
    onError(null);

    try {
      await deleteTask(taskId);
      closeAllTaskFlows();
      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Aufgabe konnte nicht gelöscht werden.');
    } finally {
      setIsTaskMutationPending(false);
    }
  }

  return {
    editingTask,
    instanceEditingDate: instanceEditingState?.date ?? null,
    instanceEditingTask,
    isTaskMutationPending,
    openInstanceEditFromScope,
    openSeriesEditFromScope,
    requestTaskEdit,
    scopeInstanceDate,
    scopeTask,
    setEditingTaskId,
    setInstanceEditingState,
    setScopeTaskId,
    submitTaskEdit,
    submitTaskInstanceEdit,
    toggleTaskCompletion,
    deleteTaskById,
  };
}
