import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getUnreadChatCount, TaskChatAccessError } from '@/services/server/task-chat.service';
import { isTeamCheckBadgeVisible } from '@/services/teamCheck.logic';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    const unreadChatCount = await getUnreadChatCount({ familyId: context.familyId, userId: context.userId });
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
