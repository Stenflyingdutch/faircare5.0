'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { resolveInvitationByToken, startPartnerSession } from '@/services/partnerFlow.service';
import { savePartnerLocalSession } from '@/services/partnerSessionStorage';
import type { InvitationDocument } from '@/types/partner-flow';

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'valid' | 'accepted' | 'expired' | 'invalid'>('invalid');
  const [invitation, setInvitation] = useState<InvitationDocument | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const token = params?.token;
    if (!token) return;

    resolveInvitationByToken(token)
      .then((result) => {
        setStatus(result.status);
        if (result.status !== 'invalid') {
          setInvitation(result.invitation);
        }
      })
      .finally(() => setLoading(false));
  }, [params?.token]);

  async function beginPartnerQuiz() {
    if (!invitation || !params?.token) return;
    setStarting(true);
    try {
      const session = await startPartnerSession(invitation);
      savePartnerLocalSession({
        invitationToken: params.token,
        invitationId: invitation.id,
        sessionId: session.id,
        familyId: invitation.familyId,
        questionSetId: session.questionSetId,
        questions: session.questionSetSnapshot,
        answers: {},
      });
      router.push(`/partner-test/${params.token}`);
    } catch {
      setStarting(false);
    }
  }

  if (loading) return <section className="section"><div className="container test-shell">Einladung wird geprüft …</div></section>;

  return (
    <section className="section">
      <div className="container test-shell stack">
        {status === 'valid' && invitation ? (
          <>
            <h1 className="test-title">Willkommen zum Partner-Quiz</h1>
            <p className="helper">Du erhältst exakt denselben Fragenkatalog wie der Initiator – gleiche Reihenfolge, gleiche Kategorien, keine Filterfragen.</p>
            <button className="button primary" type="button" onClick={beginPartnerQuiz} disabled={starting}>
              {starting ? 'Wird vorbereitet …' : 'Partner-Test starten'}
            </button>
          </>
        ) : (
          <article className="result-card stack">
            <h1 className="test-title">Einladungslink nicht verfügbar</h1>
            <p>
              {status === 'accepted' && 'Diese Einladung wurde bereits verwendet.'}
              {status === 'expired' && 'Diese Einladung ist abgelaufen.'}
              {status === 'invalid' && 'Dieser Einladungslink ist ungültig.'}
            </p>
            <Link href="/" className="button secondary">Zur Startseite</Link>
          </article>
        )}
      </div>
    </section>
  );
}
