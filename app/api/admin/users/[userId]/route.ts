import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/services/server/admin/admin-auth';
import { deleteUserCascade } from '@/services/server/admin/user-management.service';

export async function DELETE(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireAdmin(request.headers.get('authorization'));
    const { userId } = await context.params;

    const result = await deleteUserCascade({ userId, actorUserId: admin.uid, actorEmail: admin.email });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
