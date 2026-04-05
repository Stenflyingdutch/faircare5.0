'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginUser, requestPasswordReset } from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await loginUser(email, password);
      router.push('/app/review');
    } catch {
      setError('Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort.');
    }
  }


  async function forgotPassword() {
    setError(null);
    setResetMessage(null);
    if (!email.trim()) {
      setError('Bitte gib zuerst deine E-Mail-Adresse ein.');
      return;
    }
    try {
      await requestPasswordReset(email.trim());
      setResetMessage('Wir haben dir eine E-Mail zum Zurücksetzen deines Passworts geschickt.');
    } catch {
      setError('Passwort-Reset konnte nicht gestartet werden. Bitte prüfe deine E-Mail-Adresse.');
    }
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Login</h1>
        <form className="form-shell" onSubmit={submit}>
          <input type="email" required className="input" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="input" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="inline-error">{error}</p>}
          {resetMessage && <p className="helper">{resetMessage}</p>}
          <button className="button primary" type="submit">Anmelden</button>
          <button className="button" type="button" onClick={forgotPassword}>Passwort vergessen?</button>
        </form>
      </div>
    </section>
  );
}
