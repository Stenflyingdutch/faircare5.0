import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getAllTaskThreads, getInboxThreads, TaskChatAccessError } from '@/services/server/task-chat.service';
import type { TaskThreadListItem } from '@/types/task-chat';

function logTaskThreadsRouteDebug(event: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[api/task-threads] ${event}`, context);
}

function normalizeScope(scope: string | null) {
  return scope === 'inbox' ? 'inbox' : 'threads';
}

function normalizeId(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveFirestoreErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
}

function isRecoverableThreadReadError(error: unknown) {
  const code = resolveFirestoreErrorCode(error);
  return code === 'failed-precondition' || code === 'not-found' || code === 'permission-denied' || code === 'invalid-argument';
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope');
  const resolvedScope = normalizeScope(scope);
  logTaskThreadsRouteDebug('entry', {
    path: request.nextUrl.pathname,
    rawQuery: request.nextUrl.search,
    scope,
    resolvedScope,
  });
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    logTaskThreadsRouteDebug('auth.resolve.start', { hasSessionCookie: Boolean(sessionCookie) });
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    const currentUserId = normalizeId(context.userId);
    const familyId = normalizeId(context.familyId);
    logTaskThreadsRouteDebug('auth.resolve.success', {
      authStatus: 'authenticated',
      currentUserId,
      familyId,
      partnerUserId: context.partnerUserId ?? null,
      tab: 'chats',
      scope: resolvedScope,
    });

    if (!currentUserId || !familyId) {
      logTaskThreadsRouteDebug('context.invalid', {
        currentUserId,
        familyId,
      });
      return NextResponse.json({ threads: [] });
    }

    logTaskThreadsRouteDebug('query.start', {
      scope: resolvedScope,
      currentUserId,
      familyId,
      queryBuilder: resolvedScope === 'inbox' ? 'getInboxThreads' : 'getAllTaskThreads',
    });

    let threads: TaskThreadListItem[] = [];
    try {
      threads = resolvedScope === 'inbox'
        ? await getInboxThreads({ familyId, userId: currentUserId })
        : await getAllTaskThreads({ familyId, userId: currentUserId });
    } catch (queryError) {
      if (!isRecoverableThreadReadError(queryError)) {
        throw queryError;
      }
      logTaskThreadsRouteDebug('query.recoverableError', {
        scope: resolvedScope,
        currentUserId,
        familyId,
        code: resolveFirestoreErrorCode(queryError),
        message: queryError instanceof Error ? queryError.message : String(queryError),
        stack: queryError instanceof Error ? queryError.stack : null,
      });
      threads = [];
    }

    logTaskThreadsRouteDebug('query.result', {
      scope: resolvedScope,
      currentUserId,
      familyId,
      resultCount: threads.length,
    });
    logTaskThreadsRouteDebug('mapping.start', { scope: resolvedScope, loadedThreadCount: threads.length, loadedThreadIds: threads.map((thread) => thread.id) });

    const normalizedThreads = threads.map((thread) => ({
      ...thread,
      taskId: thread.taskId ?? thread.id,
      taskTitle: thread.taskTitle || 'Ohne Titel',
      preview: thread.lastMessageText || '',
      lastMessageAt: thread.lastMessageAt || new Date(0).toISOString(),
      unread: (thread.unreadCount ?? 0) > 0,
      participants: Array.isArray(thread.participantUserIds) ? thread.participantUserIds : [],
      threadType: thread.lastMessageType ?? 'user_message',
      status: thread.isArchived ? 'archived' : 'open',
    }));
    logTaskThreadsRouteDebug('mapping.success', { scope: resolvedScope, normalizedCount: normalizedThreads.length });

    logTaskThreadsRouteDebug('response.success', {
      currentUserId,
      familyId,
      scope: resolvedScope,
      threadCount: normalizedThreads.length,
      openInboxCount: resolvedScope === 'inbox' ? normalizedThreads.length : undefined,
      firstTaskId: normalizedThreads[0]?.taskId ?? null,
      lastMessageAt: normalizedThreads[0]?.lastMessageAt ?? null,
      unreadCount: normalizedThreads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0),
    });
    return NextResponse.json({ threads: normalizedThreads });
  } catch (error) {
    logTaskThreadsRouteDebug('response.error', {
      scope,
      resolvedScope,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : null,
      firestoreCode: error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : null,
    });
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chats konnten nicht geladen werden.' }, { status: 500 });
  }
}
