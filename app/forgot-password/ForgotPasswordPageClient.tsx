'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  requestPasswordReset,
  resolvePasswordResetErrorMessage,
} from '@/services/auth.service';

export type InitialForgotPasswordNotice = {
  kind: 'success' | 'error';
  text: string;
} | null;

type ForgotPasswordPageClientProps = {
  initialEmail: string;
  initialNotice: InitialForgotPasswordNotice;
};

export default function ForgotPasswordPageClient({
  initialEmail,
  initialNotice,
}: ForgotPasswordPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(initialNotice?.kind === 'error' ? initialNotice.text : null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialNotice?.kind === 'success' ? initialNotice.text : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => !isSubmitting && Boolean(email.trim()), [email, isSubmitting]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Bitte gib zuerst deine E-Mail-Adresse ein.');
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSuccessMessage('Wir haben dir eine E-Mail zum Zurücksetzen deines Passworts geschickt.');
    } catch (submitError) {
      setError(resolvePasswordResetErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Passwort zurücksetzen</h1>
        <form className="form-shell" onSubmit={submit}>
          <input
            type="email"
            required
            className="input"
            placeholder="E-Mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && <p className="inline-error">{error}</p>}
          {successMessage && <p className="helper">{successMessage}</p>}
          <button className="button primary" type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Sende E-Mail …' : 'Reset-E-Mail senden'}
          </button>
          <button className="button" type="button" onClick={() => router.push('/login')}>
            Zurück zum Login
          </button>
        </form>
      </div>
    </section>
  );
}
