'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { categoryLabelMap } from '@/services/resultCalculator';
import { buildCategoryComparisons } from '@/services/resultInsights';
import {
  fetchActionBurdenCategoriesByFamily,
  initializeActionBoards,
  moveBoardCard,
  observeActionBoards,
  observeBoardCards,
  setCatalogCollapsed,
  updateBoardCard,
} from '@/services/actionBoards.service';
import { mapReasonCodeToUiText, recommendActionCategories } from '@/services/actionCategories';
import { observeAuthState, signOutUser } from '@/services/auth.service';
import {
  ensureUserProfile,
  fetchAppUserProfile,
  fetchDashboardBundle,
  openSharedResultsView,
  sendPartnerInvitation,
  unlockPartnerAndJointResults,
} from '@/services/partnerFlow.service';
import type { ActionBoardDocument, BoardCardDocument } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';

function sortCategoriesByOwnShareAscending(categories: Array<[QuizCategory, number]>) {
  return [...categories].sort(([, valueA], [, valueB]) => valueA - valueB);
}

function resolveDisplayName(value?: string | null, fallback = 'Nutzer') {
  return value?.trim() || fallback;
}

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return local || null;
}

function buildNeutralDistributionStatement(selfPercent: number) {
  if (selfPercent > 55) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei dir.';
  if (selfPercent < 45) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei deinem Partner.';
  return 'Aus deiner Sicht ist die Mental Load aktuell eher gleich verteilt.';
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePersonalMessage, setInvitePersonalMessage] = useState(
    'Ich habe den FairCare Test gemacht und würde mich freuen, wenn du ihn auch ausfüllst. Danach können wir unsere Ergebnisse gemeinsam anschauen.',
  );
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'success' | 'warning' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');

  const [unlockState, setUnlockState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [unlockMessage, setUnlockMessage] = useState('');
  const [openSharedState, setOpenSharedState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [openSharedMessage, setOpenSharedMessage] = useState('');

  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<QuizCategory[]>([]);
  const [boardCategory, setBoardCategory] = useState<QuizCategory | null>(null);
  const [boards, setBoards] = useState<ActionBoardDocument[]>([]);
  const [cards, setCards] = useState<BoardCardDocument[]>([]);
  const [burdenInput, setBurdenInput] = useState<{ initiator: QuizCategory[]; partner: QuizCategory[] }>({ initiator: [], partner: [] });
  const [editCard, setEditCard] = useState<BoardCardDocument | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  async function refreshDashboard(userId: string) {
    const fresh = await fetchDashboardBundle(userId);
    setBundle(fresh);
    setLoading(false);
  }

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setCurrentUserId(user.uid);
      await ensureUserProfile({ userId: user.uid, email: user.email ?? '', displayName: user.displayName ?? undefined });
      await refreshDashboard(user.uid);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!bundle?.family?.id || !bundle.family.resultsUnlocked || !bundle.family.sharedResultsOpened) return;
    fetchActionBurdenCategoriesByFamily(bundle.family.id).then(setBurdenInput).catch(() => setBurdenInput({ initiator: [], partner: [] }));
  }, [bundle?.family?.id, bundle?.family?.resultsUnlocked, bundle?.family?.sharedResultsOpened]);

  useEffect(() => {
    if (!bundle?.family?.id || !bundle.family.resultsUnlocked || !bundle.family.sharedResultsOpened) return;
    return observeActionBoards(bundle.family.id, (nextBoards) => {
      setBoards(nextBoards);
      if (!boardCategory && nextBoards.length) {
        setBoardCategory(nextBoards[0].categoryKey);
      }
    });
  }, [bundle?.family?.id, bundle?.family?.resultsUnlocked, bundle?.family?.sharedResultsOpened, boardCategory]);

  useEffect(() => {
    if (!bundle?.family?.id || !boardCategory) return;
    return observeBoardCards(bundle.family.id, boardCategory, setCards);
  }, [bundle?.family?.id, boardCategory]);

  const recommendation = useMemo(() => {
    if (!bundle?.initiatorResult?.categoryScores || !bundle?.partnerResult?.categoryScores) return null;

    return recommendActionCategories({
      initiatorScores: bundle.initiatorResult.categoryScores,
      partnerScores: bundle.partnerResult.categoryScores,
      initiatorBurdenCategories: burdenInput.initiator,
      partnerBurdenCategories: burdenInput.partner,
      initiatorClarity: bundle.initiatorResult.filterPerceptionAnswer,
      partnerClarity: bundle.partnerResult.filterPerceptionAnswer,
    });
  }, [bundle?.initiatorResult?.categoryScores, bundle?.partnerResult?.categoryScores, bundle?.initiatorResult?.filterPerceptionAnswer, bundle?.partnerResult?.filterPerceptionAnswer, burdenInput]);

  useEffect(() => {
    if (!recommendation) return;
    setSelectedCategories((current) => (current.length ? current : recommendation.suggestedActionCategories));
  }, [recommendation]);

  async function onInviteSubmit(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setInviteState('error');
      setInviteMessage('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }
    if (!emailPattern.test(email)) {
      setInviteState('error');
      setInviteMessage('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setInviteState('loading');
    setInviteMessage('');
    try {
      const result = await sendPartnerInvitation(email, invitePersonalMessage);
      if (result.delivery === 'saved_without_email') {
        setInviteState('warning');
        setInviteMessage('Einladung gespeichert. Es wurde keine echte E-Mail verschickt, weil der Mail-Provider auf noop steht.');
      } else {
        setInviteState('success');
        setInviteMessage(`Einladung an ${result.partnerEmail} versendet.`);
      }
      if (currentUserId) {
        const profile = await fetchAppUserProfile(currentUserId);
        if (profile?.id) {
          await refreshDashboard(profile.id);
        }
      }
    } catch (error) {
      const errorObject = error as { code?: string; message?: string };
      console.error('sendPartnerInvite failed', error);
      console.error('code', errorObject?.code);
      console.error('message', errorObject?.message);
      setInviteState('error');
      setInviteMessage(errorObject?.message || 'Einladung konnte nicht gesendet werden.');
    }
  }

  async function unlockSharedResults() {
    const userId = currentUserId;
    if (!userId) return;
    setUnlockState('loading');
    setUnlockMessage('');
    try {
      const result = await unlockPartnerAndJointResults(userId);
      setUnlockState('success');
      setUnlockMessage(
        result.alreadyActive
          ? 'Eure gemeinsamen Ergebnisse sind bereits freigeschaltet.'
          : 'Eure gemeinsamen Ergebnisse sind jetzt verfügbar.',
      );
      await refreshDashboard(userId);
    } catch (error) {
      setUnlockState('error');
      setUnlockMessage(error instanceof Error ? error.message : 'Freischaltung fehlgeschlagen.');
    }
  }

  async function openSharedViewForBoth() {
    const userId = currentUserId;
    if (!userId) return;
    setOpenSharedState('loading');
    setOpenSharedMessage('');
    try {
      await openSharedResultsView(userId);
      setOpenSharedState('idle');
      await refreshDashboard(userId);
    } catch (error) {
      setOpenSharedState('error');
      setOpenSharedMessage(error instanceof Error ? error.message : 'Gemeinsame Ansicht konnte nicht geöffnet werden.');
    }
  }

  async function startBoards() {
    if (!currentUserId || !bundle?.family?.id || !recommendation) return;
    const selected = selectedCategories.length ? selectedCategories : recommendation.suggestedActionCategories;
    const result = await initializeActionBoards({
      userId: currentUserId,
      familyId: bundle.family.id,
      selectedCategories: selected,
      suggestedCategories: recommendation.suggestedActionCategories,
      actionCategoryReasons: recommendation.actionCategoryReasons,
      actionCategoryPriority: recommendation.actionCategoryPriority,
    });
    setBoardCategory(result.firstCategory);
    setSetupOpen(false);
  }

  async function saveCardEdit() {
    if (!currentUserId || !editCard) return;
    await updateBoardCard(currentUserId, editCard.id, {
      customTitle: draftTitle.trim() || null,
      notes: draftNotes.trim() || null,
    });
    setEditCard(null);
  }

  async function logout() {
    await signOutUser();
    router.push('/login');
  }

  const ownResultText = useMemo(() => {
    if (!bundle?.ownResult) return null;
    return {
      selfPercent: bundle.ownResult.totalScore,
      statement: buildNeutralDistributionStatement(bundle.ownResult.totalScore),
      categories: sortCategoriesByOwnShareAscending(
        Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
      ),
    };
  }, [bundle?.ownResult]);
  const resolvedPartnerName = bundle?.profile?.role === 'partner'
    ? bundle?.initiatorDisplayName
    : bundle?.partnerDisplayName;
  const invitationPartnerName = deriveNameFromEmail(bundle?.invitationPartnerEmail);
  const partnerLabel = resolveDisplayName(resolvedPartnerName, invitationPartnerName ?? 'Partner');

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  return (
    <section className="section">
      <div className="container stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="test-title">Dashboard</h1>
          <button type="button" className="button" onClick={logout}>Logout</button>
        </div>

        <article className="card stack">
          {!ownResultText
            ? <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            : (
              <ResultBreakdown
                title={resolveDisplayName(bundle?.profile?.displayName, 'Du')}
                partnerName={partnerLabel}
                result={ownResultText}
              />
            )}
        </article>

        <article className="card stack">
          {bundle?.profile?.role !== 'partner' && !bundle?.family?.partnerRegistered ? (
            <>
              <h2 className="card-title">Status</h2>
              <p className="card-description">Dein Ergebnis ist bereits da. Lade jetzt deinen Partner ein, damit ihr später auch euer gemeinsames Ergebnis sehen könnt.</p>
              <div className="report-block stack">
                <p className="helper">Partner-Ergebnis wird nach Freischaltung hier ergänzt.</p>
                {(ownResultText?.categories ?? []).map(([category]) => (
                  <div key={`ghost-${category}`} className="report-block" style={{ opacity: 0.5 }}>
                    <strong>{categoryLabelMap[category]}</strong>
                    <div className="result-bar" />
                  </div>
                ))}
              </div>
              <form className="stack" onSubmit={onInviteSubmit}>
                <input type="email" className="input" required placeholder="E-Mail deines Partners" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={inviteState === 'loading'} />
                <textarea className="input" rows={5} value={invitePersonalMessage} onChange={(event) => setInvitePersonalMessage(event.target.value)} aria-label="Persönliche Nachricht" placeholder="Persönliche Nachricht" />
                <button type="submit" className="button primary" disabled={inviteState === 'loading'}>
                  {inviteState === 'loading' ? 'Einladung wird versendet …' : 'Einladung senden'}
                </button>
              </form>
            </>
          ) : bundle?.family?.resultsUnlocked ? (
            <>
              <h2 className="card-title">Status</h2>
              <p className="card-description">
                {bundle?.family?.sharedResultsOpened
                  ? 'Eure gemeinsamen Ergebnisse werden unten angezeigt.'
                  : 'Eure gemeinsamen Ergebnisse sind bereit.'}
              </p>
              {!bundle?.family?.sharedResultsOpened && (
                <button className="button primary" type="button" onClick={openSharedViewForBoth} disabled={openSharedState === 'loading'}>
                  Gemeinsame Ergebnisse anschauen
                </button>
              )}
              {openSharedState === 'error' && <p className="inline-error">{openSharedMessage}</p>}
            </>
          ) : bundle?.profile?.role === 'partner' ? (
            <>
              <h2 className="card-title">Status</h2>
              <p className="card-description">
                {bundle?.family?.partnerRegistered
                  ? `${bundle?.initiatorDisplayName ?? 'Der Initiator'} hat eine E-Mail erhalten und kann jetzt euer gemeinsames Ergebnis freischalten.`
                  : 'Warte auf Abschluss der Registrierung.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="card-title">Status</h2>
              <p className="card-description">
                {bundle?.family?.partnerRegistered
                  ? 'Dein Partner hat das Quiz abgeschlossen. Du kannst die Ergebnisse jetzt freigeben.'
                  : 'Warte auf die Bewertung deines Partners.'}
              </p>
              {bundle?.family?.partnerRegistered && (
                <button className="button primary" type="button" onClick={unlockSharedResults} disabled={unlockState === 'loading'}>
                  {unlockState === 'loading' ? 'Freischaltung läuft …' : 'Partner- und Gesamtergebnis freischalten'}
                </button>
              )}
              {unlockState === 'success' && <p className="helper">{unlockMessage}</p>}
              {unlockState === 'error' && <p className="inline-error">{unlockMessage}</p>}
            </>
          )}
          {inviteState === 'success' && <p className="helper">{inviteMessage}</p>}
          {inviteState === 'warning' && <p className="inline-error">{inviteMessage}</p>}
          {inviteState === 'error' && <p className="inline-error">{inviteMessage}</p>}
        </article>

        {!bundle?.family?.resultsUnlocked || !bundle?.family?.sharedResultsOpened ? (
          <article className="card stack">
            <h2 className="card-title">Status</h2>
            <p className="helper">
              {bundle?.family?.resultsUnlocked
                ? 'Die gemeinsamen Ergebnisse wurden freigegeben. Öffnet jetzt gemeinsam die Ansicht.'
                : bundle?.profile?.role === 'partner'
                  ? 'Die gemeinsamen Ergebnisse werden sichtbar, sobald der Initiator sie freigegeben hat.'
                  : 'Vor der Freischaltung siehst du nur dein eigenes Ergebnis.'}
            </p>
          </article>
        ) : (
          <>
            <JointResultPanel bundle={bundle} />
            {recommendation && (
              <article className="card stack">
                <h3 className="card-title">Nächster Schritt</h3>
                <p className="helper">{recommendation.actionCategorySummaryText}</p>
                {!setupOpen && (
                  <button type="button" className="button primary" onClick={() => setSetupOpen(true)}>Nächsten Schritt starten</button>
                )}
                {setupOpen && (
                  <CategorySelectionView
                    recommendation={recommendation}
                    selectedCategories={selectedCategories}
                    onChange={setSelectedCategories}
                    onConfirm={startBoards}
                  />
                )}
              </article>
            )}

            {boards.length > 0 && boardCategory && (
              <SharedResponsibilityBoard
                boards={boards}
                cards={cards}
                currentCategory={boardCategory}
                onCategoryChange={setBoardCategory}
                onMove={async (cardId, ownerColumn) => {
                  if (!currentUserId) return;
                  await moveBoardCard(currentUserId, cardId, ownerColumn);
                }}
                onToggleCatalog={async (boardId, collapsed) => {
                  if (!currentUserId) return;
                  await setCatalogCollapsed(currentUserId, boardId, collapsed);
                }}
                onEdit={(card) => {
                  setEditCard(card);
                  setDraftTitle(card.customTitle ?? '');
                  setDraftNotes(card.notes ?? '');
                }}
                personOneName={resolveDisplayName(bundle.initiatorDisplayName, 'Person 1')}
                personTwoName={resolveDisplayName(bundle.partnerDisplayName, 'Person 2')}
              />
            )}
          </>
        )}
      </div>

      {editCard && (
        <div className="board-drawer-backdrop" role="presentation" onClick={() => setEditCard(null)}>
          <div className="board-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className="card-title">Karte bearbeiten</h3>
            <p className="helper">{editCard.baseTitle}</p>
            <input className="input" placeholder="Eigener Kartentitel" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
            <textarea className="input" rows={5} placeholder="Notizen" value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} />
            <div className="stack" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button type="button" className="button" onClick={() => setEditCard(null)}>Abbrechen</button>
              <button type="button" className="button primary" onClick={saveCardEdit}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CategorySelectionView({ recommendation, selectedCategories, onChange, onConfirm }: {
  recommendation: NonNullable<ReturnType<typeof recommendActionCategories>>;
  selectedCategories: QuizCategory[];
  onChange: (next: QuizCategory[]) => void;
  onConfirm: () => void;
}) {
  function toggleCategory(category: QuizCategory) {
    const exists = selectedCategories.includes(category);
    if (exists) {
      onChange(selectedCategories.filter((item) => item !== category));
      return;
    }
    onChange([...selectedCategories, category]);
  }

  return (
    <div className="stack board-selection-shell">
      <h4 className="card-title">Wo lohnt es sich, mit klareren Aufgabenpaketen zu starten?</h4>
      <p className="helper">Eure Ergebnisse deuten darauf hin, dass in manchen Bereichen klarere Zuständigkeiten helfen könnten. Ein Aufgabenpaket bedeutet immer beides: daran denken und es umsetzen. Fangt am besten klein an und startet mit 1 oder 2 Bereichen.</p>
      <p className="helper">Ihr könnt weitere Bereiche zusätzlich auswählen, wenn ihr möchtet.</p>

      <div className="stack">
        {recommendation.suggestedActionCategories.map((category) => {
          const reasonCode = recommendation.actionCategoryReasons[category]?.[0];
          return (
            <label key={category} className="board-choice-card recommended">
              <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} />
              <div>
                <strong>{categoryLabelMap[category]}</strong>
                <p className="helper">{reasonCode ? mapReasonCodeToUiText(reasonCode) : 'Hier wirken klarere Zuständigkeiten entlastend.'}</p>
              </div>
            </label>
          );
        })}
      </div>

      {!!recommendation.optionalActionCategories.length && (
        <div className="stack">
          <p className="helper" style={{ margin: 0 }}><strong>Weitere optionale Bereiche</strong></p>
          {recommendation.optionalActionCategories.map((category) => (
            <label key={category} className="board-choice-card">
              <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} />
              <strong>{categoryLabelMap[category]}</strong>
            </label>
          ))}
        </div>
      )}

      <button type="button" className="button primary" onClick={onConfirm} disabled={!selectedCategories.length}>Mit diesen Bereichen starten</button>
    </div>
  );
}

function SharedResponsibilityBoard({
  boards,
  cards,
  currentCategory,
  onCategoryChange,
  onMove,
  onToggleCatalog,
  onEdit,
  personOneName,
  personTwoName,
}: {
  boards: ActionBoardDocument[];
  cards: BoardCardDocument[];
  currentCategory: QuizCategory;
  onCategoryChange: (category: QuizCategory) => void;
  onMove: (cardId: string, ownerColumn: BoardCardDocument['ownerColumn']) => Promise<void>;
  onToggleCatalog: (boardId: string, collapsed: boolean) => Promise<void>;
  onEdit: (card: BoardCardDocument) => void;
  personOneName: string;
  personTwoName: string;
}) {
  const board = boards.find((item) => item.categoryKey === currentCategory);
  if (!board) return null;

  const catalog = cards.filter((item) => item.ownerColumn === 'catalog');
  const first = cards.filter((item) => item.ownerColumn === 'user1');
  const second = cards.filter((item) => item.ownerColumn === 'user2');

  return (
    <article className="card stack">
      <h3 className="card-title">Shared Responsibility Boards</h3>
      <p className="helper">Ein Aufgabenpaket bedeutet immer beides: daran denken und es umsetzen. Ziel ist nicht, jede Kleinigkeit einzeln zu verteilen, sondern Verantwortungsbereiche klarer zu bündeln.</p>

      <div className="board-tabs">
        {boards.map((entry) => (
          <button key={entry.id} type="button" className={`button ${entry.categoryKey === currentCategory ? 'primary' : ''}`} onClick={() => onCategoryChange(entry.categoryKey)}>
            {entry.categoryLabel}
          </button>
        ))}
      </div>

      <div className="board-columns">
        <BoardColumn
          title="Aufgabenkatalog"
          columnKey="catalog"
          ownerLabels={{ user1: personOneName, user2: personTwoName }}
          cards={catalog}
          collapsed={board.catalogCollapsed}
          onCollapse={() => onToggleCatalog(board.id, !board.catalogCollapsed)}
          onMove={onMove}
          onEdit={onEdit}
        />
        <BoardColumn title={personOneName} columnKey="user1" ownerLabels={{ user1: personOneName, user2: personTwoName }} cards={first} onMove={onMove} onEdit={onEdit} />
        <BoardColumn title={personTwoName} columnKey="user2" ownerLabels={{ user1: personOneName, user2: personTwoName }} cards={second} onMove={onMove} onEdit={onEdit} />
      </div>
    </article>
  );
}

function BoardColumn({ title, columnKey, ownerLabels, cards, onMove, onEdit, collapsed = false, onCollapse }: {
  title: string;
  columnKey: BoardCardDocument['ownerColumn'];
  ownerLabels: { user1: string; user2: string };
  cards: BoardCardDocument[];
  onMove: (cardId: string, ownerColumn: BoardCardDocument['ownerColumn']) => Promise<void>;
  onEdit: (card: BoardCardDocument) => void;
  collapsed?: boolean;
  onCollapse?: () => void;
}) {
  return (
    <section className="board-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      const cardId = event.dataTransfer.getData('text/plain');
      if (!cardId) return;
      onMove(cardId, columnKey);
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>{title}</strong>
        {onCollapse && (
          <button type="button" className="button" style={{ padding: '0.35rem 0.9rem', minHeight: 34 }} onClick={onCollapse}>
            {collapsed ? 'Aufklappen' : 'Einklappen'}
          </button>
        )}
      </div>
      {!collapsed && cards.map((card) => (
        <article
          key={card.id}
          className="report-block stack"
          draggable
          onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
        >
          <strong>{card.customTitle?.trim() || card.baseTitle}</strong>
          {card.notes && <p className="helper">{card.notes}</p>}
          <div className="board-card-actions">
            <button type="button" className="button" onClick={() => onEdit(card)}>Bearbeiten</button>
            <select
              className="input"
              value={card.ownerColumn}
              onChange={(event) => onMove(card.id, event.target.value as BoardCardDocument['ownerColumn'])}
            >
              <option value="catalog">Aufgabenkatalog</option>
              <option value="user1">{ownerLabels.user1}</option>
              <option value="user2">{ownerLabels.user2}</option>
            </select>
          </div>
        </article>
      ))}
    </section>
  );
}

function JointResultPanel({ bundle }: {
  bundle: Awaited<ReturnType<typeof fetchDashboardBundle>>;
}) {
  if (!bundle.initiatorResult || !bundle.partnerResult) return null;

  const initiatorName = resolveDisplayName(bundle.initiatorDisplayName, deriveNameFromEmail(bundle.profile?.email) ?? 'Unbekannt');
  const partnerName = resolveDisplayName(bundle.partnerDisplayName, deriveNameFromEmail(bundle.invitationPartnerEmail) ?? 'Unbekannt');

  const initiatorScores = bundle.initiatorResult.categoryScores;
  const partnerScores = bundle.partnerResult.categoryScores;

  const comparisons = buildCategoryComparisons(initiatorScores, partnerScores);

  return (
    <article className="card stack">
      <h2 className="card-title">Gemeinsames Ergebnis</h2>
      <div className="stack">
        {comparisons.map((entry) => {
          const initiatorSelf = initiatorScores[entry.category] ?? 0;
          const partnerSeesInitiator = 100 - (partnerScores[entry.category] ?? 0);
          const partnerSelf = partnerScores[entry.category] ?? 0;
          const initiatorSeesPartner = 100 - (initiatorScores[entry.category] ?? 0);

          const gapInitiator = Math.abs(initiatorSelf - partnerSeesInitiator);
          const gapPartner = Math.abs(partnerSelf - initiatorSeesPartner);
          const hasGap = gapInitiator >= 12 || gapPartner >= 12;

          return (
            <div className="report-block" key={`cmp-${entry.category}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <strong>{categoryLabelMap[entry.category]}</strong>
                {hasGap && <span className="helper" style={{ border: '1px solid currentColor', padding: '2px 8px', borderRadius: 999 }}>Lücke erkannt</span>}
              </div>
              <p className="helper" style={{ marginBottom: 4 }}>{initiatorName} selbst</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${initiatorSelf}%` }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{initiatorSelf}%</p>

              <p className="helper" style={{ marginBottom: 4 }}>{partnerName} sieht {initiatorName}</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${partnerSeesInitiator}%`, opacity: 0.8 }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{partnerSeesInitiator}%</p>

              <p className="helper" style={{ marginBottom: 4 }}>{partnerName} selbst</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${partnerSelf}%` }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{partnerSelf}%</p>

              <p className="helper" style={{ marginBottom: 4 }}>{initiatorName} sieht {partnerName}</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${initiatorSeesPartner}%`, opacity: 0.8 }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{initiatorSeesPartner}%</p>

            </div>
          );
        })}
      </div>
    </article>
  );
}

function ResultBreakdown({
  title,
  partnerName,
  result,
}: {
  title: string;
  partnerName: string;
  result: {
    selfPercent: number;
    statement: string;
    categories: Array<[QuizCategory, number]>;
  };
}) {
  const displayName = resolveDisplayName(title, 'Nicole');
  const sortedCategories = [...result.categories].sort((a, b) => b[1] - a[1]);
  const highestLoad = sortedCategories[0];
  const mostBalanced = [...result.categories].sort((a, b) => Math.abs(a[1] - 50) - Math.abs(b[1] - 50))[0];

  return (
    <>
      <h2 className="card-title">Persönliches Ergebnis {displayName}</h2>
      <p className="helper" style={{ margin: 0 }}>{result.statement}</p>
      <p className="helper" style={{ margin: 0 }}>
        Diese Verteilung ist eine subjektive Momentaufnahme und sagt nicht, ob etwas richtig oder falsch ist. Entscheidend ist, ob ihr euch beide mit der Aufteilung glücklich fühlt. Transparenz und die Sichtweise des Partners helfen euch dabei, gemeinsam zu prüfen, ob ihr etwas ändern möchtet.
      </p>
      <div className="personal-result-summary detailed individual-result-panel">
        <div className="result-overview-grid">
          <div className="result-donut-wrap">
            <div
              className="result-donut"
              style={{ background: `conic-gradient(#7d74e8 0 ${result.selfPercent}%, #d9d8e4 ${result.selfPercent}% 100%)` }}
            >
              <div className="result-donut-inner">
                <strong>{result.selfPercent}%</strong>
                <span>{displayName}</span>
              </div>
            </div>
            <p className="helper"><strong>Gesamtanteil</strong></p>
          </div>
          <div className="result-highlight-grid">
            <div>
              <p className="helper">Höchste Last</p>
              <p className="result-highlight-primary">
                {categoryLabelMap[highestLoad[0]]} · {highestLoad[1]}%
              </p>
            </div>
            <div>
              <p className="helper">Ausgeglichen</p>
              <p className="result-highlight-accent">
                {categoryLabelMap[mostBalanced[0]]} · {mostBalanced[1]}%
              </p>
            </div>
          </div>
        </div>
        <div className="result-legend">
          <span><i className="dot self" />{displayName}</span>
          <span><i className="dot partner" />{partnerName}</span>
        </div>
      </div>
      <div className="stack category-list individual-result-categories">
        {sortedCategories.map(([category, value]) => (
          <div key={category} className="category-progress-row">
            <strong>{categoryLabelMap[category]}</strong>
            <div className="category-progress-track">
              <div className="category-progress-self" style={{ width: `${value}%` }} />
              <div className="category-progress-partner" style={{ width: `${100 - value}%` }} />
            </div>
            <strong className="category-value">{value}%</strong>
          </div>
        ))}
      </div>
    </>
  );
}
