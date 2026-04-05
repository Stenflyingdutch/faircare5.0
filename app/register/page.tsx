'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';

import { registerUser, resolveRegistrationErrorMessage } from '@/services/auth.service';
import { ensureUserProfile } from '@/services/partnerFlow.service';
import { linkAnonymousSessionToUser } from '@/services/sessionLinking';
import { loadSessionFromStorage } from '@/services/sessionStorage';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    if (password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      setIsSubmitting(false);
      return;
    }

    try {
      const credential = await registerUser(email, password);
      const normalizedDisplayName = displayName.trim();
      await updateProfile(credential.user, { displayName: normalizedDisplayName });
      await ensureUserProfile({
        userId: credential.user.uid,
        email,
        displayName: normalizedDisplayName,
        role: 'initiator',
      });
      const session = loadSessionFromStorage();
      if (session) {
        await linkAnonymousSessionToUser(credential.user, session);
      }
      router.push('/app/review');
    } catch (registrationError) {
      setError(resolveRegistrationErrorMessage(registrationError));
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Registrieren für ausführlichen Bericht</h1>
        <form className="form-shell" onSubmit={handleSubmit}>
          <input required placeholder="Name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <input required type="email" placeholder="E-Mail" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required minLength={6} type="password" placeholder="Passwort (mind. 6 Zeichen)" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input required minLength={6} type="password" placeholder="Passwort wiederholen" className="input" value={passwordRepeat} onChange={(e) => setPasswordRepeat(e.target.value)} />
          {error && <p className="inline-error">{error}</p>}
          <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? 'Registriert …' : 'Registrieren'}</button>
        </form>
      </div>
    </section>
  );
}
