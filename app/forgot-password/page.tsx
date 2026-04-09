'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { requestPasswordReset, resolvePasswordResetErrorMessage } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setSuccessMessage('Wenn ein Konto zu dieser E-Mail existiert, haben wir dir einen Reset-Link geschickt.');
    } catch (requestError) {
      setError(resolvePasswordResetErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Passwort vergessen</h1>
        <p className="helper">Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.</p>
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
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Senden…' : 'Reset-Link senden'}
          </button>
          <Link href="/login" className="button">Zurück zum Login</Link>
        </form>
      </div>
    </section>
  );
}
