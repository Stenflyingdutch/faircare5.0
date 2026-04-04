'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { fetchActionBurdenCategoriesByFamily, initializeActionBoards, moveBoardCard, observeActionBoards, observeAllBoardCards, updateBoardCard } from '@/services/actionBoards.service';
import { mapReasonCodeToUiText, recommendActionCategories } from '@/services/actionCategories';
import { observeAuthState, signOutUser } from '@/services/auth.service';
import { ensureUserProfile, fetchDashboardBundle } from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import type { ActionBoardDocument, BoardCardDocument } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';

const sections = ['my-packages', 'ownership-board', 'weekly-review', 'test-results'] as const;
type SectionKey = (typeof sections)[number];

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return local || null;
}

function resolvePartnerName(displayName?: string | null, email?: string | null) {
  const raw = displayName?.trim();
  if (raw && raw.toLowerCase() !== 'partner') return raw;
  return deriveNameFromEmail(email) ?? 'Partner 2';
}

export default function WorkspacePage() {
  const params = useParams<{ section: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = (sections.includes(params.section as SectionKey) ? params.section : 'ownership-board') as SectionKey;

  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [boards, setBoards] = useState<ActionBoardDocument[]>([]);
  const [allCards, setAllCards] = useState<BoardCardDocument[]>([]);
  const [setupOpen, setSetupOpen] = useState(searchParams.get('setup') === '1');
  const [selectedCategories, setSelectedCategories] = useState<QuizCategory[]>([]);
  const [burdenInput, setBurdenInput] = useState<{ initiator: QuizCategory[]; partner: QuizCategory[] }>({ initiator: [], partner: [] });
  const [editCard, setEditCard] = useState<BoardCardDocument | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');

  useEffect(() => {
    const unsub = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);
      await ensureUserProfile({ userId: user.uid, email: user.email ?? '', displayName: user.displayName ?? undefined });
      const next = await fetchDashboardBundle(user.uid);
      setBundle(next);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!bundle?.family?.id) return;
    fetchActionBurdenCategoriesByFamily(bundle.family.id).then(setBurdenInput);
    return observeActionBoards(bundle.family.id, setBoards);
  }, [bundle?.family?.id]);

  useEffect(() => {
    if (!bundle?.family?.id) return;
    return observeAllBoardCards(bundle.family.id, setAllCards);
  }, [bundle?.family?.id]);

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
    if (recommendation && !selectedCategories.length) {
      setSelectedCategories(recommendation.suggestedActionCategories);
    }
  }, [recommendation, selectedCategories.length]);

  if (!bundle?.family?.resultsUnlocked || !bundle?.family?.sharedResultsOpened) {
    return <section className="section"><div className="container">Workspace wird verfügbar, sobald ihr die gemeinsamen Ergebnisse geöffnet habt.</div></section>;
  }

  const personOneName = bundle.initiatorDisplayName?.trim() || 'Partner 1';
  const personTwoName = resolvePartnerName(bundle.partnerDisplayName, bundle.invitationPartnerEmail);
  const ownColumn = bundle.profile?.role === 'partner' ? 'user2' : 'user1';
  const familyId = bundle.family?.id;

  async function startBoards() {
    if (!userId || !familyId || !recommendation) return;
    const result = await initializeActionBoards({
      userId,
      familyId,
      selectedCategories: selectedCategories.length ? selectedCategories : recommendation.suggestedActionCategories,
      suggestedCategories: recommendation.suggestedActionCategories,
      actionCategoryReasons: recommendation.actionCategoryReasons,
      actionCategoryPriority: recommendation.actionCategoryPriority,
    });
    setSetupOpen(false);
    router.replace(`/workspace/ownership-board?category=${result.firstCategory}`);
  }

  async function logout() {
    await signOutUser();
    router.push('/login');
  }

  return (
    <section className="section">
      <div className="container stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h1 className="test-title">Ownership Workspace</h1>
          <button type="button" className="button" onClick={logout}>Logout</button>
        </div>

        <article className="card">
          <div className="board-tabs">
            <button className={`button ${section === 'my-packages' ? 'primary' : ''}`} onClick={() => router.push('/workspace/my-packages')} type="button">Meine Aufgabenpakete</button>
            <button className={`button ${section === 'ownership-board' ? 'primary' : ''}`} onClick={() => router.push('/workspace/ownership-board')} type="button">Ownership Board</button>
            <button className={`button ${section === 'weekly-review' ? 'primary' : ''}`} onClick={() => router.push('/workspace/weekly-review')} type="button">Weekly Review</button>
            <button className={`button ${section === 'test-results' ? 'primary' : ''}`} onClick={() => router.push('/workspace/test-results')} type="button">Testergebnisse</button>
          </div>
        </article>

        {section === 'ownership-board' && (
          <>
            {recommendation && (
              <article className="card stack">
                <h3 className="card-title">Nächster Schritt</h3>
                <p className="helper">{recommendation.actionCategorySummaryText}</p>
                {!setupOpen && <button type="button" className="button primary" onClick={() => setSetupOpen(true)}>Nächsten Schritt starten</button>}
                {setupOpen && (
                  <div className="stack board-selection-shell">
                    {recommendation.suggestedActionCategories.map((category) => (
                      <button key={category} type="button" className={`board-choice-card recommended ${selectedCategories.includes(category) ? 'selected' : ''}`} onClick={() => setSelectedCategories((prev) => prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category])}>
                        <div>
                          <strong>{categoryLabelMap[category]}</strong>
                          <p className="helper">{mapReasonCodeToUiText(recommendation.actionCategoryReasons[category]?.[0] ?? 'high_score')}</p>
                        </div>
                      </button>
                    ))}
                    <button type="button" className="button primary" onClick={startBoards}>Mit diesen Bereichen starten</button>
                  </div>
                )}
              </article>
            )}

            {boards.map((board) => {
              const cards = allCards.filter((card) => card.categoryKey === board.categoryKey);
              return (
                <article className="card stack" key={board.id}>
                  <h3 className="card-title">{board.categoryLabel}</h3>
                  {cards.map((card) => (
                    <div className="report-block stack" key={card.id}>
                      <strong>{card.customTitle?.trim() || card.baseTitle}</strong>
                      <button type="button" className="button board-edit-button" onClick={() => {
                        setEditCard(card);
                        setDraftTitle(card.customTitle ?? '');
                        setDraftNotes(card.notes ?? '');
                      }}>Bearbeiten</button>
                      <div className="board-move-row">
                        <button type="button" className={`button board-move-button ${card.ownerColumn === 'user1' ? 'active' : ''}`} onClick={() => userId && moveBoardCard(userId, card.id, 'user1')}>{personOneName}</button>
                        <button type="button" className={`button board-move-button ${card.ownerColumn === 'user2' ? 'active' : ''}`} onClick={() => userId && moveBoardCard(userId, card.id, 'user2')}>{personTwoName}</button>
                      </div>
                    </div>
                  ))}
                </article>
              );
            })}
          </>
        )}

        {section === 'my-packages' && (
          <article className="card stack">
            <h2 className="card-title">Meine Aufgabenpakete</h2>
            {allCards.filter((item) => item.ownerColumn === ownColumn).map((card) => (
              <div className="report-block" key={card.id}>{card.customTitle?.trim() || card.baseTitle}</div>
            ))}
          </article>
        )}

        {section === 'weekly-review' && <article className="card"><h2 className="card-title">Weekly Review</h2></article>}
        {section === 'test-results' && <article className="card"><h2 className="card-title">Testergebnisse</h2><p className="helper">Siehe Dashboard für Details.</p></article>}
      </div>

      {editCard && (
        <div className="board-drawer-backdrop" role="presentation" onClick={() => setEditCard(null)}>
          <div className="board-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3 className="card-title">Karte bearbeiten</h3>
            <input className="input" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
            <textarea className="input" rows={4} value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} />
            <button type="button" className="button primary" onClick={async () => {
              if (!userId || !editCard) return;
              await updateBoardCard(userId, editCard.id, { customTitle: draftTitle.trim() || null, notes: draftNotes.trim() || null });
              setEditCard(null);
            }}>Speichern</button>
          </div>
        </div>
      )}
    </section>
  );
}
