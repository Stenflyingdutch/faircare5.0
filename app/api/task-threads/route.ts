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
  logTaskThreadsRouteDebug('entry', { scope, path: request.nextUrl.pathname });
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    logTaskThreadsRouteDebug('auth.resolve.start', { hasSessionCookie: Boolean(sessionCookie) });
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    logTaskThreadsRouteDebug('auth.resolve.success', {
      currentUserId: context.userId,
      familyId: context.familyId,
      partnerUserId: context.partnerUserId ?? null,
      tab: 'chats',
      scope: scope === 'inbox' ? 'inbox' : 'threads',
    });

    const threads = scope === 'inbox'
      ? await getInboxThreads({ familyId: context.familyId, userId: context.userId })
      : await getAllTaskThreads({ familyId: context.familyId, userId: context.userId });

    logTaskThreadsRouteDebug('response.success', {
      currentUserId: context.userId,
      familyId: context.familyId,
      scope: scope === 'inbox' ? 'inbox' : 'threads',
      threadCount: threads.length,
      openInboxCount: scope === 'inbox' ? threads.length : undefined,
      firstTaskId: threads[0]?.taskId ?? null,
      lastMessageAt: threads[0]?.lastMessageAt ?? null,
      unreadCount: threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0),
    });
    return NextResponse.json({ threads });
  } catch (error) {
    logTaskThreadsRouteDebug('response.error', {
      scope,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : null,
    });
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chats konnten nicht geladen werden.' }, { status: 500 });
  }
}
