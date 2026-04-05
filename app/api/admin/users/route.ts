import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/services/server/admin/admin-auth';
import { listUsersForAdmin } from '@/services/server/admin/user-management.service';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers.get('authorization'));
    const searchParams = request.nextUrl.searchParams;

    const users = await listUsersForAdmin({
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortDirection: searchParams.get('sortDirection'),
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'User-Liste konnte nicht geladen werden.' },
      { status: 403 },
    );
  }
}
