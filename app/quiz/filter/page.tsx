'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { ageGroupOptions, childcareChoices, splitClarityOptions } from '@/components/test/test-config';
import { observeAuthState } from '@/services/auth.service';
import { fetchAppUserProfile } from '@/services/partnerFlow.service';
import { generateQuestionSet } from '@/services/questionGenerator';
import { persistQuizSession } from '@/services/firestoreQuiz';
import { createTempSessionId, saveSessionToStorage } from '@/services/sessionStorage';
import type { AgeGroup, ChildCount, ChildcareTag, QuizFilterInput, SplitClarity, TempQuizSession } from '@/types/quiz';

const childCountOptions: Array<{ value: ChildCount; label: string }> = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3_plus', label: '3+' },
];

export default function QuizFilterPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Partial<QuizFilterInput>>({ childcareTags: [] });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) return;
      const profile = await fetchAppUserProfile(user.uid);
      if (profile?.role === 'partner') {
        router.replace('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  function toggleChildcare(tag: ChildcareTag) {
    setFilter((current) => {
      const tags = current.childcareTags ?? [];
      if (tag === 'none') {
        return { ...current, childcareTags: tags.includes('none') ? [] : ['none'] };
      }

      const withoutNone = tags.filter((entry) => entry !== 'none');
      if (withoutNone.includes(tag)) {
        return { ...current, childcareTags: withoutNone.filter((entry) => entry !== tag) };
      }
      return { ...current, childcareTags: [...withoutNone, tag] };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!filter.childCount || !filter.youngestAgeGroup || !(filter.childcareTags ?? []).length || !filter.splitClarity) {
      setError('Bitte triff zuerst eine Auswahl.');
      return;
    }

    if (filter.youngestAgeGroup !== '0_1') {
      setError('Aktuell wird nur die Altersgruppe 0–1 Jahre unterstützt.');
      return;
    }

    setIsSubmitting(true);
    const tempSessionId = createTempSessionId();
    const normalized = filter as QuizFilterInput;
    const questions = generateQuestionSet({
      ageGroup: normalized.youngestAgeGroup,
      childcareTags: normalized.childcareTags,
      tempSessionId,
    });

    const session: TempQuizSession = {
      ...normalized,
      tempSessionId,
      questionIds: questions.map((q) => q.id),
      answers: {},
      stressCategories: [],
      sourcePlatform: 'web',
      createdAt: new Date().toISOString(),
    };

    saveSessionToStorage(session);
    try {
      await persistQuizSession(session);
    } catch {}

    router.push('/quiz/question/0');
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Vor dem Quiz</h1>
        <form className="stack" onSubmit={handleSubmit}>
          <fieldset className="quiz-fieldset stack">
            <legend>Wie viele Kinder habt ihr?</legend>
            <div className="stack">
              {childCountOptions.map((option) => (
                <button key={option.value} type="button" className={`option-chip ${filter.childCount === option.value ? 'selected' : ''}`} onClick={() => setFilter((c) => ({ ...c, childCount: option.value }))}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="quiz-fieldset stack">
            <legend>Wie alt ist das jüngste Kind?</legend>
            <div className="stack">
              {ageGroupOptions.map((option) => (
                <button key={option.value} type="button" className={`option-chip ${filter.youngestAgeGroup === option.value ? 'selected' : ''}`} onClick={() => setFilter((c) => ({ ...c, youngestAgeGroup: option.value as AgeGroup }))}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="quiz-fieldset stack">
            <legend>Welche externe Betreuung nutzt ihr aktuell? (Mehrfachauswahl)</legend>
            <div className="stack">
              {childcareChoices.map((choice) => (
                <button key={choice.value} type="button" className={`option-chip ${(filter.childcareTags ?? []).includes(choice.value) ? 'selected' : ''}`} onClick={() => toggleChildcare(choice.value)}>
                  {choice.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="quiz-fieldset stack">
            <legend>Wie klar ist eure Aufteilung heute?</legend>
            <div className="stack">
              {splitClarityOptions.map((option) => (
                <button key={option.value} type="button" className={`option-chip ${filter.splitClarity === option.value ? 'selected' : ''}`} onClick={() => setFilter((c) => ({ ...c, splitClarity: option.value as SplitClarity }))}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p className="inline-error">{error}</p>}

          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Quiz wird vorbereitet …' : 'Weiter'}
          </button>
        </form>
      </div>
    </section>
  );
}
