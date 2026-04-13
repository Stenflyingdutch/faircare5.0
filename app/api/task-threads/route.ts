import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getAllTaskThreads, getInboxThreads, TaskChatAccessError } from '@/services/server/task-chat.service';

function resolveErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
}

function mapErrorToHttpStatus(error: unknown) {
  const code = resolveErrorCode(error);
  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return { status: 403, errorCode: 'CHAT_PERMISSION_DENIED', message: 'Du hast keine Berechtigung für diese Chats.' };
  }
  if (code === 'unauthenticated') {
    return { status: 401, errorCode: 'UNAUTHENTICATED', message: 'Anmeldung erforderlich.' };
  }
  if (code === 'failed-precondition') {
    return { status: 500, errorCode: 'CHAT_QUERY_PRECONDITION_FAILED', message: 'Chat-Abfrage ist aktuell inkonsistent konfiguriert.' };
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return { status: 503, errorCode: 'CHAT_BACKEND_UNAVAILABLE', message: 'Der Chat-Dienst ist derzeit nicht erreichbar.' };
  }
  return { status: 500, errorCode: 'CHAT_THREADS_LOAD_FAILED', message: 'Chats konnten nicht geladen werden.' };
}

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
  const dataSources = {
    required: [
      'auth.sessionCookie',
      'users/{currentUserId}',
      'families/{familyId}',
      'families/{familyId}/taskThreads',
      'families/{familyId}/users/{currentUserId}/inboxEntries',
    ],
    optional: [],
  };
  console.info('[task-chat] route.taskThreads.request', {
    ...routeContext,
    dataSources,
  });
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
      dataSources,
      finalStatus: 200,
    });

    return NextResponse.json({ success: true, scope, items: threads, threads });
  } catch (error) {
    const errorCode = resolveErrorCode(error);
    const mapped = mapErrorToHttpStatus(error);
    console.error('[task-chat] route.taskThreads.error', {
      ...routeContext,
      scope,
      dataSources,
      firestoreErrorCode: errorCode,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      finalStatus: error instanceof TaskAccessError || error instanceof TaskChatAccessError ? error.status : mapped.status,
    });
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({
        success: false,
        scope,
        items: [],
        errorCode: 'CHAT_ACCESS_DENIED',
        error: error.message,
        message: error.message,
        details: {
          route: routeContext.routeName,
          scope,
          status: error.status,
        },
      }, { status: error.status });
    }
    return NextResponse.json({
      success: false,
      scope,
      items: [],
      errorCode: mapped.errorCode,
      error: mapped.message,
      message: mapped.message,
      details: {
        route: routeContext.routeName,
        scope,
        firestoreErrorCode: errorCode,
      },
    }, { status: mapped.status });
  }
}
