'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { observeOwnershipCards } from '@/services/ownership.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import {
  observePreparationPair,
  observeTeamCheckRecords,
  resolveScheduledForKey,
  saveTeamCheckPreparation,
  saveTeamCheckRecord,
} from '@/services/teamCheck.service';
import { formatTeamCheckDate } from '@/services/teamCheck.logic';
import type { OwnershipCardDocument } from '@/types/ownership';
import type { TeamCheckPreparation, TeamCheckRecord } from '@/types/team-check';
import type { QuizCategory } from '@/types/quiz';

function resolveCardIsActive(card: OwnershipCardDocument) {
  if (typeof card.isActive === 'boolean') return card.isActive;
  return Boolean(card.ownerUserId || card.focusLevel);
}

function formatDiscussedDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
}

export function TeamCheckContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [cards, setCards] = useState<OwnershipCardDocument[]>([]);
  const [records, setRecords] = useState<TeamCheckRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [preparations, setPreparations] = useState<TeamCheckPreparation[]>([]);

  const [mode, setMode] = useState<'overview' | 'prepare' | 'conduct'>('overview');
  const [goodMoments, setGoodMoments] = useState('');
  const [changeWishes, setChangeWishes] = useState('');
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

  useEffect(() => {
    if (!bundle?.profile?.familyId) return;
    return observeOwnershipCards(bundle.profile.familyId, setCards);
  }, [bundle?.profile?.familyId]);

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

  const activatedCardsCount = useMemo(() => cards.filter(resolveCardIsActive).length, [cards]);
  const showOwnershipHint = activatedCardsCount === 0;
  const discussedDate = formatDiscussedDate(bundle?.family?.resultsDiscussedAt ?? null);

  const hasPlan = Boolean(bundle?.family?.teamCheckPlan?.frequency && bundle?.family?.teamCheckPlan?.dayOfWeek !== undefined);
  const nextCheckInLabel = formatTeamCheckDate(bundle?.family?.teamCheckPlan?.nextCheckInAt ?? null, Boolean(bundle?.family?.teamCheckPlan?.time));
  const selectedRecord = records.find((entry) => entry.id === selectedRecordId) ?? null;

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
    setGoodMoments(myPreparation.goodMoments);
    setChangeWishes(myPreparation.changeWishes ?? '');
  }, [myPreparation]);

  const discussedCardIds = useMemo(() => [
    ...new Set(preparations.flatMap((entry) => entry.selectedTaskActions.map((item) => item.cardId))),
  ], [preparations]);

  const discussedCards = useMemo(() => cards.filter((card) => discussedCardIds.includes(card.id)), [cards, discussedCardIds]);

  async function onSavePreparation() {
    if (!bundle?.profile?.familyId || !currentUserId || !scheduledForKey) return;
    if (!goodMoments.trim()) {
      setError('Bitte das Pflichtfeld „Was ist gut gelaufen oder worüber habe ich mich gefreut“ ausfüllen.');
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
        goodMoments: goodMoments.trim(),
        changeWishes: changeWishes.trim(),
        handoverAreaCategoryKeys: [],
        swapAreaCategoryKeys: [],
        selectedTaskActions: [],
      });
      setMessage('Stand gespeichert.');
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
        <article className="card stack">
          <h2 className="card-title">Team-Check</h2>

          {discussedDate && (
            <div className="report-block stack">
              <strong>Quiz-Ergebnisse durchgesprochen</strong>
              <p className="helper" style={{ margin: 0 }}>am {discussedDate}</p>
              <Link href="/app/ergebnisse" className="button" style={{ width: 'fit-content' }}>
                Testergebnisse ansehen
              </Link>
            </div>
          )}

          {!hasPlan ? (
            <button type="button" className="button primary" onClick={() => router.push('/app/einstellungen#team-check-rhythmus')}>
              Check-in planen
            </button>
          ) : (
            <>
              {mode === 'overview' && (
                <button type="button" className="button primary" onClick={() => setMode('prepare')}>
                  Check-in vorbereiten
                </button>
              )}
              <div className="stack" style={{ gap: 4 }}>
                {nextCheckInLabel && <p style={{ margin: 0 }}>Nächster Check-in am {nextCheckInLabel}</p>}
              </div>
            </>
          )}
        </article>

        {records.length > 0 && (
          <article className="card stack">
            <h3 className="card-title" style={{ margin: 0 }}>Vergangene Team-Checks</h3>
            <div className="stack" style={{ gap: 8 }}>
              {records.map((record) => {
                const formatted = formatTeamCheckDate(record.checkInAt);
                return (
                  <div key={record.id} className="report-block" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>Team-Check vom {formatted ?? '—'}</span>
                    <button type="button" className="button" onClick={() => setSelectedRecordId(record.id)}>
                      Notiz ansehen
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedRecord && (
              <div className="report-block stack">
                <strong>Notiz</strong>
                <p className="helper" style={{ margin: 0 }}>{selectedRecord.note?.trim() || 'Keine Notiz hinterlegt.'}</p>
              </div>
            )}
          </article>
        )}

        {mode === 'prepare' && hasPlan && (
          <article className="card stack">
            <h3 className="card-title" style={{ margin: 0 }}>Check-in vorbereiten</h3>

            <label className="stack" style={{ gap: 6 }}>
              <span>Was ist gut gelaufen oder worüber habe ich mich gefreut *</span>
              <textarea className="input" value={goodMoments} onChange={(event) => setGoodMoments(event.target.value)} />
            </label>

            <label className="stack" style={{ gap: 6 }}>
              <span>Was möchte ich ändern</span>
              <textarea className="input" value={changeWishes} onChange={(event) => setChangeWishes(event.target.value)} />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="button" onClick={onSavePreparation} disabled={saving}>Stand speichern</button>
              <button type="button" className="button primary" onClick={() => setMode('conduct')}>
                Check-in durchführen
              </button>
            </div>
          </article>
        )}

        {mode === 'conduct' && hasPlan && (
          <article className="card stack">
            <h3 className="card-title" style={{ margin: 0 }}>Check-in durchführen</h3>
            {preparations.length < 2 && <p className="helper" style={{ margin: 0 }}>Die Vorbereitung des Partners liegt noch nicht vor.</p>}

            <div className="grid grid-2">
              {ownerOptions.map((owner) => {
                const prep = preparations.find((entry) => entry.userId === owner.userId);
                return (
                  <div key={owner.userId} className="report-block stack">
                    <strong>{owner.label}</strong>
                    <div>
                      <strong>Was ist gut gelaufen oder worüber habe ich mich gefreut</strong>
                      <p className="helper" style={{ margin: '4px 0 0' }}>{prep?.goodMoments || 'Noch keine Vorbereitung gespeichert.'}</p>
                    </div>
                    <div>
                      <strong>Was möchte ich ändern</strong>
                      <p className="helper" style={{ margin: '4px 0 0' }}>{prep?.changeWishes || '—'}</p>
                    </div>
                    <div>
                      <strong>Änderungswunsch bei Aufgaben</strong>
                      <p className="helper" style={{ margin: '4px 0 0' }}>
                        {prep?.selectedTaskActions?.length
                          ? `${prep.selectedTaskActions.length} Aufgaben zur Besprechung vorgemerkt`
                          : 'Keine Aufgaben vorgemerkt.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stack" style={{ gap: 8 }}>
              <strong>Aufgaben und Gebiete direkt zuordnen</strong>
              {discussedCards.map((card) => (
                <div key={card.id} className="report-block" style={{ display: 'grid', gap: 6 }}>
                  <strong>{card.title}</strong>
                  <span className="helper">{categoryLabelMap[card.categoryKey]}</span>
                  <select
                    className="input"
                    value={assignmentDraft[card.id] ?? card.ownerUserId ?? ''}
                    onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, [card.id]: event.target.value || null }))}
                  >
                    <option value="">Noch nicht zugeordnet</option>
                    {ownerOptions.map((owner) => <option key={owner.userId} value={owner.userId}>{owner.label}</option>)}
                  </select>
                </div>
              ))}
              {!discussedCards.length && <p className="helper" style={{ margin: 0 }}>Noch keine Aufgaben zur Besprechung vorgemerkt.</p>}
            </div>

            <label className="stack" style={{ gap: 6 }}>
              <span>Notiz zum Check-in</span>
              <textarea className="input" value={closingNote} onChange={(event) => setClosingNote(event.target.value)} />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="button" onClick={() => setMode('prepare')}>Zurück zur Vorbereitung</button>
              <button type="button" className="button primary" onClick={onSaveCheckIn} disabled={saving}>Check-in speichern</button>
            </div>
          </article>
        )}

        {showOwnershipHint && (
          <article className="card stack">
            <h2 className="card-title">Aufgabengebiete vorbereiten</h2>
            <p className="card-description">Aktiviert mindestens eine Karte in den Aufgabengebieten, damit ihr im Team-Check konkrete Themen habt.</p>
            <Link href="/app/ownership-dashboard" className="button primary" style={{ width: 'fit-content' }}>
              Aufgabengebiete öffnen
            </Link>
          </article>
        )}

        {error && <p className="inline-error">{error}</p>}
        {message && <p className="helper" style={{ margin: 0 }}>{message}</p>}
      </div>
    </section>
  );
}
