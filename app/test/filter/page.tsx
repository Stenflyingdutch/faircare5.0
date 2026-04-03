'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { generateQuizQuestions } from '@/services/question-generator.service';
import { getQuestionPoolByAgeGroup } from '@/services/question-pool.service';
import { createTempSessionId, persistSession, saveLocalSession } from '@/services/quiz-session.service';
import type { ChildcareTag, QuizFilterInput, TempQuizSession } from '@/types/quiz';

const childcareChoices: Array<{ label: string; value: ChildcareTag }> = [
  { label: 'keine Betreuung', value: 'none' },
  { label: 'Kita', value: 'kita' },
  { label: 'Tagesmutter', value: 'tagesmutter' },
  { label: 'Großeltern / Familie', value: 'familie' },
  { label: 'Babysitter / Nanny', value: 'babysitter' },
];

export default function TestFilterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<QuizFilterInput>({
    childCount: '1',
    youngestAgeGroup: '0-1',
    childcareTags: [],
    splitClarity: 'mixed',
  });

  function toggleChildcare(tag: ChildcareTag) {
    setFilter((current) => {
      if (tag === 'none') {
        return { ...current, childcareTags: current.childcareTags.includes('none') ? [] : ['none'] };
      }

      const withoutNone = current.childcareTags.filter((entry) => entry !== 'none');
      if (withoutNone.includes(tag)) {
        return { ...current, childcareTags: withoutNone.filter((entry) => entry !== tag) };
      }

      return { ...current, childcareTags: [...withoutNone, tag] };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const normalizedTags = filter.childcareTags.length > 0 ? filter.childcareTags : ['none'];
    const normalizedFilter = { ...filter, childcareTags: normalizedTags };

    const questionPool = await getQuestionPoolByAgeGroup(normalizedFilter.youngestAgeGroup);
    const selectedQuestions = generateQuizQuestions(questionPool, normalizedFilter);

    const session: TempQuizSession = {
      ...normalizedFilter,
      tempSessionId: createTempSessionId(),
      questionIds: selectedQuestions.map((question) => question.id),
      answers: {},
      stressCategories: [],
      sourcePlatform: 'web',
      createdAt: new Date().toISOString(),
    };

    saveLocalSession(session);
    try {
      await persistSession(session);
    } catch {
      // local persistence is sufficient for MVP fallback.
    }

    router.push('/test/quiz');
  }

  const noneSelected = filter.childcareTags.includes('none');

  return (
    <section className="section">
      <div className="container test-shell">
        <h1 className="test-title">Vor dem Test</h1>
        <p className="helper">Diese Infos helfen, passende Fragen auszuwählen.</p>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            <span>Wie viele Kinder habt ihr?</span>
            <select
              className="input"
              value={filter.childCount}
              onChange={(event) => setFilter((current) => ({ ...current, childCount: event.target.value as '1' | '2' | '3+' }))}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3+">3+</option>
            </select>
          </label>

          <label className="stack">
            <span>Wie alt ist das jüngste Kind?</span>
            <select
              className="input"
              value={filter.youngestAgeGroup}
              onChange={(event) =>
                setFilter((current) => ({ ...current, youngestAgeGroup: event.target.value as QuizFilterInput['youngestAgeGroup'] }))
              }
            >
              <option value="0-1">0–1 Jahre</option>
              <option value="1-3">1–3 Jahre</option>
              <option value="3-6">3–6 Jahre</option>
              <option value="6-12">6–12 Jahre</option>
              <option value="12-18">12–18 Jahre</option>
            </select>
          </label>

          <fieldset className="stack quiz-fieldset">
            <legend>Welche Betreuung nutzt ihr aktuell? (Mehrfachauswahl)</legend>
            {childcareChoices.map((choice) => {
              const disabled = noneSelected && choice.value !== 'none';
              return (
                <button
                  type="button"
                  key={choice.value}
                  className={`option-chip ${filter.childcareTags.includes(choice.value) ? 'selected' : ''}`}
                  onClick={() => toggleChildcare(choice.value)}
                  disabled={disabled}
                >
                  {choice.label}
                </button>
              );
            })}
          </fieldset>

          <label className="stack">
            <span>Wie klar ist eure Aufteilung heute?</span>
            <select
              className="input"
              value={filter.splitClarity}
              onChange={(event) => setFilter((current) => ({ ...current, splitClarity: event.target.value as QuizFilterInput['splitClarity'] }))}
            >
              <option value="clear">eher klar</option>
              <option value="mixed">teils klar, teils spontan</option>
              <option value="unclear">oft unklar</option>
            </select>
          </label>

          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Wird vorbereitet …' : 'Weiter zum Test'}
          </button>
        </form>
      </div>
    </section>
  );
}
