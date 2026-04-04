'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { ageGroupOptions, childcareChoices, splitClarityOptions } from '@/components/test/test-config';
import { observeAuthState } from '@/services/auth.service';
import { fetchAppUserProfile } from '@/services/partnerFlow.service';
import { generateQuestionSetFromCatalog, questionCatalogFallback } from '@/services/questionGenerator';
import { fetchQuizCatalog, persistQuizSession } from '@/services/firestoreQuiz';
import { createTempSessionId, saveSessionToStorage } from '@/services/sessionStorage';
import { getCurrentLocale, t } from '@/lib/i18n';
import type { AgeGroup, ChildCount, ChildcareTag, QuizFilterInput, SplitClarity, TempQuizSession } from '@/types/quiz';

const childCountOptions: Array<{ value: ChildCount; label: string }> = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3_plus', label: '3+' },
];

export default function QuizFilterPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Partial<QuizFilterInput>>({ childcareTags: [] });
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locale = getCurrentLocale();

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
      setError(t('quiz.error.selectFirst', locale));
      return;
    }

    if (filter.youngestAgeGroup !== '0_1') {
      setError(t('quiz.error.ageUnsupported', locale));
      return;
    }

    setIsSubmitting(true);
    const tempSessionId = createTempSessionId();
    const normalized = filter as QuizFilterInput;
    let catalog = questionCatalogFallback;
    try {
      catalog = await fetchQuizCatalog();
    } catch {}

    const questions = generateQuestionSetFromCatalog(catalog, {
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

  function canGoNext() {
    if (step === 0) return Boolean(filter.childCount);
    if (step === 1) return Boolean(filter.youngestAgeGroup);
    if (step === 2) return Boolean((filter.childcareTags ?? []).length);
    if (step === 3) return Boolean(filter.splitClarity);
    return false;
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">{t('quiz.filter.title', locale)}</h1>
        <p className="helper">{t('quiz.filter.step', locale, { current: step + 1, total: 4 })}</p>
        <form className="stack" onSubmit={handleSubmit}>
          {step === 0 && (
            <fieldset className="quiz-fieldset stack">
              <legend>{t('quiz.filter.childCount', locale)}</legend>
              <div className="stack">
                {childCountOptions.map((option) => (
                  <button key={option.value} type="button" className={`option-chip ${filter.childCount === option.value ? 'selected' : ''}`} onClick={() => setFilter((c) => ({ ...c, childCount: option.value }))}>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="quiz-fieldset stack">
              <legend>{t('quiz.filter.ageGroup', locale)}</legend>
              <div className="stack">
                {ageGroupOptions.map((option) => (
                  <button key={option.value} type="button" className={`option-chip ${filter.youngestAgeGroup === option.value ? 'selected' : ''}`} onClick={() => setFilter((c) => ({ ...c, youngestAgeGroup: option.value as AgeGroup }))}>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="quiz-fieldset stack">
              <legend>{t('quiz.filter.childcare', locale)}</legend>
              <div className="stack">
                {childcareChoices.map((choice) => (
                  <button key={choice.value} type="button" className={`option-chip ${(filter.childcareTags ?? []).includes(choice.value) ? 'selected' : ''}`} onClick={() => toggleChildcare(choice.value)}>
                    {choice.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="quiz-fieldset stack">
              <legend>{t('quiz.filter.split', locale)}</legend>
              <div className="stack">
                {splitClarityOptions.map((option) => (
                  <button key={option.value} type="button" className={`option-chip ${filter.splitClarity === option.value ? 'selected' : ''}`} onClick={() => setFilter((c) => ({ ...c, splitClarity: option.value as SplitClarity }))}>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {error && <p className="inline-error">{error}</p>}

          <div className="quiz-actions">
            <button type="button" className="button" disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => Math.max(0, current - 1))}>
              {t('common.back', locale)}
            </button>
            {step < 3 ? (
              <button type="button" className="button primary" disabled={!canGoNext() || isSubmitting} onClick={() => setStep((current) => Math.min(3, current + 1))}>
                {t('common.next', locale)}
              </button>
            ) : (
              <button type="submit" className="button primary" disabled={isSubmitting || !canGoNext()}>
                {isSubmitting ? t('quiz.preparing', locale) : t('common.next', locale)}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
