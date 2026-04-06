import { NextRequest, NextResponse } from 'next/server';

import { adminAuth } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';

const SESSION_EXPIRES_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: NextRequest) {
  const { idToken } = await request.json() as { idToken?: string };

  if (!idToken) {
    return NextResponse.json({ error: 'ID-Token fehlt.' }, { status: 400 });
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_MS });
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionCookie,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_EXPIRES_MS / 1000,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
