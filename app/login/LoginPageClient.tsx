'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  loginUser,
  resolveLoginErrorMessage,
  signOutUser,
  syncAuthSession,
} from '@/services/auth.service';
import { ensureInitiatorFamilySetup, fetchDashboardBundle } from '@/services/partnerFlow.service';
import { hasOwnershipCardsForFamily } from '@/services/ownership.service';
import { isBlockedProfile } from '@/services/user-profile.service';

type LoginPageClientProps = {
  redirectTo?: string | null;
};

export default function LoginPageClient({ redirectTo }: LoginPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const safeRedirectTo = redirectTo && redirectTo.startsWith('/') ? redirectTo : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const userCredential = await loginUser(email, password);
      await syncAuthSession(userCredential.user, { forceRefresh: true });
      const userId = userCredential.user.uid;
      let bundle = await fetchDashboardBundle(userId);
      if (bundle.profile?.role !== 'partner' && !bundle.profile?.familyId) {
        await ensureInitiatorFamilySetup(userId);
        bundle = await fetchDashboardBundle(userId);
      }
      if (isBlockedProfile(bundle.profile)) {
        await signOutUser();
        setError('Dein Konto ist derzeit gesperrt. Bitte kontaktiere den Support.');
        return;
      }
      if (safeRedirectTo) {
        router.push(safeRedirectTo);
        return;
      }
      const familyId = bundle.profile?.familyId;
      if (familyId && await hasOwnershipCardsForFamily(familyId)) {
        router.push('/app/home');
      } else {
        router.push('/app/transparenz');
      }
    } catch (loginError) {
      setError(resolveLoginErrorMessage(loginError));
    }
  }

  function goToForgotPassword() {
    const normalizedEmail = email.trim();
    const target = normalizedEmail
      ? `/forgot-password?email=${encodeURIComponent(normalizedEmail)}`
      : '/forgot-password';
    router.push(target);
  }

  function goToRegister() {
    router.push('/register');
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Login</h1>
        <form className="form-shell" onSubmit={submit}>
          <input type="email" required className="input" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="input" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="inline-error">{error}</p>}
          <button className="button primary" type="submit">Anmelden</button>
          <button className="button" type="button" onClick={goToRegister}>Registrieren</button>
          <button className="button" type="button" onClick={goToForgotPassword}>Passwort vergessen?</button>
        </form>
      </div>
    </section>
  );
}
