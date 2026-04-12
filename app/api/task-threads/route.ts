import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getAllTaskThreads, getInboxThreads, TaskChatAccessError } from '@/services/server/task-chat.service';

function logTaskThreadsRouteDebug(event: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[api/task-threads] ${event}`, context);
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope');
  const resolvedScope = scope === 'inbox' ? 'inbox' : 'threads';
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
    logTaskThreadsRouteDebug('auth.resolve.success', {
      authStatus: 'authenticated',
      currentUserId: context.userId,
      familyId: context.familyId,
      partnerUserId: context.partnerUserId ?? null,
      tab: 'chats',
      scope: resolvedScope,
    });

    if (!context.userId || !context.familyId) {
      logTaskThreadsRouteDebug('context.invalid', {
        currentUserId: context.userId ?? null,
        familyId: context.familyId ?? null,
      });
      return NextResponse.json({ threads: [] });
    }

    const threads = scope === 'inbox'
      ? await getInboxThreads({ familyId: context.familyId, userId: context.userId })
      : await getAllTaskThreads({ familyId: context.familyId, userId: context.userId });
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
      currentUserId: context.userId,
      familyId: context.familyId,
      scope: resolvedScope,
      threadCount: normalizedThreads.length,
      openInboxCount: scope === 'inbox' ? normalizedThreads.length : undefined,
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
