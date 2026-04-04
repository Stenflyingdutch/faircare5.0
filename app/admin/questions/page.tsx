'use client';

import { useMemo, useState } from 'react';

import { quizCatalog as seededCatalog } from '@/data/questionTemplates';
import type { AgeGroup, QuizCatalog, QuizCategoryTemplate, QuestionTemplate } from '@/types/quiz';

const ageGroups: AgeGroup[] = ['0_1', '1_3', '3_6', '6_10', '10_plus'];

export default function AdminQuestionsPage() {
  const [catalog, setCatalog] = useState<QuizCatalog>(seededCatalog);
  const [activeAge, setActiveAge] = useState<AgeGroup>('0_1');
  const [status, setStatus] = useState('');

  const categories = useMemo(
    () => catalog.categories.filter((entry) => entry.ageGroup === activeAge).sort((a, b) => a.sortOrder - b.sortOrder),
    [catalog, activeAge],
  );

  const questions = useMemo(() => catalog.questions.filter((entry) => entry.ageGroup === activeAge), [catalog, activeAge]);

  function updateCategory(category: QuizCategoryTemplate) {
    setCatalog((current) => ({ ...current, categories: current.categories.map((entry) => (entry.key === category.key && entry.ageGroup === category.ageGroup ? category : entry)) }));
  }

  function updateQuestion(question: QuestionTemplate) {
    setCatalog((current) => ({ ...current, questions: current.questions.map((entry) => (entry.id === question.id ? question : entry)) }));
  }

  async function save() {
    const { persistQuizCatalog } = await import('@/services/firestoreQuiz');
    await persistQuizCatalog(catalog);
    setStatus('Gespeichert.');
  }

  return (
    <section className="section">
      <div className="container stack">
        <h1>Quizfragen verwalten</h1>
        <p className="helper">Kategorien, Beschreibungen, Fragen, Sortierung, Aktivstatus, Altersgruppe und Filterzuordnung sind editierbar.</p>
        <div className="chip-row">
          {ageGroups.map((group) => (
            <button key={group} type="button" className={`option-chip ${activeAge === group ? 'selected' : ''}`} onClick={() => setActiveAge(group)}>
              {group.replace('_', '–').replace('plus', '+')}
            </button>
          ))}
        </div>

        {categories.map((category) => (
          <article key={category.key} className="card stack">
            <h3>{category.label.de}</h3>
            <label className="stack">Kategoriename (de)
              <input className="input" value={category.label.de || ''} onChange={(e) => updateCategory({ ...category, label: { ...category.label, de: e.target.value } })} />
            </label>
            <label className="stack">Kategoriebeschreibung (de)
              <textarea className="input" value={category.description.de || ''} onChange={(e) => updateCategory({ ...category, description: { ...category.description, de: e.target.value } })} />
            </label>
            <label className="stack">Sortierung
              <input className="input" type="number" value={category.sortOrder} onChange={(e) => updateCategory({ ...category, sortOrder: Number(e.target.value) || 0 })} />
            </label>
            <label><input type="checkbox" checked={category.isActive} onChange={(e) => updateCategory({ ...category, isActive: e.target.checked })} /> Aktiv</label>
          </article>
        ))}

        {questions.map((question) => (
          <article key={question.id} className="card stack">
            <strong>{question.id}</strong>
            <label className="stack">Fragetext (de)
              <textarea className="input" value={question.questionText.de || ''} onChange={(e) => updateQuestion({ ...question, questionText: { ...question.questionText, de: e.target.value } })} />
            </label>
            <label className="stack">Sortierung
              <input className="input" type="number" value={question.sortOrder} onChange={(e) => updateQuestion({ ...question, sortOrder: Number(e.target.value) || 0 })} />
            </label>
            <label><input type="checkbox" checked={question.isActive} onChange={(e) => updateQuestion({ ...question, isActive: e.target.checked })} /> Aktiv</label>
          </article>
        ))}

        <button type="button" className="button primary" onClick={save}>Änderungen speichern</button>
        {status && <p className="helper">{status}</p>}
      </div>
    </section>
  );
}
