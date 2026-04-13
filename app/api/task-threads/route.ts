import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getAllTaskThreads, getInboxThreads, TaskChatAccessError } from '@/services/server/task-chat.service';

export async function GET(request: NextRequest) {
  const scopeParam = request.nextUrl.searchParams.get('scope');
  const scope = scopeParam === 'inbox' ? 'inbox' : 'threads';
  const routeContext = {
    routeName: '/api/task-threads',
    method: 'GET',
    tab: 'chats',
    subTab: scope,
    query: {
      scope: scopeParam,
    },
  };
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const context = await getTaskContextFromSessionCookie(sessionCookie);

    const threads = scope === 'inbox'
      ? await getInboxThreads({ familyId: context.familyId, userId: context.userId })
      : await getAllTaskThreads({ familyId: context.familyId, userId: context.userId });

    console.info('[task-chat] route.taskThreads.success', {
      ...routeContext,
      currentUserId: context.userId,
      familyId: context.familyId,
      normalizedItemCount: threads.length,
    });

    return NextResponse.json({ success: true, items: threads, threads });
  } catch (error) {
    console.error('[task-chat] route.taskThreads.error', {
      ...routeContext,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    });
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({
        success: false,
        errorCode: 'CHAT_ACCESS_DENIED',
        error: error.message,
        message: error.message,
      }, { status: error.status });
    }
    return NextResponse.json({
      success: false,
      errorCode: 'CHAT_THREADS_LOAD_FAILED',
      error: 'Chats konnten derzeit nicht geladen werden. Bitte später erneut versuchen.',
      message: 'Chats konnten derzeit nicht geladen werden. Bitte später erneut versuchen.',
    }, { status: 503 });
  }
}
