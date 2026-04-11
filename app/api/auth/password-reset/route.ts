import { NextRequest, NextResponse } from 'next/server';

import { PasswordResetDispatchError, dispatchPasswordResetEmail } from '@/services/server/password-reset.service';

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { email?: string } | null;
    const email = body?.email?.trim().toLowerCase() ?? '';

    if (!email || !isValidEmailAddress(email)) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse ein.', code: 'password_reset/invalid_email' },
        { status: 400 },
      );
    }

    await dispatchPasswordResetEmail(email);

    return NextResponse.json({
      ok: true,
      message: 'Wenn ein Konto zu dieser E-Mail existiert, wurde ein Reset-Link versendet.',
    });
  } catch (error) {
    if (error instanceof PasswordResetDispatchError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error('auth.password_reset.api.failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Der Passwort-Reset konnte gerade nicht gestartet werden. Bitte versuche es erneut.',
        code: 'password_reset/unexpected_error',
      },
      { status: 500 },
    );
  }
}
