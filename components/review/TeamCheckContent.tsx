'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import {
  observePreparationPair,
  observeTeamCheckRecords,
  resolveScheduledForKey,
  saveTeamCheckPreparation,
  saveTeamCheckRecord,
} from '@/services/teamCheck.service';
import { formatTeamCheckDate } from '@/services/teamCheck.logic';
import type { TeamCheckPreparation, TeamCheckRecord } from '@/types/team-check';
import type { QuizCategory } from '@/types/quiz';

function formatDiscussedDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
}

function formatNextCheckInText(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const dateLabel = new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
  }).format(parsed);

  const hours = String(parsed.getHours()).padStart(2, '0');
  return `Nächster Austausch am ${dateLabel} um ${hours}h`;
}

function formatTodayExchangeTitle(now = new Date()) {
  const dateLabel = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
  }).format(now);

  return `Unseren Austausch von ${dateLabel}`;
}

function resolvePreparationAuthorLabel(params: {
  userId: string;
  bundle: Awaited<ReturnType<typeof fetchDashboardBundle>> | null;
}) {
  if (!params.bundle?.family) return 'Person';
  if (params.userId === params.bundle.family.initiatorUserId) return params.bundle.initiatorDisplayName ?? 'Person 1';
  if (params.userId === params.bundle.family.partnerUserId) return params.bundle.partnerDisplayName ?? 'Person 2';
  return 'Person';
}

