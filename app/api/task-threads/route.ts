import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getAllTaskThreads, getInboxThreads, TaskChatAccessError } from '@/services/server/task-chat.service';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    const scope = request.nextUrl.searchParams.get('scope');

    const threads = scope === 'inbox'
      ? await getInboxThreads({ familyId: context.familyId, userId: context.userId })
      : await getAllTaskThreads({ familyId: context.familyId, userId: context.userId });

    return NextResponse.json({ threads });
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chats konnten nicht geladen werden.' }, { status: 500 });
  }
}
