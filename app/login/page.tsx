'use client';

import { useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';

import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { auth } from '@/lib/firebase';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const initialMode = useMemo<AuthMode>(() => (searchParams.get('mode') === 'register' ? 'register' : 'login'), [searchParams]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setMessage('');

    if (!email.includes('@')) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Das Passwort muss mindestens 6 Zeichen haben.');
        return;
      }

      if (password !== repeatPassword) {
        setError('Passwort und Passwort wiederholen stimmen nicht überein.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        setMessage('Registrierung erfolgreich. Du bist jetzt angemeldet und kannst zum Detailergebnis weitergehen.');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setMessage('Login erfolgreich. Du kannst jetzt dein Detailergebnis ansehen.');
      }
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : undefined;

      if (code === 'auth/email-already-in-use') {
        setError('Diese E-Mail ist bereits registriert. Bitte einloggen.');
      } else if (code === 'auth/invalid-email') {
        setError('Die E-Mail-Adresse ist ungültig.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('E-Mail/Passwort-Registrierung ist im Firebase-Projekt noch nicht aktiviert.');
      } else if (code === 'auth/weak-password') {
        setError('Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('E-Mail oder Passwort ist nicht korrekt.');
      } else {
        setError(`Anmeldung aktuell nicht möglich (${code || 'unbekannter Fehler'}). Bitte erneut versuchen.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero
        badge={mode === 'register' ? 'Registrierung' : 'Login'}
        title={mode === 'register' ? 'Registrieren für Detailergebnis' : 'Willkommen zurück'}
        subtitle="Nach dem Gesamtergebnis kannst du dich hier registrieren oder einloggen, um das Detailergebnis freizuschalten."
      />
      <SectionWrapper>
        <div style={{ width: 'min(480px, 100%)' }}>
          <Card
            title={mode === 'register' ? 'Registrierung' : 'Login-Bereich'}
            description={mode === 'register' ? 'Erstelle dein Konto für den Zugriff auf die Detailauswertung.' : 'Melde dich an, um deine Detailauswertung zu sehen.'}
          >
            <form className="form-shell" style={{ marginTop: '1rem' }} onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="E-Mail" className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input type="password" placeholder="Passwort" className="input" value={password} onChange={(event) => setPassword(event.target.value)} />

              {mode === 'register' ? (
                <input
                  type="password"
                  placeholder="Passwort wiederholen"
                  className="input"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                />
              ) : null}

              {!!error && <p style={{ color: '#b42318', margin: '.5rem 0 0' }}>{error}</p>}
              {!!message && <p style={{ color: '#027a48', margin: '.5rem 0 0' }}>{message}</p>}

              <button
                type="button"
                className="button primary"
                style={{ width: '100%' }}
                onClick={submit}
                disabled={loading || !email || !password || (mode === 'register' && !repeatPassword)}
              >
                {loading ? 'Bitte warten…' : mode === 'register' ? 'Jetzt registrieren' : 'Jetzt einloggen'}
              </button>

              <button
                type="button"
                className="button secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  setMode((current) => (current === 'login' ? 'register' : 'login'));
                  setError('');
                  setMessage('');
                  setPassword('');
                  setRepeatPassword('');
                }}
              >
                {mode === 'login' ? 'Noch kein Konto? Jetzt registrieren' : 'Schon registriert? Zum Login'}
              </button>
            </form>
          </Card>
        </div>
      </SectionWrapper>
    </>
  );
}
