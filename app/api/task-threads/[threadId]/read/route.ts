import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import {
  markTaskThreadAsRead,
  markTaskThreadAsUnread,
  removeTaskThreadFromInbox,
  TaskChatAccessError,
} from '@/services/server/task-chat.service';

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

export async function PATCH(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { threadId } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const read = payload?.read;

    if (read === false) {
      await markTaskThreadAsUnread({ familyId: taskContext.familyId, threadId, userId: taskContext.userId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chat konnte nicht als ungelesen markiert werden.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ threadId: string }> }) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { threadId } = await context.params;

    await removeTaskThreadFromInbox({ familyId: taskContext.familyId, threadId, userId: taskContext.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TaskAccessError || error instanceof TaskChatAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Chat konnte nicht entfernt werden.' }, { status: 500 });
  }
}
