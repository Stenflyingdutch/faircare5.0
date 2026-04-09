'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

import { auth } from '@/lib/firebase';

function resolveResetErrorMessage(code?: string | null) {
  if (code === 'auth/expired-action-code') return 'Dieser Link ist abgelaufen. Bitte fordere einen neuen Reset-Link an.';
  if (code === 'auth/invalid-action-code') return 'Dieser Reset-Link ist ungültig oder wurde bereits verwendet.';
  if (code === 'auth/user-disabled') return 'Dieses Konto ist derzeit gesperrt. Bitte kontaktiere den Support.';
  if (code === 'auth/weak-password') return 'Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.';
  return 'Passwort konnte nicht zurückgesetzt werden. Bitte fordere einen neuen Link an.';
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mode = searchParams.get('mode');
  const oobCode = useMemo(() => searchParams.get('oobCode') ?? '', [searchParams]);
  const isResetMode = mode === 'resetPassword';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isResetMode || !oobCode) {
      setError('Der Reset-Link ist unvollständig. Bitte fordere einen neuen Link an.');
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
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, password);
      setSuccessMessage('Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt einloggen.');
      setPassword('');
      setPasswordRepeat('');
    } catch (resetError) {
      setError(resolveResetErrorMessage((resetError as { code?: string })?.code ?? null));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Neues Passwort setzen</h1>
        <p className="helper">Bitte gib dein neues Passwort zweimal ein.</p>
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
            placeholder="Passwort wiederholen"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
          />
          {error && <p className="inline-error">{error}</p>}
          {successMessage && <p className="helper">{successMessage}</p>}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Speichern…' : 'Passwort speichern'}
          </button>
          <Link href="/login" className="button">Zum Login</Link>
          <Link href="/forgot-password" className="button">Neuen Link anfordern</Link>
        </form>
      </div>
    </section>
  );
}
