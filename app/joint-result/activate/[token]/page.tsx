'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { activateJointResult } from '@/services/partnerFlow.service';

export default function ActivateJointResultPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('Aktivierung wird geprüft …');

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!params?.token) {
        setState('error');
        setMessage('Ungültiger Aktivierungslink.');
        return;
      }

      try {
        const result = await activateJointResult(params.token, user.uid);
        setState(result.alreadyActive ? 'already' : 'success');
        setMessage(result.alreadyActive ? 'Das Gesamtergebnis war bereits freigeschaltet.' : 'Das Gesamtergebnis wurde erfolgreich freigeschaltet.');
      } catch (error) {
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Aktivierung fehlgeschlagen.');
      }
    });

    return () => unsubscribe();
  }, [params?.token, router]);

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Gesamtergebnis aktivieren</h1>
        <article className="result-card stack">
          <p>{message}</p>
          {state !== 'loading' && <Link href="/dashboard" className="button primary">Zum Dashboard</Link>}
        </article>
      </div>
    </section>
  );
}
