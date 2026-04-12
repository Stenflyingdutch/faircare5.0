import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import { replyToTaskConversation, TaskChatAccessError } from '@/services/server/task-chat.service';

export async function POST(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const body = await request.json() as { taskId?: string; text?: string };
    const { threadId } = await context.params;

    const taskId = body.taskId ?? threadId;
    if (taskId !== threadId) {
      throw new TaskChatAccessError('Thread und Aufgabe stimmen nicht überein.', 400);
    }

    const sent = await replyToTaskConversation({
      familyId: taskContext.familyId,
      taskId,
      authorUserId: taskContext.userId,
      text: body.text ?? '',
      participantUserIds: [taskContext.userId, taskContext.partnerUserId].filter(Boolean) as string[],
    });

    return NextResponse.json(sent);
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Nachricht konnte nicht gesendet werden.' }, { status: 500 });
  }
}
