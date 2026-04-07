'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  fetchAppUserProfile,
  resolveInvitationByToken,
  sanitizeInvitationToken,
  startPartnerSession,
  type InvitationResolveReason,
} from '@/services/partnerFlow.service';
import { savePartnerLocalSession } from '@/services/partnerSessionStorage';
import type { InvitationDocument } from '@/types/partner-flow';


function normalizeName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'valid' | 'accepted' | 'expired' | 'invalid'>('invalid');
  const [reason, setReason] = useState<InvitationResolveReason>('invalid_route_params');
  const [invitation, setInvitation] = useState<InvitationDocument | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    console.info('invite.route.entered', { rawToken: params?.token ?? null });
    const token = sanitizeInvitationToken(params?.token);
    console.info('invite.route.parsed_token', { tokenLength: token.length });
    if (!token) {
      setStatus('invalid');
      setReason('missing_token');
      setLoading(false);
      return;
    }

    resolveInvitationByToken(token)
      .then((result) => {
        console.info('invite.lookup.result', { status: result.status, reason: result.reason ?? 'n/a' });
        setStatus(result.status);
        setReason(result.reason ?? 'lookup_failed');
        if (result.status !== 'invalid') {
          setInvitation(result.invitation);
        }
      })
      .catch((error) => {
        console.error('invite.lookup.failed', {
          reason: 'lookup_failed',
          message: error instanceof Error ? error.message : String(error),
        });
        setStatus('invalid');
        setReason('lookup_failed');
      })
      .finally(() => setLoading(false));
  }, [params?.token]);

  async function beginPartnerQuiz() {
    const token = sanitizeInvitationToken(params?.token);
    if (!invitation || !token) return;
    setStarting(true);
    try {
      const session = await startPartnerSession(invitation);
      const initiatorProfile = await fetchAppUserProfile(invitation.initiatorUserId);
      const fallbackFromEmail = initiatorProfile?.email?.split('@')[0]?.trim();

      savePartnerLocalSession({
        invitationToken: token,
        invitationId: invitation.id,
        sessionId: session.id,
        familyId: invitation.familyId,
        questionSetId: session.questionSetId,
        questions: session.questionSetSnapshot,
        answers: {},
        counterpartName: normalizeName(initiatorProfile?.displayName) || normalizeName(fallbackFromEmail) || 'Partner',
      });
      router.push(`/partner-test/${token}`);
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
              {status === 'invalid' && reason === 'lookup_failed' && 'Die Einladung konnte gerade nicht geprüft werden. Bitte versuche es erneut.'}
              {status === 'invalid' && reason !== 'lookup_failed' && 'Dieser Einladungslink ist ungültig.'}
            </p>
            <Link href="/" className="button secondary">Zur Startseite</Link>
          </article>
        )}
      </div>
    </section>
  );
}
