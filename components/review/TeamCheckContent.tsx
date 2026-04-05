'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { observeOwnershipCards, updateOwnershipCardOwner } from '@/services/ownership.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import {
  observeLatestTeamCheckRecord,
  observePreparationPair,
  resolveScheduledForKey,
  saveTeamCheckPreparation,
  saveTeamCheckRecord,
} from '@/services/teamCheck.service';
import { formatTeamCheckDate } from '@/services/teamCheck.logic';
import type { FamilyDocument } from '@/types/partner-flow';
import type { OwnershipCardDocument } from '@/types/ownership';
import type { TeamCheckActionType, TeamCheckPreparation, TeamCheckRecord } from '@/types/team-check';
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
  const [latestRecord, setLatestRecord] = useState<TeamCheckRecord | null>(null);
  const [preparations, setPreparations] = useState<TeamCheckPreparation[]>([]);

  const [mode, setMode] = useState<'overview' | 'prepare' | 'conduct'>('overview');
  const [categoryFilter, setCategoryFilter] = useState<'all' | QuizCategory>('all');
  const [goodMoments, setGoodMoments] = useState('');
  const [changeWishes, setChangeWishes] = useState('');
  const [selectedActions, setSelectedActions] = useState<Record<string, TeamCheckActionType>>({});
  const [handoverAreas, setHandoverAreas] = useState<Record<string, boolean>>({});
  const [swapAreas, setSwapAreas] = useState<Record<string, boolean>>({});
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
    return observeLatestTeamCheckRecord({ familyId: bundle.profile.familyId, onData: setLatestRecord });
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
  const canSeeJointResults = Boolean(bundle?.family?.resultsUnlocked && bundle?.family?.sharedResultsOpened);
  const discussedDate = formatDiscussedDate(bundle?.family?.resultsDiscussedAt ?? null);

  const hasPlan = Boolean(bundle?.family?.teamCheckPlan?.frequency && bundle?.family?.teamCheckPlan?.dayOfWeek !== undefined);
  const nextCheckInLabel = formatTeamCheckDate(bundle?.family?.teamCheckPlan?.nextCheckInAt ?? null, Boolean(bundle?.family?.teamCheckPlan?.time));
  const lastCheckInLabel = formatTeamCheckDate(bundle?.family?.teamCheckPlan?.lastCheckInAt ?? latestRecord?.checkInAt ?? null);

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

  const ownCards = useMemo(() => cards
    .filter((card) => card.ownerUserId === currentUserId && resolveCardIsActive(card)), [cards, currentUserId]);

  const ownCategories = useMemo(() => [...new Set(ownCards.map((card) => card.categoryKey))], [ownCards]);

  const visibleOwnCards = useMemo(() => ownCards.filter((card) => categoryFilter === 'all' || card.categoryKey === categoryFilter), [ownCards, categoryFilter]);

  const myPreparation = useMemo(() => preparations.find((entry) => entry.userId === currentUserId) ?? null, [preparations, currentUserId]);

  useEffect(() => {
    if (!myPreparation) return;
    setGoodMoments(myPreparation.goodMoments);
    setChangeWishes(myPreparation.changeWishes ?? '');
    setSelectedActions(Object.fromEntries(myPreparation.selectedTaskActions.map((entry) => [entry.cardId, entry.action])));
    setHandoverAreas(Object.fromEntries(myPreparation.handoverAreaCategoryKeys.map((entry) => [entry, true])));
    setSwapAreas(Object.fromEntries(myPreparation.swapAreaCategoryKeys.map((entry) => [entry, true])));
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
        handoverAreaCategoryKeys: Object.keys(handoverAreas).filter((key) => handoverAreas[key]) as QuizCategory[],
        swapAreaCategoryKeys: Object.keys(swapAreas).filter((key) => swapAreas[key]) as QuizCategory[],
        selectedTaskActions: Object.entries(selectedActions).map(([cardId, action]) => ({ cardId, action })),
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
      const assignmentChanges: TeamCheckRecord['assignmentChanges'] = [];
      for (const [cardId, nextOwnerUserId] of Object.entries(assignmentDraft)) {
        const card = cards.find((entry) => entry.id === cardId);
        if (!card) continue;
        const currentOwner = card.ownerUserId ?? null;
        if (currentOwner === (nextOwnerUserId ?? null)) continue;
        await updateOwnershipCardOwner({
          familyId: bundle.profile.familyId,
          cardId,
          actorUserId: currentUserId,
          patch: { ownerUserId: nextOwnerUserId ?? null },
        });
        assignmentChanges.push({
          cardId,
          fromOwnerUserId: currentOwner,
          toOwnerUserId: nextOwnerUserId ?? null,
        });
      }

      const discussedCategoryKeys = [
        ...new Set(preparations.flatMap((entry) => [...entry.handoverAreaCategoryKeys, ...entry.swapAreaCategoryKeys])),
      ] as QuizCategory[];

      await saveTeamCheckRecord({
        family: bundle.family as FamilyDocument,
        actorUserId: currentUserId,
        preparations,
        discussedCardIds,
        discussedCategoryKeys,
        assignmentChanges,
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
          <p className="card-description">Bereitet euren nächsten Team-Check vor und haltet gemeinsame Entscheidungen fest.</p>

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
              <div className="stack" style={{ gap: 4 }}>
                {nextCheckInLabel && <p style={{ margin: 0 }}>Nächster Check-in am {nextCheckInLabel}</p>}
                {lastCheckInLabel && <p className="helper" style={{ margin: 0 }}>Check-in durchgeführt am {lastCheckInLabel}</p>}
              </div>
              {mode === 'overview' && (
                <button type="button" className="button primary" onClick={() => setMode('prepare')}>
                  Check-in vorbereiten
                </button>
              )}
            </>
          )}
        </article>

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

            <div className="stack" style={{ gap: 6 }}>
              <strong>Welche Aufgabengebiete möchte ich abgeben</strong>
              {ownCategories.map((categoryKey) => (
                <label key={`handover-${categoryKey}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(handoverAreas[categoryKey])}
                    onChange={(event) => setHandoverAreas((prev) => ({ ...prev, [categoryKey]: event.target.checked }))}
                  />
                  {categoryLabelMap[categoryKey]}
                </label>
              ))}
            </div>

            <div className="stack" style={{ gap: 6 }}>
              <strong>Welche Aufgabengebiete möchte ich tauschen</strong>
              {ownCategories.map((categoryKey) => (
                <label key={`swap-${categoryKey}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(swapAreas[categoryKey])}
                    onChange={(event) => setSwapAreas((prev) => ({ ...prev, [categoryKey]: event.target.checked }))}
                  />
                  {categoryLabelMap[categoryKey]}
                </label>
              ))}
            </div>

            <div className="stack" style={{ gap: 8 }}>
              <strong>Eigene Aufgabenliste</strong>
              <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'all' | QuizCategory)}>
                <option value="all">Alle Kategorien</option>
                {ownCategories.map((entry) => <option key={entry} value={entry}>{categoryLabelMap[entry]}</option>)}
              </select>
              <div className="stack" style={{ maxHeight: 280, overflow: 'auto' }}>
                {visibleOwnCards.map((card) => (
                  <div key={card.id} className="report-block stack" style={{ gap: 6 }}>
                    <strong>{card.title}</strong>
                    <span className="helper">{categoryLabelMap[card.categoryKey]}</span>
                    <select
                      className="input"
                      value={selectedActions[card.id] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value as TeamCheckActionType | '';
                        setSelectedActions((prev) => {
                          if (!value) {
                            const next = { ...prev };
                            delete next[card.id];
                            return next;
                          }
                          return { ...prev, [card.id]: value };
                        });
                      }}
                    >
                      <option value="">Keine Aktion</option>
                      <option value="discuss">Zur Besprechung vormerken</option>
                      <option value="handover">Abgeben vorschlagen</option>
                      <option value="swap">Tauschen vorschlagen</option>
                    </select>
                  </div>
                ))}
                {!visibleOwnCards.length && <p className="helper" style={{ margin: 0 }}>Keine eigenen Aufgaben in diesem Filter.</p>}
              </div>
            </div>

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

        <article className="card stack">
          <h3 className="card-title" style={{ margin: 0 }}>Status</h3>
          {!bundle?.family && <p className="helper" style={{ margin: 0 }}>Noch keine gemeinsame Familie verknüpft.</p>}
          {!!bundle?.family && !bundle.family.partnerRegistered && (
            <p className="helper" style={{ margin: 0 }}>Partner noch nicht registriert. Sobald beide registriert sind, könnt ihr Vergleichsergebnisse gemeinsam ansehen.</p>
          )}
          {!!bundle?.family?.partnerRegistered && !canSeeJointResults && (
            <p className="helper" style={{ margin: 0 }}>Partnerergebnis ist vorhanden. Die gemeinsamen Vergleichsergebnisse werden nach Freischaltung im Bereich Ergebnisse sichtbar.</p>
          )}
          {canSeeJointResults && (
            <p className="helper" style={{ margin: 0 }}>Gemeinsame Vergleichsergebnisse sind verfügbar und im Bereich Ergebnisse jederzeit einsehbar.</p>
          )}
          {latestRecord?.checkInAt && (
            <p className="helper" style={{ margin: 0 }}>Check-in durchgeführt am {formatTeamCheckDate(latestRecord.checkInAt) ?? '—'}</p>
          )}
        </article>

        {error && <p className="inline-error">{error}</p>}
        {message && <p className="helper" style={{ margin: 0 }}>{message}</p>}
      </div>
    </section>
  );
}
