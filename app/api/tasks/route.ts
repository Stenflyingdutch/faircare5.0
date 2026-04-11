import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { createTaskForUser, getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import type { CreateTaskInput } from '@/types/tasks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateTaskInput;
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    const task = await createTaskForUser(context.userId, body);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof TaskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Aufgabe konnte nicht erstellt werden.' }, { status: 500 });
  }
}
