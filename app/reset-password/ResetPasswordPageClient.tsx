'use client';

import { FormEvent, useEffect, useState } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { auth } from '@/lib/firebase';
import { resolvePasswordResetCompletionPath } from '@/services/password-reset-link.service';

type ResetPasswordPageClientProps = {
  mode: string | null;
  oobCode: string | null;
  continueUrl: string | null;
  languageCode: string | null;
  apiKey: string | null;
};

function resolveResetErrorState(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/expired-action-code') {
    return {
      message: 'Dieser Link ist abgelaufen. Bitte fordere eine neue Reset-E-Mail an.',
      status: 'expired' as const,
    };
  }

  if (code === 'auth/invalid-action-code') {
    return {
      message: 'Dieser Link ist ungültig oder wurde bereits verwendet.',
      status: 'error' as const,
    };
  }

  if (code === 'auth/weak-password') {
    return {
      message: 'Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.',
      status: 'error' as const,
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      message: 'Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.',
      status: 'error' as const,
    };
  }

  return {
    message: 'Das Passwort konnte nicht aktualisiert werden. Bitte versuche es erneut.',
    status: 'error' as const,
  };
}

function maskActionCodeForLog(oobCode: string | null) {
  if (!oobCode) return null;
  if (oobCode.length <= 8) return oobCode;
  return `${oobCode.slice(0, 4)}...${oobCode.slice(-4)}`;
}

export default function ResetPasswordPageClient({
  mode,
  oobCode,
  continueUrl,
  languageCode,
  apiKey,
}: ResetPasswordPageClientProps) {
  const router = useRouter();
  const successPath = resolvePasswordResetCompletionPath(continueUrl);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<'expired' | 'error' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    console.info('auth.password_reset.page.loaded', {
      mode,
      hasOobCode: Boolean(oobCode),
      oobCode: maskActionCodeForLog(oobCode),
      hasContinueUrl: Boolean(continueUrl),
      successPath,
      languageCode,
      hasApiKey: Boolean(apiKey),
    });

    if (mode !== 'resetPassword' || !oobCode) {
      setError('Der Reset-Link ist unvollständig oder ungültig.');
      setErrorStatus('error');
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    verifyPasswordResetCode(auth, oobCode)
      .then((resolvedEmail) => {
        setEmail(resolvedEmail);
        setError(null);
        setErrorStatus(null);
        console.info('auth.password_reset.code.valid', {
          emailHint: resolvedEmail.includes('@') ? resolvedEmail.replace(/(^.{2}).+(@.*$)/, '$1***$2') : null,
          oobCode: maskActionCodeForLog(oobCode),
        });
      })
      .catch((verifyError) => {
        const state = resolveResetErrorState(verifyError);
        setError(state.message);
        setErrorStatus(state.status);
        console.error('auth.password_reset.code.invalid', {
          code: (verifyError as { code?: string })?.code ?? null,
          oobCode: maskActionCodeForLog(oobCode),
        });
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [apiKey, continueUrl, languageCode, mode, oobCode, successPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setErrorStatus(null);
    setSuccessMessage(null);

    if (!oobCode || mode !== 'resetPassword') {
      setError('Der Reset-Link ist ungültig. Bitte fordere eine neue E-Mail an.');
      setErrorStatus('error');
      return;
    }

    if (!password || !passwordRepeat) {
      setError('Bitte fülle beide Passwortfelder aus.');
      setErrorStatus('error');
      return;
    }

    if (password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      setErrorStatus('error');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccessMessage('Dein Passwort wurde erfolgreich aktualisiert.');
      console.info('auth.password_reset.submit.success', {
        destination: successPath,
        oobCode: maskActionCodeForLog(oobCode),
      });
      setTimeout(() => router.replace(successPath), 1200);
    } catch (submitError) {
      const state = resolveResetErrorState(submitError);
      setError(state.message);
      setErrorStatus(state.status);
      console.error('auth.password_reset.submit.failed', {
        code: (submitError as { code?: string })?.code ?? null,
        oobCode: maskActionCodeForLog(oobCode),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Neues Passwort setzen</h1>
        <p className="helper">Lege hier ein neues Passwort fest. Danach leiten wir dich sicher zurück zum Login.</p>
        {email && <p className="helper">Konto: {email}</p>}
        <form className="form-shell" onSubmit={submit}>
          <input
            type="password"
            required
            minLength={6}
            className="input"
            placeholder="Neues Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            className="input"
            placeholder="Neues Passwort wiederholen"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
          />
          {isVerifying && <p className="helper">Reset-Link wird geprüft …</p>}
          {error && <p className="inline-error">{error}</p>}
          {successMessage && <p className="helper">{successMessage}</p>}
          <button className="button primary" type="submit" disabled={isSubmitting || isVerifying || !oobCode || mode !== 'resetPassword'}>
            {isSubmitting ? 'Speichere …' : 'Passwort speichern'}
          </button>
          {successMessage && (
            <button className="button" type="button" onClick={() => router.replace(successPath)}>
              Zum Login
            </button>
          )}
          <button
            className="button"
            type="button"
            onClick={() => router.push(errorStatus === 'expired' ? '/forgot-password?status=expired' : '/forgot-password')}
          >
            Neue Reset-E-Mail anfordern
          </button>
        </form>
      </div>
    </section>
  );
}
