import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError, updateTaskForUser } from '@/services/server/tasks.service';
import type { UpdateTaskInput } from '@/types/tasks';

export async function PATCH(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const body = await request.json() as UpdateTaskInput;
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { taskId } = await context.params;
    const task = await updateTaskForUser(taskContext.userId, taskId, body);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof TaskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Aufgabe konnte nicht aktualisiert werden.' }, { status: 500 });
  }
}
