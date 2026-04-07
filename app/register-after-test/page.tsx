'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updateProfile } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import {
  loginUser,
  observeAuthState,
  registerUser,
  resolveLoginErrorMessage,
  resolveRegistrationErrorMessage,
  syncAuthSession,
} from '@/services/auth.service';
import { finalizePartnerRegistration, sanitizeInvitationToken } from '@/services/partnerFlow.service';
import { clearPartnerLocalSession, loadPartnerLocalSession } from '@/services/partnerSessionStorage';

export default function RegisterAfterTestPage() {
  return (
    <Suspense fallback={<section className="section"><div className="container">Lade Registrierung …</div></section>}>
      <RegisterAfterTestContent />
    </Suspense>
  );
}

function RegisterAfterTestContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = sanitizeInvitationToken(params.get('token'));
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [activeSessionEmail, setActiveSessionEmail] = useState<string | null>(auth.currentUser?.email ?? null);

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

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      setActiveSessionEmail(user?.email ?? null);
    });
    return unsubscribe;
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const session = loadPartnerLocalSession();
    if (!session || !token) return;

    setError(null);
    setIsSubmitting(true);

    if (mode === 'register' && password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      setIsSubmitting(false);
      return;
    }

    try {
      const credential = mode === 'register'
        ? await registerUser(email, password)
        : await loginUser(email, password);
      const normalizedDisplayName = displayName.trim();

      if (mode === 'register' && normalizedDisplayName) {
        await updateProfile(credential.user, { displayName: normalizedDisplayName });
      }

      await syncAuthSession(credential.user);
      await finalizePartnerRegistration({
        invitationToken: token,
        sessionId: session.sessionId,
        userId: credential.user.uid,
        email: credential.user.email ?? email.trim().toLowerCase(),
        displayName: normalizedDisplayName || credential.user.displayName || null,
      });
      clearPartnerLocalSession();
      router.push('/app/transparenz');
    } catch (submitError) {
      console.error('register-after-test.submit_failed', {
        code: (submitError as { code?: string })?.code ?? null,
        message: submitError instanceof Error ? submitError.message : String(submitError),
      });
      setError(mode === 'register'
        ? resolveRegistrationErrorMessage(submitError)
        : resolveLoginErrorMessage(submitError));
      setIsSubmitting(false);
    }
  }

  async function continueWithActiveSession() {
    const session = loadPartnerLocalSession();
    const currentUser = auth.currentUser;
    if (!session || !token || !currentUser) return;
    if (!currentUser.email) {
      setError('Für dieses Konto fehlt eine E-Mail-Adresse. Bitte melde dich mit E-Mail und Passwort an.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await syncAuthSession(currentUser);
      const normalizedDisplayName = displayName.trim();
      await finalizePartnerRegistration({
        invitationToken: token,
        sessionId: session.sessionId,
        userId: currentUser.uid,
        email: currentUser.email,
        displayName: normalizedDisplayName || currentUser.displayName || null,
      });
      clearPartnerLocalSession();
      router.push('/app/transparenz');
    } catch (submitError) {
      console.error('register-after-test.active_session_failed', {
        code: (submitError as { code?: string })?.code ?? null,
        message: submitError instanceof Error ? submitError.message : String(submitError),
      });
      setError(resolveRegistrationErrorMessage(submitError));
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Registrierung abschließen</h1>
        <p className="helper">
          Damit dein Ergebnis final zugeordnet werden kann, registriere dich oder melde dich mit einem bestehenden Konto an.
        </p>

        <form className="form-shell" onSubmit={submit}>
          {mode === 'register' && (
            <input className="input" required placeholder="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          )}
          <input className="input" type="email" required placeholder="E-Mail" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="input" type="password" minLength={6} required placeholder="Passwort" value={password} onChange={(event) => setPassword(event.target.value)} />
          {mode === 'register' && (
            <input
              className="input"
              type="password"
              minLength={6}
              required
              placeholder="Passwort wiederholen"
              value={passwordRepeat}
              onChange={(event) => setPasswordRepeat(event.target.value)}
            />
          )}
          {error && <p className="inline-error">{error}</p>}
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Wird gespeichert …' : mode === 'register' ? 'Registrieren' : 'Anmelden und fortfahren'}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
            disabled={isSubmitting}
          >
            {mode === 'register' ? 'Ich habe bereits ein Konto' : 'Ich habe noch kein Konto'}
          </button>
          {activeSessionEmail && (
            <button type="button" className="button secondary" onClick={continueWithActiveSession} disabled={isSubmitting}>
              Als {activeSessionEmail} fortfahren
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
