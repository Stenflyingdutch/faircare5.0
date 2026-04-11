import 'server-only';

import { adminAuth } from '@/lib/firebase-admin';
import {
  buildAbsolutePasswordResetSuccessUrl,
  buildAppPasswordResetUrl,
  extractPasswordResetStateFromFirebaseLink,
  resolvePasswordResetBaseUrl,
  resolvePasswordResetCompletionPath,
} from '@/services/password-reset-link.service';
import { MailDispatchError, dispatchMail } from '@/services/server/mail.service';

export class PasswordResetDispatchError extends Error {
  code: string;
  status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.code = options.code;
    this.status = options.status;
  }
}

function maskEmailForLog(email: string) {
  const normalized = email.trim().toLowerCase();
  const [localPart, domainPart] = normalized.split('@');
  if (!localPart || !domainPart) return 'invalid';
  if (localPart.length <= 2) return `**@${domainPart}`;
  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

function maskActionCodeForLog(oobCode: string | null) {
  if (!oobCode) return null;
  if (oobCode.length <= 8) return oobCode;
  return `${oobCode.slice(0, 4)}...${oobCode.slice(-4)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPasswordResetMailHtml(resetUrl: string, loginUrl: string) {
  const safeResetUrl = escapeHtml(resetUrl);
  const safeLoginUrl = escapeHtml(loginUrl);

  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
      <h1 style="font-size:24px;margin:0 0 16px">Passwort zurücksetzen</h1>
      <p>Du kannst dein FairCare-Passwort jetzt sicher in der App neu vergeben.</p>
      <p>
        <a
          href="${safeResetUrl}"
          style="display:inline-block;padding:12px 18px;background:#19323c;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600"
        >
          Neues Passwort festlegen
        </a>
      </p>
      <p>Falls der Button nicht funktioniert, öffne diesen Link direkt:</p>
      <p><a href="${safeResetUrl}">${safeResetUrl}</a></p>
      <p>Nach dem Speichern landest du wieder auf der Login-Seite:</p>
      <p><a href="${safeLoginUrl}">${safeLoginUrl}</a></p>
      <p>Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
    </div>
  `;
}

function isHostedRuntime() {
  return Boolean(process.env.VERCEL_ENV?.trim());
}

export async function dispatchPasswordResetEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const baseUrlResolution = resolvePasswordResetBaseUrl();
  const loginUrl = buildAbsolutePasswordResetSuccessUrl(baseUrlResolution.baseUrl);

  if (isHostedRuntime() && baseUrlResolution.isLocalhost) {
    console.error('auth.password_reset.mail.invalid_base_url', {
      source: baseUrlResolution.source,
      hostname: baseUrlResolution.hostname,
      rejectedCandidate: baseUrlResolution.rejectedCandidate,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    });
    throw new PasswordResetDispatchError(
      'Passwort-Reset ist derzeit nicht korrekt konfiguriert. Bitte prüfe APP_URL, PASSWORD_RESET_BASE_URL und VERCEL_PROJECT_PRODUCTION_URL.',
      { code: 'password_reset/config_error', status: 500 },
    );
  }

  console.info('auth.password_reset.mail.base_url', {
    email: maskEmailForLog(normalizedEmail),
    baseUrl: baseUrlResolution.baseUrl,
    source: baseUrlResolution.source,
    hostname: baseUrlResolution.hostname,
    allowPreview: baseUrlResolution.allowPreview,
    rejectedCandidate: baseUrlResolution.rejectedCandidate,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });

  try {
    const firebaseLink = await adminAuth.generatePasswordResetLink(normalizedEmail, {
      url: loginUrl,
    });
    const linkState = extractPasswordResetStateFromFirebaseLink(firebaseLink);

    if (linkState.mode !== 'resetPassword' || !linkState.oobCode) {
      console.error('auth.password_reset.mail.invalid_firebase_link', {
        email: maskEmailForLog(normalizedEmail),
        mode: linkState.mode,
        hasOobCode: Boolean(linkState.oobCode),
        handlerHostname: linkState.handlerHostname,
      });
      throw new PasswordResetDispatchError(
        'Firebase hat keinen gültigen Passwort-Reset-Link geliefert.',
        { code: 'password_reset/config_error', status: 500 },
      );
    }

    const appResetUrl = buildAppPasswordResetUrl(baseUrlResolution.baseUrl, linkState);
    const redirectPath = resolvePasswordResetCompletionPath(linkState.continueUrl);
    const appResetTarget = new URL(appResetUrl);

    console.info('auth.password_reset.mail.link_prepared', {
      email: maskEmailForLog(normalizedEmail),
      firebaseHandlerHostname: linkState.handlerHostname,
      continueUrl: linkState.continueUrl,
      redirectPath,
      appResetHostname: appResetTarget.hostname,
      appResetPath: appResetTarget.pathname,
      oobCode: maskActionCodeForLog(linkState.oobCode),
    });

    const dispatchOutcome = await dispatchMail({
      type: 'password_reset',
      to: normalizedEmail,
      originalRecipient: normalizedEmail,
      subject: 'Passwort zurücksetzen',
      html: buildPasswordResetMailHtml(appResetUrl, loginUrl),
    });

    console.info('auth.password_reset.mail.sent', {
      email: maskEmailForLog(normalizedEmail),
      appResetHostname: appResetTarget.hostname,
      redirectPath,
      provider: dispatchOutcome.result.provider,
    });

    return {
      baseUrlResolution,
      loginUrl,
      resetUrl: appResetUrl,
      dispatchOutcome,
      skipped: false as const,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code ?? null;

    if (code === 'auth/user-not-found') {
      console.info('auth.password_reset.mail.user_not_found', {
        email: maskEmailForLog(normalizedEmail),
      });
      return {
        baseUrlResolution,
        loginUrl,
        resetUrl: null,
        dispatchOutcome: null,
        skipped: true as const,
      };
    }

    if (error instanceof MailDispatchError) {
      throw new PasswordResetDispatchError(
        'Die Reset-E-Mail konnte gerade nicht verschickt werden. Bitte versuche es gleich noch einmal.',
        { code: 'password_reset/mail_error', status: error.status },
      );
    }

    if (error instanceof PasswordResetDispatchError) {
      throw error;
    }

    console.error('auth.password_reset.mail.failed', {
      email: maskEmailForLog(normalizedEmail),
      code,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new PasswordResetDispatchError(
      'Der Passwort-Reset konnte gerade nicht vorbereitet werden. Bitte versuche es erneut.',
      { code: 'password_reset/unexpected_error', status: 500 },
    );
  }
}
