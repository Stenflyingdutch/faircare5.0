import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, TaskAccessError, updateTaskInstanceForUser } from '@/services/server/tasks.service';
import { assertDateKey } from '@/services/task-date';
import type { UpdateTaskInstanceInput } from '@/types/tasks';

export async function PATCH(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const date = request.nextUrl.searchParams.get('date')?.trim();
    if (!date) {
      return NextResponse.json({ error: 'Datum fehlt.' }, { status: 400 });
    }

    assertDateKey(date);
    const body = await request.json() as UpdateTaskInstanceInput;
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { taskId } = await context.params;
    const override = await updateTaskInstanceForUser(taskContext.userId, taskId, date, body);
    return NextResponse.json({ override });
  } catch (error) {
    if (error instanceof TaskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Aufgabeninstanz konnte nicht aktualisiert werden.' }, { status: 500 });
  }
}