export function TeamCheckContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [records, setRecords] = useState<TeamCheckRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [preparations, setPreparations] = useState<TeamCheckPreparation[]>([]);

  const [mode, setMode] = useState<'overview' | 'prepare' | 'conduct'>('overview');
  const [preparationNote, setPreparationNote] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setCurrentUserId(user.uid);
      const dashboard = await fetchDashboardBundle(user.uid);
      setBundle(dashboard);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const scheduledForKey = useMemo(
    () => resolveScheduledForKey(bundle?.family?.teamCheckPlan?.nextCheckInAt),
    [bundle?.family?.teamCheckPlan?.nextCheckInAt],
  );

  useEffect(() => {
    if (!bundle?.profile?.familyId) return;
    return observeTeamCheckRecords({ familyId: bundle.profile.familyId, onData: setRecords, maxEntries: 10 });
  }, [bundle?.profile?.familyId]);

  useEffect(() => {
    if (!bundle?.profile?.familyId || !scheduledForKey) {
      setPreparations([]);
      return;
    }
    return observePreparationPair({
      familyId: bundle.profile.familyId,
      scheduledForKey,
      onData: setPreparations,
    });
  }, [bundle?.profile?.familyId, scheduledForKey]);

  const discussedDate = formatDiscussedDate(bundle?.family?.resultsDiscussedAt ?? null);

  const hasPlan = Boolean(bundle?.family?.teamCheckPlan?.frequency && bundle?.family?.teamCheckPlan?.dayOfWeek !== undefined);
  const nextCheckInLabel = formatNextCheckInText(bundle?.family?.teamCheckPlan?.nextCheckInAt ?? null);
  const selectedRecord = records.find((entry) => entry.id === selectedRecordId) ?? null;
  const exchangeTitle = useMemo(() => formatTodayExchangeTitle(), []);

  const ownerOptions = useMemo(() => {
    if (!bundle || !currentUserId) return [] as Array<{ userId: string; label: string }>;
    const initiatorLabel = bundle.initiatorDisplayName ?? 'Partner 1';
    const partnerLabel = bundle.partnerDisplayName ?? 'Partner 2';
    const family = bundle.family;
    const options: Array<{ userId: string; label: string }> = [];
    if (family?.initiatorUserId) options.push({ userId: family.initiatorUserId, label: initiatorLabel });
    if (family?.partnerUserId) options.push({ userId: family.partnerUserId, label: partnerLabel });
    if (!options.some((entry) => entry.userId === currentUserId)) {
      options.unshift({ userId: currentUserId, label: 'Ich' });
    }
    return options;
  }, [bundle, currentUserId]);

  const myPreparation = useMemo(() => preparations.find((entry) => entry.userId === currentUserId) ?? null, [preparations, currentUserId]);

  useEffect(() => {
    if (!myPreparation) return;
    setPreparationNote([myPreparation.goodMoments, myPreparation.changeWishes].filter(Boolean).join('\n\n').trim());
  }, [myPreparation]);

  const discussedCardIds = useMemo(() => [
    ...new Set(preparations.flatMap((entry) => entry.selectedTaskActions.map((item) => item.cardId))),
  ], [preparations]);
  const visiblePreparations = useMemo(
    () => ownerOptions
      .map((owner) => ({ owner, prep: preparations.find((entry) => entry.userId === owner.userId) ?? null }))
      .filter(({ prep }) => Boolean(prep?.goodMoments?.trim())),
    [ownerOptions, preparations],
  );

  async function onSavePreparation() {
    if (!bundle?.profile?.familyId || !currentUserId || !scheduledForKey) return;
    if (!preparationNote.trim()) {
      setError('Bitte die Notizen zum Check-in ausfüllen.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveTeamCheckPreparation({
        familyId: bundle.profile.familyId,
        userId: currentUserId,
        scheduledForKey,
        goodMoments: preparationNote.trim(),
        changeWishes: '',
        handoverAreaCategoryKeys: [],
        swapAreaCategoryKeys: [],
        selectedTaskActions: [],
      });
      setMode('overview');
      setMessage('Gespeichert.');
    } catch {
      setError('Der Stand konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCheckIn() {
    if (!bundle?.family || !bundle.profile?.familyId || !currentUserId) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const discussedCategoryKeys = [
        ...new Set(preparations.flatMap((entry) => [...entry.handoverAreaCategoryKeys, ...entry.swapAreaCategoryKeys])),
      ] as QuizCategory[];

      await saveTeamCheckRecord({
        familyId: bundle.profile.familyId,
        actorUserId: currentUserId,
        preparations,
        discussedCardIds,
        discussedCategoryKeys,
        ownerDecisions: Object.entries(assignmentDraft).map(([cardId, toOwnerUserId]) => ({
          cardId,
          toOwnerUserId: toOwnerUserId ?? null,
        })),
        note: closingNote,
      });

      const refreshedBundle = await fetchDashboardBundle(currentUserId);
      setBundle(refreshedBundle);
      setMode('overview');
      setClosingNote('');
      setAssignmentDraft({});
      setMessage('Check-in gespeichert.');
    } catch {
      setError('Der Check-in konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !currentUserId) {
    return <section className="section"><div className="container">Lade Team-Check …</div></section>;
  }

  return (
    <section className="section">
      <div className="container stack">
        {!hasPlan ? (
          <button type="button" className="button team-check-plan-button" onClick={() => router.push('/app/einstellungen/team-check-planung')}>
            Check-in planen
          </button>
        ) : (
          <article className="card stack">
            {discussedDate && (
              <div className="report-block stack">
                <strong>Quiz-Ergebnisse durchgesprochen</strong>
                <p className="helper" style={{ margin: 0 }}>am {discussedDate}</p>
                <Link href="/app/ergebnisse" className="button" style={{ width: 'fit-content' }}>
                  Testergebnisse ansehen
                </Link>
              </div>
            )}

            {mode === 'overview' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="button primary" onClick={() => setMode('prepare')}>
                  Unseren Austausch vorbereiten
                </button>
                <button type="button" className="button" onClick={() => setMode('conduct')}>
                  Unseren Austausch durchführen
                </button>
              </div>
            )}
            <div className="stack" style={{ gap: 4 }}>
              {nextCheckInLabel && <p style={{ margin: 0 }}>{nextCheckInLabel}</p>}
            </div>
          </article>
        )}

        {records.length > 0 && (
          <article className="card stack">
            <h3 className="card-title" style={{ margin: 0 }}>Vergangene Austauschmomente</h3>
            <div className="stack" style={{ gap: 8 }}>
              {records.map((record) => {
                const formatted = formatTeamCheckDate(record.checkInAt);
                return (
                  <div key={record.id} className="report-block" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>Team-Check vom {formatted ?? '—'}</span>
                    <button type="button" className="button team-check-history-button" onClick={() => setSelectedRecordId(record.id)}>
                      Notiz ansehen
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
        )}

        {mode === 'prepare' && hasPlan && (
          <article className="card stack">
            <h3 className="card-title" style={{ margin: 0 }}>Unseren Austausch vorbereiten</h3>

            <label className="stack" style={{ gap: 6 }}>
              <textarea
                className="input team-check-preparation-textarea"
                value={preparationNote}
                onChange={(event) => setPreparationNote(event.target.value)}
                placeholder="Was ist gut gelaufen, was möchten wir verbessern, Aufgabenpakete umverteilen?"
                style={{ minHeight: 160 }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="button team-check-save-button" onClick={onSavePreparation} disabled={saving}>Speichern</button>
            </div>
          </article>
        )}

        {mode === 'conduct' && hasPlan && (
          <article className="card stack">
            <h3 className="card-title" style={{ margin: 0 }}>{exchangeTitle}</h3>

            {!visiblePreparations.length && <p className="helper" style={{ margin: 0 }}>Noch keine Vorbereitung gespeichert.</p>}

            <div className="stack" style={{ gap: 12 }}>
              {visiblePreparations.map(({ owner, prep }) => (
                <div key={owner.userId} className="report-block stack">
                  <strong>{owner.label}</strong>
                  <p className="helper" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {prep?.goodMoments}
                  </p>
                </div>
              ))}
            </div>

            <label className="stack" style={{ gap: 6 }}>
              <span>Gemeinsame Notizen</span>
              <textarea className="input team-check-preparation-textarea" value={closingNote} onChange={(event) => setClosingNote(event.target.value)} />
            </label>

            <div>
              <button type="button" className="button team-check-save-button" onClick={onSaveCheckIn} disabled={saving}>Abschliessen</button>
            </div>
          </article>
        )}

        {error && <p className="inline-error">{error}</p>}
        {message && <p className="helper" style={{ margin: 0 }}>{message}</p>}

        {selectedRecord && (
          <div className="ownership-modal-backdrop" onClick={() => setSelectedRecordId(null)}>
            <article
              className="card stack ownership-modal team-check-notes-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Notizen aus vergangenem Austausch"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ownership-modal-header">
                <div className="stack" style={{ gap: 4 }}>
                  <h3 className="card-title" style={{ margin: 0 }}>Notizen zum Austausch</h3>
                  <p className="helper" style={{ margin: 0 }}>
                    {formatTeamCheckDate(selectedRecord.checkInAt) ?? 'Vergangener Austausch'}
                  </p>
                </div>
                <button type="button" className="ownership-modal-close" onClick={() => setSelectedRecordId(null)}>
                  Schliessen
                </button>
              </div>

              <div className="stack" style={{ gap: 12 }}>
                {selectedRecord.preparationSnapshot
                  .filter((entry) => entry.goodMoments?.trim())
                  .map((entry) => (
                    <section key={entry.id} className="report-block stack" style={{ gap: 6 }}>
                      <strong>{resolvePreparationAuthorLabel({ userId: entry.userId, bundle })}</strong>
                      <p className="helper" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.goodMoments}</p>
                    </section>
                  ))}

                <section className="report-block stack" style={{ gap: 6 }}>
                  <strong>Gemeinsame Notizen</strong>
                  <p className="helper" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {selectedRecord.note?.trim() || 'Keine gemeinsamen Notizen hinterlegt.'}
                  </p>
                </section>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
