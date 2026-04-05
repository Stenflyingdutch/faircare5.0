'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { fetchTaskPackageTemplatesForAdmin, saveTaskPackageTemplate, seedTaskPackageTemplates } from '@/services/ownership.service';
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
  const [templates, setTemplates] = useState<TaskPackageTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const categories = useMemo(
    () => quizCatalog.categories.filter((item) => item.ageGroup === activeAge).map((item) => item.key),
    [activeAge],
  );

  const loadTemplates = useCallback(async () => {
    const result = await fetchTaskPackageTemplatesForAdmin(activeAge);
    setTemplates(result);
  }, [activeAge]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function onSave() {
    if (!draft) return;
    setSaving(true);
    setMessage('');
    try {
      await saveTaskPackageTemplate(draft, 'admin-local');
      setMessage('Vorlage gespeichert.');
      setDraft(null);
      await loadTemplates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    setMessage('');
    try {
      const created = await seedTaskPackageTemplates(activeAge, 'admin-local');
      setMessage(created > 0 ? `${created} Vorlagen ergänzt.` : 'Es waren bereits ausreichend Vorlagen vorhanden.');
      await loadTemplates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Seed fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section">
      <div className="container stack">
        <article className="card stack">
          <h1 className="test-title">Admin · Ownership-Aufgabenpakete</h1>
          <p className="card-description">Globale Vorlagen werden hier gepflegt und bei Aktivierung in familienlokale Karten kopiert.</p>
          <div className="chip-row">
            {ageGroups.map((group) => (
              <button type="button" key={group} className={`option-chip ${group === activeAge ? 'selected' : ''}`} onClick={() => setActiveAge(group)}>{group}</button>
            ))}
          </div>
          <button type="button" className="button" disabled={saving} onClick={seedDefaults}>Standardpakete (10 pro Kategorie) ergänzen</button>
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

          {!!templates.length && (
            <div className="stack">
              <h3 className="card-title" style={{ marginBottom: 0 }}>Vorhandene Vorlagen</h3>
              {templates.map((template) => (
                <div key={template.id} className="report-block stack">
                  <strong>{template.categoryKey}</strong>
                  <p className="helper" style={{ margin: 0 }}>{template.title.de || template.title.en || template.title.nl || 'Ohne Titel'}</p>
                  <p className="helper" style={{ margin: 0 }}>Sortierung: {template.sortOrder} · Version: {template.version} · {template.isActive ? 'Aktiv' : 'Inaktiv'}</p>
                  <button type="button" className="button" onClick={() => setDraft(template)}>Bearbeiten</button>
                </div>
              ))}
            </div>
          )}

          {message && <p className="helper">{message}</p>}
          <Link href="/admin" className="button">Zurück</Link>
        </article>
      </div>
    </section>
  );
}
