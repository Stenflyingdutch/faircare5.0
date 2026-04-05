import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/services/server/admin/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request.headers.get('authorization'));
    return NextResponse.json({ ok: true, admin });
  } catch {
    return NextResponse.json({ error: 'Kein Admin-Zugriff.' }, { status: 403 });
  }
}
