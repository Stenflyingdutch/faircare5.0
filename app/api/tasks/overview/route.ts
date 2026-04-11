import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { getTaskContextFromSessionCookie, getTaskOverviewForSelectedDate, TaskAccessError } from '@/services/server/tasks.service';
import { assertDateKey } from '@/services/task-date';

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date')?.trim();
    if (!date) {
      return NextResponse.json({ error: 'Datum fehlt.' }, { status: 400 });
    }

    assertDateKey(date);
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const context = await getTaskContextFromSessionCookie(sessionCookie);
    const overview = await getTaskOverviewForSelectedDate(context.userId, date);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof TaskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Aufgaben konnten nicht geladen werden.' }, { status: 500 });
  }
}
