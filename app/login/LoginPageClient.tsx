'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  loginUser,
  resolveLoginErrorMessage,
  resolvePostLoginBootstrapErrorMessage,
  signOutUser,
  syncAuthSession,
} from '@/services/auth.service';
import { ensureInitiatorFamilySetup, fetchDashboardBundle } from '@/services/partnerFlow.service';
import { hasOwnershipCardsForFamily } from '@/services/ownership.service';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';
import { isBlockedProfile } from '@/services/user-profile.service';

type LoginPageClientProps = {
  redirectTo?: string | null;
  resetNotice?: string | null;
};

function readErrorMetadata(error: unknown) {
  const errorObject = error as {
    code?: string;
    failedStep?: string;
    collection?: string;
    queryName?: string;
    path?: string;
  };

  return {
    errorCode: errorObject?.code ?? null,
    errorMessage: error instanceof Error ? error.message : String(error),
    failedStep: errorObject?.failedStep ?? null,
    collection: errorObject?.collection ?? null,
    queryName: errorObject?.queryName ?? null,
    targetPath: errorObject?.path ?? null,
  };
}

export default function LoginPageClient({ redirectTo, resetNotice }: LoginPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const safeRedirectTo = redirectTo && redirectTo.startsWith('/') ? redirectTo : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    logSignupInfo('login.submit.start', {
      step: 'LoginPageClient.submit',
      path: '/login',
      extra: { hasRedirectTo: Boolean(safeRedirectTo) },
    });

    let userCredential: Awaited<ReturnType<typeof loginUser>>;
    try {
      userCredential = await loginUser(email, password);
    } catch (authError) {
      const message = resolveLoginErrorMessage(authError);
      logSignupInfo('login.ui.error.set', {
        step: 'LoginPageClient.submit',
        path: '/login',
        extra: {
          phase: 'auth',
          uiMessage: message,
          ...readErrorMetadata(authError),
        },
      });
      setError(message);
      return;
    }

    const userId = userCredential.user.uid;

    try {
      await syncAuthSession(userCredential.user);
    } catch (sessionError) {
      const message = resolvePostLoginBootstrapErrorMessage(sessionError);
      logSignupError('bootstrap.session.sync.failed', sessionError, {
        step: 'LoginPageClient.submit',
        path: '/api/auth/session',
        uid: userId,
      });
      logSignupInfo('login.ui.error.set', {
        step: 'LoginPageClient.submit',
        path: '/login',
        uid: userId,
        extra: {
          phase: 'session',
          uiMessage: message,
          ...readErrorMetadata(sessionError),
        },
      });
      setError(message);
      return;
    }

    try {
      logSignupInfo('bootstrap.dashboard.load.start', {
        step: 'LoginPageClient.submit',
        path: '/login',
        uid: userId,
      });
      let bundle = await fetchDashboardBundle(userId);
      if (bundle.profile?.role !== 'partner' && !bundle.profile?.familyId) {
        logSignupInfo('bootstrap.family.setup.start', {
          step: 'LoginPageClient.submit',
          path: '/login',
          uid: userId,
        });
        await ensureInitiatorFamilySetup(userId);
        logSignupInfo('bootstrap.family.setup.success', {
          step: 'LoginPageClient.submit',
          path: '/login',
          uid: userId,
        });
        bundle = await fetchDashboardBundle(userId);
      }
      logSignupInfo('bootstrap.dashboard.load.success', {
        step: 'LoginPageClient.submit',
        path: '/login',
        uid: userId,
        extra: {
          profilePresent: Boolean(bundle.profile),
          familyId: bundle.profile?.familyId ?? null,
        },
      });
      if (isBlockedProfile(bundle.profile)) {
        await signOutUser();
        logSignupInfo('login.ui.error.set', {
          step: 'LoginPageClient.submit',
          path: '/login',
          uid: userId,
          extra: {
            phase: 'account_status',
            uiMessage: 'Dein Konto ist derzeit gesperrt. Bitte kontaktiere den Support.',
          },
        });
        setError('Dein Konto ist derzeit gesperrt. Bitte kontaktiere den Support.');
        return;
      }
      if (safeRedirectTo) {
        router.push(safeRedirectTo);
        return;
      }

      const sharedResultsReleased = Boolean(bundle.family?.resultsUnlocked);
      if (!sharedResultsReleased) {
        router.push('/app/transparenz');
        return;
      }

      const familyId = bundle.profile?.familyId ?? null;
      if (familyId && await hasOwnershipCardsForFamily(familyId)) {
        router.push('/app/home');
      } else {
        router.push('/app/transparenz');
      }
    } catch (bootstrapError) {
      const message = resolvePostLoginBootstrapErrorMessage(bootstrapError);
      logSignupError('bootstrap.dashboard.load.failed', bootstrapError, {
        step: 'LoginPageClient.submit',
        path: '/login',
        uid: userId,
      });
      logSignupInfo('login.ui.error.set', {
        step: 'LoginPageClient.submit',
        path: '/login',
        uid: userId,
        extra: {
          phase: 'bootstrap',
          uiMessage: message,
          ...readErrorMetadata(bootstrapError),
        },
      });
      setError(message);
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
          {resetNotice && <p className="helper">{resetNotice}</p>}
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
