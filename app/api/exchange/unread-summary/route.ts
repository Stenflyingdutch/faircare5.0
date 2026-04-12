import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getUnreadChatCount, TaskChatAccessError } from '@/services/server/task-chat.service';
import { isTeamCheckBadgeVisible } from '@/services/teamCheck.logic';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    let unreadChatCount = 0;
    try {
      unreadChatCount = await getUnreadChatCount({ familyId: context.familyId, userId: context.userId });
    } catch (error) {
      const chatError = error as { code?: string; message?: string };
      console.warn('[home] optional inbox loader failed.', {
        endpoint: '/api/exchange/unread-summary',
        userId: context.userId,
        familyId: context.familyId,
        loader: 'inbox',
        code: chatError?.code ?? 'unknown',
        message: chatError?.message ?? String(error),
      });
      if (chatError?.code === 'failed-precondition') {
        console.warn('[home] missing composite index for taskThreads inbox query.', {
          endpoint: '/api/exchange/unread-summary',
          userId: context.userId,
          familyId: context.familyId,
          loader: 'inbox',
        });
      }
    }
    const unreadCheckInCount = isTeamCheckBadgeVisible({
      nextCheckInAt: context.family.teamCheckPlan?.nextCheckInAt,
      reminderActiveAt: context.family.teamCheckPlan?.reminderActiveAt,
    }) ? 1 : 0;

    return NextResponse.json({
      unreadChatCount,
      unreadCheckInCount,
      total: unreadChatCount + unreadCheckInCount,
    });
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Badge-Daten konnten nicht geladen werden.' }, { status: 500 });
  }
}
