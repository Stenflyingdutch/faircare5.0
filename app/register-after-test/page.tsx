'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updateProfile } from 'firebase/auth';

import { registerUser, resolveRegistrationErrorMessage } from '@/services/auth.service';
import { finalizePartnerRegistration } from '@/services/partnerFlow.service';
import { clearPartnerLocalSession, loadPartnerLocalSession } from '@/services/partnerSessionStorage';

export default function RegisterAfterTestPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = loadPartnerLocalSession();
    if (!session || !session.completedAt || session.invitationToken !== token) {
      router.replace(token ? `/invite/${token}` : '/');
    }
  }, [router, token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const session = loadPartnerLocalSession();
    if (!session || !token) return;

    setError(null);
    setIsSubmitting(true);

    if (password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      setIsSubmitting(false);
      return;
    }

    try {
      const credential = await registerUser(email, password);
      const normalizedDisplayName = displayName.trim();
      await updateProfile(credential.user, { displayName: normalizedDisplayName });
      await finalizePartnerRegistration({
        invitationToken: token,
        sessionId: session.sessionId,
        userId: credential.user.uid,
        email,
        displayName: normalizedDisplayName,
      });
      clearPartnerLocalSession();
      router.push('/dashboard');
    } catch (submitError) {
      setError(resolveRegistrationErrorMessage(submitError));
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Registrierung abschließen</h1>
        <p className="helper">Damit dein Ergebnis final zugeordnet werden kann, registriere dich jetzt mit der eingeladenen E-Mail-Adresse.</p>

        <form className="form-shell" onSubmit={submit}>
          <input className="input" required placeholder="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <input className="input" type="email" required placeholder="E-Mail" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="input" type="password" minLength={6} required placeholder="Passwort" value={password} onChange={(event) => setPassword(event.target.value)} />
          <input className="input" type="password" minLength={6} required placeholder="Passwort wiederholen" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
          {error && <p className="inline-error">{error}</p>}
          <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? 'Wird gespeichert …' : 'Registrieren'}</button>
        </form>
      </div>
    </section>
  );
}
