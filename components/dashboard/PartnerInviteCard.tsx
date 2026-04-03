'use client';

import { FormEvent, useMemo, useState } from 'react';

import { sendPartnerInvite } from '@/services/invitePartner';

interface PartnerInviteCardProps {
  hasPartner: boolean;
  onSent?: () => Promise<void> | void;
}

type InviteState = 'idle' | 'loading' | 'success' | 'error';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function PartnerInviteCard({ hasPartner, onSent }: PartnerInviteCardProps) {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [state, setState] = useState<InviteState>('idle');
  const [message, setMessage] = useState('');

  const normalized = useMemo(() => normalizeEmail(partnerEmail), [partnerEmail]);
  const canSubmit = !hasPartner && state !== 'loading' && isValidEmail(normalized);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setState('loading');
    setMessage('');

    try {
      const result = await sendPartnerInvite(normalized);
      setState('success');
      setMessage(`Einladung erfasst. Versand an: ${result.actualRecipient}.`);
      setPartnerEmail('');
      if (onSent) {
        await onSent();
      }
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Einladung konnte nicht versendet werden.');
    }
  }

  return (
    <article className="card stack">
      <h2 className="card-title">Partner einladen</h2>
      <p className="card-description">Lade deinen Partner per E-Mail ein. Er erhält exakt denselben Fragenkatalog – ohne Filterfragen.</p>
      <form className="stack" onSubmit={onSubmit}>
        <input
          type="email"
          className="input"
          required
          placeholder="partner@email.de"
          value={partnerEmail}
          onChange={(event) => {
            setPartnerEmail(event.target.value);
            if (state !== 'loading') {
              setState('idle');
              setMessage('');
            }
          }}
          disabled={state === 'loading' || hasPartner}
        />
        <button
          type="submit"
          className="button primary"
          disabled={!canSubmit}
        >
          {state === 'loading' ? 'Einladung wird versendet …' : 'Einladung senden'}
        </button>
      </form>
      {state === 'success' && <p className="helper">{message}</p>}
      {state === 'error' && <p className="inline-error">{message}</p>}
      {hasPartner && <p className="helper">Es ist bereits ein Partner mit deiner Familie verbunden.</p>}
    </article>
  );
}
