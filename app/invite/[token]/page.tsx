'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  resolveInvitationByToken,
  sanitizeInvitationToken,
  startPartnerSession,
} from '@/services/partnerFlow.service';
import { savePartnerLocalSession } from '@/services/partnerSessionStorage';
import { logSignupInfo } from '@/services/signup-debug.service';
import type { InvitationDocument, InvitationResolutionReason, InvitationResolutionStatus } from '@/types/partner-flow';

function normalizeName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InvitationResolutionStatus>('invalid');
  const [reason, setReason] = useState<InvitationResolutionReason | null>('missing_token');
  const [invitation, setInvitation] = useState<InvitationDocument | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    logSignupInfo('route_is_public_invite', {
      step: 'InviteLandingPage.useEffect',
      path: '/invite/[token]',
      extra: { rawTokenPresent: Boolean(params?.token) },
    });
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
        console.info('invite.lookup.result', { status: result.status, reason: result.reason ?? 'none' });
        setStatus(result.status);
        setReason(result.reason);
        if ('invitation' in result && result.invitation) {
          setInvitation(result.invitation);
        }
      })
      .catch((error) => {
        console.error('invite.route.lookup_failed', error);
        setStatus('error');
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

      savePartnerLocalSession({
        invitationToken: token,
        invitationId: invitation.id,
        sessionId: session.id,
        familyId: invitation.familyId,
        questionSetId: session.questionSetId,
        questions: session.questionSetSnapshot,
        answers: {},
        counterpartName: normalizeName(invitation.initiatorDisplayName) || 'Initiator',
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
              {starting ? 'Wird vorbereitet …' : 'Partner-Quiz starten'}
            </button>
          </>
        ) : (
          <article className="result-card stack">
            <h1 className="test-title">Einladungslink nicht verfügbar</h1>
            <p>
              {status === 'accepted' && 'Diese Einladung wurde bereits verwendet.'}
              {status === 'expired' && 'Diese Einladung ist abgelaufen.'}
              {status === 'invalid' && 'Dieser Einladungslink ist ungültig.'}
              {status === 'error' && 'Der Einladungslink konnte gerade nicht geprüft werden. Bitte versuche es erneut.'}
            </p>
            {reason === 'lookup_failed' && (
              <p className="helper">Wenn der Fehler bestehen bleibt, erstelle bitte eine neue Einladung.</p>
            )}
            <Link href="/" className="button secondary">Zur Startseite</Link>
          </article>
        )}
      </div>
    </section>
  );
}
