import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { markTaskThreadAsRead, TaskChatAccessError } from '@/services/server/task-chat.service';

export async function POST(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { threadId } = await context.params;

    await markTaskThreadAsRead({ familyId: taskContext.familyId, threadId, userId: taskContext.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chat konnte nicht als gelesen markiert werden.' }, { status: 500 });
  }
}
