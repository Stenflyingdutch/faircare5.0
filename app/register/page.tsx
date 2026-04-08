'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { registerUser, resolveRegistrationErrorMessage, syncAuthSession } from '@/services/auth.service';
import { ensureInitiatorFamilySetup, ensureUserProfile } from '@/services/partnerFlow.service';
import { linkAnonymousSessionToUser } from '@/services/sessionLinking';
import { loadSessionFromStorage } from '@/services/sessionStorage';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setErrorCode(null);
    const inviteContextPresent = false;
    let userId: string | null = null;
    let finalizeStarted = false;
    let lastSuccessfulStep = 'signup.submit.start';
    let failedStep = 'signup.submit.start';
    const targetRoute = '/app/transparenz';

    logSignupInfo('signup.submit.start', {
      step: 'register.handleSubmit',
      path: '/register',
      inviteContextPresent,
    });
    logSignupInfo('invite_link_context.missing', {
      step: 'register.handleSubmit',
      path: '/register',
      inviteContextPresent,
    });
    if (password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.');
      setErrorCode(null);
      setIsSubmitting(false);
      return;
    }

    try {
      const credential = await registerUser(email, password, { inviteContextPresent });
      userId = credential.user.uid;
      lastSuccessfulStep = 'auth.create_user.success';
      failedStep = 'auth.create_user';

      if (auth.currentUser?.uid === credential.user.uid) {
        logSignupInfo('signup.auth_state.available', {
          step: 'register.handleSubmit',
          path: 'firebase-auth/currentUser',
          uid: credential.user.uid,
          inviteContextPresent,
        });
      } else {
        logSignupInfo('signup.auth_state.missing', {
          step: 'register.handleSubmit',
          path: 'firebase-auth/currentUser',
          uid: credential.user.uid,
          inviteContextPresent,
        });
      }

      finalizeStarted = true;
      logSignupInfo('signup.finalize.start', {
        step: 'register.handleSubmit',
        path: '/register',
        uid: credential.user.uid,
        inviteContextPresent,
      });
      const normalizedDisplayName = displayName.trim();
      await updateProfile(credential.user, { displayName: normalizedDisplayName });
      lastSuccessfulStep = 'auth.profile.update.success';
      failedStep = 'auth.session.sync';
      await syncAuthSession(credential.user);
      lastSuccessfulStep = 'auth.session.sync.success';
      failedStep = 'user_profile.create';
      await ensureUserProfile({
        userId: credential.user.uid,
        email,
        displayName: normalizedDisplayName,
        role: 'initiator',
        inviteContextPresent,
      });
      lastSuccessfulStep = 'user_profile.create.success';
      failedStep = 'family_doc.create';
      await ensureInitiatorFamilySetup(credential.user.uid, { inviteContextPresent });
      lastSuccessfulStep = 'family_doc.create.success';
      failedStep = 'anonymous_session.link';
      const session = loadSessionFromStorage();
      if (session) {
        await linkAnonymousSessionToUser(credential.user, session);
        lastSuccessfulStep = 'anonymous_session.link.success';
      }
      logSignupInfo('bootstrap.complete', {
        step: 'register.handleSubmit',
        path: '/register',
        uid: credential.user.uid,
        inviteContextPresent,
      });
      logSignupInfo('signup.finalize.success', {
        step: 'register.handleSubmit',
        path: '/register',
        uid: credential.user.uid,
        inviteContextPresent,
      });
      logSignupInfo('signup.redirect.start', {
        step: 'register.handleSubmit',
        path: '/register',
        uid: credential.user.uid,
        inviteContextPresent,
      });
      failedStep = 'redirect.start';
      logSignupInfo('redirect.start', {
        step: 'register.handleSubmit',
        path: '/register',
        uid: credential.user.uid,
        inviteContextPresent,
        extra: { targetRoute },
      });
      failedStep = 'redirect.target';
      logSignupInfo('signup.redirect.target', {
        step: 'register.handleSubmit',
        path: targetRoute,
        uid: credential.user.uid,
        inviteContextPresent,
        extra: { targetRoute },
      });
      logSignupInfo('redirect.target', {
        step: 'register.handleSubmit',
        path: targetRoute,
        uid: credential.user.uid,
        inviteContextPresent,
        extra: { targetRoute },
      });
      failedStep = 'redirect.navigate';
      router.push(targetRoute);
      failedStep = 'redirect.success';
      logSignupInfo('redirect.success', {
        step: 'register.handleSubmit',
        path: '/register',
        uid: credential.user.uid,
        inviteContextPresent,
        extra: { targetRoute },
      });
    } catch (registrationError) {
      const error = registrationError as {
        code?: string;
        message?: string;
        failedStep?: string;
        path?: string;
        collection?: string;
        queryName?: string;
        targetRoute?: string;
        cause?: { code?: string; message?: string } | unknown;
      };
      const cause = error.cause as { code?: string; message?: string } | undefined;
      logSignupError('signup.flow.failed', registrationError, {
        step: 'register.handleSubmit',
        path: '/register',
        uid: userId,
        inviteContextPresent,
        extra: {
          failedStep: error.failedStep ?? failedStep,
          lastSuccessfulStep,
          collection: error.collection ?? null,
          queryName: error.queryName ?? null,
          targetRoute: error.targetRoute ?? targetRoute,
          errorPath: error.path ?? null,
          errorCode: error.code ?? null,
          errorMessage: error.message ?? null,
          errorCauseCode: cause?.code ?? null,
          errorCauseMessage: cause?.message ?? null,
        },
      });
      if (finalizeStarted) {
        logSignupError('signup.finalize.failed', registrationError, {
          step: 'register.handleSubmit',
          path: '/register',
          uid: userId,
          inviteContextPresent,
          extra: {
            failedStep: error.failedStep ?? failedStep,
            lastSuccessfulStep,
            collection: error.collection ?? null,
            queryName: error.queryName ?? null,
            targetRoute: error.targetRoute ?? targetRoute,
            errorPath: error.path ?? null,
            errorCode: error.code ?? null,
            errorMessage: error.message ?? null,
            errorCauseCode: cause?.code ?? null,
            errorCauseMessage: cause?.message ?? null,
          },
        });
      }
      const code = (registrationError as { code?: string })?.code;
      setError(resolveRegistrationErrorMessage(registrationError));
      setErrorCode(typeof code === 'string' && code.trim().length > 0 ? code : null);
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
          {error && (
            <p className="inline-error">
              {error}
              {errorCode && <><br />Fehlercode: {errorCode}</>}
            </p>
          )}
          <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? 'Registriert …' : 'Registrieren'}</button>
        </form>
      </div>
    </section>
  );
}
