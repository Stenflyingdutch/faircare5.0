'use client';

import { FormEvent, useEffect, useState } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { auth } from '@/lib/firebase';

type ResetPasswordPageClientProps = {
  mode: string | null;
  oobCode: string | null;
};

function resolveResetErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/expired-action-code') {
    return 'Dieser Link ist abgelaufen. Bitte fordere eine neue Reset-E-Mail an.';
  }

  if (code === 'auth/invalid-action-code') {
    return 'Dieser Link ist ungültig oder wurde bereits verwendet.';
  }

  if (code === 'auth/weak-password') {
    return 'Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.';
  }

  return 'Das Passwort konnte nicht aktualisiert werden. Bitte versuche es erneut.';
}

export default function ResetPasswordPageClient({ mode, oobCode }: ResetPasswordPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) {
      setError('Der Reset-Link ist unvollständig oder ungültig.');
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((resolvedEmail) => {
        setEmail(resolvedEmail);
        setError(null);
      })
      .catch((verifyError) => {
        setError(resolveResetErrorMessage(verifyError));
      });
  }, [mode, oobCode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!oobCode || mode !== 'resetPassword') {
      setError('Der Reset-Link ist ungültig. Bitte fordere eine neue E-Mail an.');
      return;
    }

    if (!password || !passwordRepeat) {
      setError('Bitte fülle beide Passwortfelder aus.');
      return;
    }

    if (password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccessMessage('Dein Passwort wurde erfolgreich aktualisiert.');
      setTimeout(() => router.push('/login?reset=success'), 800);
    } catch (submitError) {
      setError(resolveResetErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Neues Passwort setzen</h1>
        {email && <p className="helper">Konto: {email}</p>}
        <form className="form-shell" onSubmit={submit}>
          <input
            type="password"
            required
            className="input"
            placeholder="Neues Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <input
            type="password"
            required
            className="input"
            placeholder="Neues Passwort wiederholen"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
          />
          {error && <p className="inline-error">{error}</p>}
          {successMessage && <p className="helper">{successMessage}</p>}
          <button className="button primary" type="submit" disabled={isSubmitting || !oobCode || mode !== 'resetPassword'}>
            {isSubmitting ? 'Speichere …' : 'Passwort speichern'}
          </button>
          <button className="button" type="button" onClick={() => router.push('/forgot-password')}>
            Neue Reset-E-Mail anfordern
          </button>
        </form>
      </div>
    </section>
  );
}
