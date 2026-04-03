'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginUser } from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await loginUser(email, password);
      router.push('/dashboard');
    } catch {
      setError('Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort.');
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
          <button className="button primary" type="submit">Anmelden</button>
        </form>
      </div>
    </section>
  );
}
