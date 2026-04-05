'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { saveTaskPackageTemplate } from '@/services/ownership.service';
import { quizCatalog } from '@/data/questionTemplates';
import type { AgeGroup, QuizCategory } from '@/types/quiz';
import type { TaskPackageTemplate } from '@/types/ownership';

const ageGroups: AgeGroup[] = ['0_1', '1_3', '3_6', '6_10', '10_plus'];

function createTemplate(ageGroup: AgeGroup, categoryKey: QuizCategory): TaskPackageTemplate {
  const id = `${ageGroup}_${categoryKey}_${Date.now()}`;
  return {
    id,
    ageGroup,
    categoryKey,
    title: { de: '', en: '', nl: '' },
    note: { de: '', en: '', nl: '' },
    sortOrder: Date.now(),
    isActive: true,
    version: 1,
  };
}

export default function AdminTaskPackagesPage() {
  const [activeAge, setActiveAge] = useState<AgeGroup>('0_1');
  const [draft, setDraft] = useState<TaskPackageTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const categories = useMemo(
    () => quizCatalog.categories.filter((item) => item.ageGroup === activeAge).map((item) => item.key),
    [activeAge],
  );

  async function onSave() {
    if (!draft) return;
    setSaving(true);
    setMessage('');
    try {
      await saveTaskPackageTemplate(draft, 'admin-local');
      setMessage('Vorlage gespeichert.');
      setDraft(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section">
      <div className="container stack">
        <article className="card stack">
          <h1 className="test-title">Admin · Ownership-Aufgabenpakete</h1>
          <p className="card-description">Globale Vorlagen werden hier gepflegt und später als familienlokale Karten kopiert.</p>
          <div className="chip-row">
            {ageGroups.map((group) => (
              <button type="button" key={group} className={`option-chip ${group === activeAge ? 'selected' : ''}`} onClick={() => setActiveAge(group)}>{group}</button>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h2 className="card-title">Neue Vorlage anlegen</h2>
          <div className="chip-row">
            {categories.map((category) => (
              <button
                key={category}
                className="button"
                type="button"
                onClick={() => setDraft(createTemplate(activeAge, category))}
              >
                {category}
              </button>
            ))}
          </div>

          {draft && (
            <div className="stack">
              <p className="helper" style={{ margin: 0 }}>Kategorie: {draft.categoryKey}</p>
              <input className="input" placeholder="Titel (de)" value={draft.title.de || ''} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, de: e.target.value } })} />
              <input className="input" placeholder="Title (en)" value={draft.title.en || ''} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, en: e.target.value } })} />
              <input className="input" placeholder="Titel (nl)" value={draft.title.nl || ''} onChange={(e) => setDraft({ ...draft, title: { ...draft.title, nl: e.target.value } })} />
              <textarea className="input" rows={3} placeholder="Notiz (de)" value={draft.note.de || ''} onChange={(e) => setDraft({ ...draft, note: { ...draft.note, de: e.target.value } })} />
              <textarea className="input" rows={3} placeholder="Note (en)" value={draft.note.en || ''} onChange={(e) => setDraft({ ...draft, note: { ...draft.note, en: e.target.value } })} />
              <textarea className="input" rows={3} placeholder="Notitie (nl)" value={draft.note.nl || ''} onChange={(e) => setDraft({ ...draft, note: { ...draft.note, nl: e.target.value } })} />
              <label><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Aktiv</label>
              <button type="button" className="button primary" disabled={saving} onClick={onSave}>{saving ? 'Speichert …' : 'Vorlage speichern'}</button>
            </div>
          )}

          {message && <p className="helper">{message}</p>}
          <Link href="/admin" className="button">Zurück</Link>
        </article>
      </div>
    </section>
  );
}
