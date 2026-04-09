import { NextRequest, NextResponse } from 'next/server';

import { adminAuth } from '@/lib/firebase-admin';
import { dispatchMail, MailDispatchError } from '@/services/server/mail.service';

const PASSWORD_RESET_ERROR_CODE = 'auth/password-reset-config-invalid';

function maskEmailForLog(email: string) {
  const normalized = email.trim().toLowerCase();
  const [localPart, domainPart] = normalized.split('@');
  if (!localPart || !domainPart) return 'invalid';
  if (localPart.length <= 2) return `**@${domainPart}`;
  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

function resolveAppBaseUrl() {
  const explicitUrl = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitUrl) return explicitUrl.replace(/\/+$/, '');

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  if (vercelEnv === 'production' && productionDomain) {
    return `https://${productionDomain.replace(/\/+$/, '')}`;
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }

  return null;
}

function buildActionUrl(baseUrl: string) {
  return `${baseUrl}/reset-password`;
}

function extractResetCode(rawLink: string) {
  try {
    const parsed = new URL(rawLink);
    return parsed.searchParams.get('oobCode');
  } catch {
    return null;
  }
}

function buildPasswordResetHtml(resetUrl: string) {
  return `
    <p>Du hast ein Zurücksetzen deines Passworts angefordert.</p>
    <p>Klicke auf den folgenden Link, um ein neues Passwort zu setzen:</p>
    <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>
    <p>Wenn du das nicht warst, kannst du diese E-Mail ignorieren.</p>
  `;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const normalizedEmail = body?.email?.trim().toLowerCase() ?? '';

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return NextResponse.json(
      { error: 'Bitte gib eine gültige E-Mail-Adresse ein.', code: 'auth/invalid-email' },
      { status: 400 },
    );
  }

  const baseUrl = resolveAppBaseUrl();
  if (!baseUrl) {
    console.error('auth.password_reset.config_invalid', {
      reason: 'missing app url',
      code: PASSWORD_RESET_ERROR_CODE,
    });
    return NextResponse.json(
      {
        code: PASSWORD_RESET_ERROR_CODE,
        error: 'Passwort-Reset ist aktuell nicht richtig konfiguriert. Bitte versuche es später erneut.',
      },
      { status: 500 },
    );
  }

  let actionUrl: string;
  try {
    actionUrl = buildActionUrl(baseUrl);
    new URL(actionUrl);
  } catch {
    console.error('auth.password_reset.config_invalid', {
      reason: 'invalid reset target route',
      baseUrl,
      code: PASSWORD_RESET_ERROR_CODE,
    });
    return NextResponse.json(
      {
        code: PASSWORD_RESET_ERROR_CODE,
        error: 'Passwort-Reset ist aktuell nicht richtig konfiguriert. Bitte versuche es später erneut.',
      },
      { status: 500 },
    );
  }

  try {
    const generatedLink = await adminAuth.generatePasswordResetLink(normalizedEmail, {
      url: actionUrl,
    });

    const oobCode = extractResetCode(generatedLink);
    if (!oobCode) {
      console.error('auth.password_reset.config_invalid', {
        reason: 'password reset link generation failed',
        detail: 'missing oobCode',
        code: PASSWORD_RESET_ERROR_CODE,
      });
      return NextResponse.json(
        {
          code: PASSWORD_RESET_ERROR_CODE,
          error: 'Passwort-Reset ist aktuell nicht richtig konfiguriert. Bitte versuche es später erneut.',
        },
        { status: 500 },
      );
    }

    const resetUrl = `${actionUrl}?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

    await dispatchMail({
      type: 'password_reset',
      to: normalizedEmail,
      originalRecipient: normalizedEmail,
      subject: 'Passwort für FairCare zurücksetzen',
      html: buildPasswordResetHtml(resetUrl),
    });

    console.info('auth.password_reset.request.success', {
      email: maskEmailForLog(normalizedEmail),
      actionUrl,
      resetDomain: new URL(resetUrl).origin,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { code?: string })?.code ?? null;

    if (code === 'auth/user-not-found') {
      return NextResponse.json({ ok: true });
    }

    if (code === 'auth/invalid-continue-uri' || code === 'auth/unauthorized-continue-uri') {
      console.error('auth.password_reset.config_invalid', {
        reason: 'firebase authorized domain likely missing',
        actionUrl,
        code: PASSWORD_RESET_ERROR_CODE,
        firebaseCode: code,
      });
      return NextResponse.json(
        {
          code: PASSWORD_RESET_ERROR_CODE,
          error: 'Passwort-Reset ist aktuell nicht richtig konfiguriert. Bitte versuche es später erneut.',
        },
        { status: 500 },
      );
    }

    if (error instanceof MailDispatchError) {
      console.error('auth.password_reset.mail_dispatch_failed', {
        reason: error.code,
        category: error.category,
      });
      return NextResponse.json(
        {
          code: 'auth/password-reset-delivery-failed',
          error: 'Passwort-Reset konnte aktuell nicht zugestellt werden. Bitte versuche es später erneut.',
        },
        { status: 500 },
      );
    }

    console.error('auth.password_reset.request.failed', {
      code,
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { code: 'auth/internal-error', error: 'Passwort-Reset konnte nicht gestartet werden. Bitte versuche es erneut.' },
      { status: 500 },
    );
  }
}
