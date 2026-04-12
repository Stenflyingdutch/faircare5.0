import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { clearTaskDelegationsForUser, delegateTask, getTaskContextFromSessionCookie, TaskAccessError } from '@/services/server/tasks.service';
import type { SaveTaskDelegationInput } from '@/types/tasks';

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const body = await request.json() as SaveTaskDelegationInput;
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { taskId } = await context.params;
    const delegation = await delegateTask(taskContext.userId, taskId, body);
    return NextResponse.json({ delegation });
  } catch (error) {
    if (error instanceof TaskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Delegation konnte nicht gespeichert werden.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const taskContext = await getTaskContextFromSessionCookie(sessionCookie);
    const { taskId } = await context.params;
    const modeParam = request.nextUrl.searchParams.get('mode');
    const dateParam = request.nextUrl.searchParams.get('date');
    await clearTaskDelegationsForUser(taskContext.userId, taskId, modeParam
      ? {
        mode: modeParam === 'singleDate' ? 'singleDate' : 'recurring',
        date: dateParam,
      }
      : undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TaskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Delegation konnte nicht entfernt werden.' }, { status: 500 });
  }
}
