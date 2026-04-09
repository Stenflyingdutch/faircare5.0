'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LoginBackButton } from '@/components/personal/LoginBackButton';
import { resolveAgeGroupLabel } from '@/components/test/test-config';

import { fetchTaskPackageTemplatesForAdmin, saveTaskPackageTemplate, seedTaskPackageTemplates } from '@/services/ownership.service';
import { quizCatalog } from '@/data/questionTemplates';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { Locale } from '@/types/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';
import type { TaskPackageTemplate } from '@/types/ownership';

const ageGroups: AgeGroup[] = ['0_1', '1_3', '3_6', '6_10', '10_plus'];
const locales: Locale[] = ['de', 'en', 'nl'];

function createTemplate(ageGroup: AgeGroup, categoryKey: QuizCategory): TaskPackageTemplate {
  const id = `${ageGroup}_${categoryKey}_${Date.now()}`;
  return {
    id,
    ageGroup,
    categoryKey,
    title: { de: '', en: '', nl: '' },
    details: { de: ['', '', ''], en: [], nl: [] },
    note: { de: '', en: '', nl: '' },
    sortOrder: Date.now(),
    isActive: true,
    version: 1,
  };
}

export default function AdminTaskPackagesPage() {
  const [activeAge, setActiveAge] = useState<AgeGroup>('0_1');
  const [activeLocale, setActiveLocale] = useState<Locale>('de');
  const [draft, setDraft] = useState<TaskPackageTemplate | null>(null);
  const [templates, setTemplates] = useState<TaskPackageTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const categories = useMemo(
    () => quizCatalog.categories.filter((item) => item.ageGroup === activeAge).sort((a, b) => a.sortOrder - b.sortOrder),
    [activeAge],
  );

  const loadTemplates = useCallback(async () => {
    const result = await fetchTaskPackageTemplatesForAdmin(activeAge);
    setTemplates(result);
  }, [activeAge]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function updateDetail(index: number, value: string) {
    if (!draft) return;
    const current = [...(draft.details[activeLocale] || [])];
    while (current.length <= index) current.push('');
    current[index] = value;
    setDraft({
      ...draft,
      details: {
        ...draft.details,
        [activeLocale]: current,
      },
    });
  }

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
        <LoginBackButton fallbackHref="/admin" label="Zurück zu Admin" />
        <article className="card stack">
          <h1 className="test-title">Admin · Ownership-Pakete für Verantwortlichkeiten</h1>
          <p className="card-description">Globale Vorlagen werden hier gepflegt und bei Aktivierung in familienlokale Karten kopiert.</p>
          <div className="chip-row">
            {ageGroups.map((group) => (
              <button type="button" key={group} className={`option-chip ${group === activeAge ? 'selected' : ''}`} onClick={() => setActiveAge(group)}>{resolveAgeGroupLabel(group)}</button>
            ))}
          </div>
          <div className="chip-row">
            {locales.map((locale) => (
              <button type="button" key={locale} className={`option-chip ${locale === activeLocale ? 'selected' : ''}`} onClick={() => setActiveLocale(locale)}>
                {locale.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="button" disabled={saving} onClick={seedDefaults}>Standardpakete (10 pro Kategorie) ergänzen</button>
        </article>

        <article className="card stack">
          <h2 className="card-title">Neue Vorlage anlegen</h2>
          <div className="chip-row">
            {categories.map((category) => (
              <button
                key={category.key}
                className="button"
                type="button"
                onClick={() => setDraft(createTemplate(activeAge, category.key))}
              >
                {category.label.de || resolveCategoryLabel(category.key, activeAge)}
              </button>
            ))}
          </div>

          {draft && (
            <div className="stack">
              <p className="helper" style={{ margin: 0 }}>Kategorie: {resolveCategoryLabel(draft.categoryKey, draft.ageGroup)} · Altersgruppe: {resolveAgeGroupLabel(draft.ageGroup)} · Sprache: {activeLocale.toUpperCase()}</p>
              <input
                className="input"
                placeholder={`Titel (${activeLocale})`}
                value={draft.title[activeLocale] || ''}
                onChange={(e) => setDraft({ ...draft, title: { ...draft.title, [activeLocale]: e.target.value } })}
              />
              <div className="stack">
                <p className="helper" style={{ margin: 0 }}>Details ({activeLocale.toUpperCase()})</p>
                {Array.from({ length: Math.max(3, draft.details[activeLocale]?.length || 0) }).map((_, index) => (
                  <input
                    key={`${activeLocale}-detail-${index}`}
                    className="input"
                    placeholder={`Detail ${index + 1}`}
                    value={draft.details[activeLocale]?.[index] || ''}
                    onChange={(e) => updateDetail(index, e.target.value)}
                  />
                ))}
              </div>
              <label><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Aktiv</label>
              <button type="button" className="button primary" disabled={saving} onClick={onSave}>{saving ? 'Speichert …' : 'Vorlage speichern'}</button>
            </div>
          )}

          {!!templates.length && (
            <div className="stack">
              <h3 className="card-title" style={{ marginBottom: 0 }}>Vorhandene Vorlagen</h3>
              {templates.map((template) => (
                <div key={template.id} className="report-block stack">
                  <strong>{resolveCategoryLabel(template.categoryKey, template.ageGroup)}</strong>
                  <p className="helper" style={{ margin: 0 }}>{template.title[activeLocale] || template.title.de || template.title.en || template.title.nl || 'Ohne Titel'}</p>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {(template.details[activeLocale] || template.details.de || []).map((detail, index) => (
                      <li key={`${template.id}-detail-${index}`}>{detail}</li>
                    ))}
                  </ul>
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
