import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { getThreadDetail, TaskChatAccessError } from '@/services/server/task-chat.service';

export async function GET(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { threadId } = await context.params;

    const detail = await getThreadDetail({
      familyId: taskContext.familyId,
      threadId,
      userId: taskContext.userId,
    });

    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chat konnte nicht geladen werden.' }, { status: 500 });
  }
}
