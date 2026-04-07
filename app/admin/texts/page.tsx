'use client';

import Link from 'next/link';
import { LoginBackButton } from '@/components/personal/LoginBackButton';
import { useEffect, useMemo, useState } from 'react';

import { fetchContentBlocks, persistContentBlocks } from '@/services/contentBlocks.service';
import type { ContentTextBlock } from '@/types/domain';

const groups = ['navigation', 'auth', 'dashboard', 'quiz', 'results', 'tasks', 'review', 'settings', 'admin', 'onboarding', 'emails', 'system', 'landing'] as const;

type GroupName = (typeof groups)[number];

export default function AdminTextsPage() {
  const [blocks, setBlocks] = useState<ContentTextBlock[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupName>('quiz');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const loaded = await fetchContentBlocks();
      setBlocks(loaded);
    })();
  }, []);

  const visibleBlocks = useMemo(() => blocks
    .filter((entry) => entry.group === activeGroup)
    .filter((entry) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return entry.label.toLowerCase().includes(needle) || entry.description.toLowerCase().includes(needle) || entry.key.toLowerCase().includes(needle);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder), [blocks, activeGroup, search]);

  function updateBlock(next: ContentTextBlock) {
    setBlocks((current) => current.map((entry) => (entry.key === next.key ? next : entry)));
  }

  function duplicateBlock(entry: ContentTextBlock) {
    const duplicate: ContentTextBlock = {
      ...entry,
      key: `${entry.key}.copy.${Date.now()}`,
      label: `${entry.label} (Kopie)`,
      sortOrder: entry.sortOrder + 1,
    };
    setBlocks((current) => [...current, duplicate]);
  }

  function archiveBlock(key: string) {
    setBlocks((current) => current.map((entry) => (entry.key === key ? { ...entry, isActive: false } : entry)));
  }

  async function save() {
    await persistContentBlocks(blocks);
    setStatus('Textbausteine wurden gespeichert.');
  }

  return (
    <section className="section">
      <div className="container stack">
        <LoginBackButton fallbackHref="/admin" label="Zurück zu Admin" />
        <h1 className="test-title">Textbausteine verwalten</h1>
        <p className="helper">Alle sichtbaren Standardtexte sind fachlich gruppiert, mehrsprachig bearbeitbar und ohne JSON-Pflege editierbar.</p>

        <div className="stack">
          <label className="stack">Suche
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Label, Beschreibung oder interner Schlüssel" />
          </label>
          <div className="chip-row">
            {groups.map((group) => (
              <button key={group} type="button" className={`option-chip ${activeGroup === group ? 'selected' : ''}`} onClick={() => setActiveGroup(group)}>
                {group}
              </button>
            ))}
          </div>
        </div>

        {visibleBlocks.map((entry) => (
          <article key={entry.key} className="card stack">
            <div className="stack" style={{ gap: 6 }}>
              <strong>{entry.label}</strong>
              <small className="helper">{entry.description}</small>
            </div>

            <label className="stack">Anzeigename
              <input className="input" value={entry.label} onChange={(event) => updateBlock({ ...entry, label: event.target.value })} />
            </label>
            <label className="stack">Beschreibung
              <textarea className="input" value={entry.description} onChange={(event) => updateBlock({ ...entry, description: event.target.value })} />
            </label>
            <label className="stack">Deutsch
              <textarea className="input" value={entry.text.de || ''} onChange={(event) => updateBlock({ ...entry, text: { ...entry.text, de: event.target.value } })} />
            </label>
            <label className="stack">Englisch
              <textarea className="input" value={entry.text.en || ''} onChange={(event) => updateBlock({ ...entry, text: { ...entry.text, en: event.target.value } })} />
            </label>
            <label className="stack">Niederländisch
              <textarea className="input" value={entry.text.nl || ''} onChange={(event) => updateBlock({ ...entry, text: { ...entry.text, nl: event.target.value } })} />
            </label>

            <div className="grid grid-3">
              <label className="stack">Sortierung
                <input className="input" type="number" value={entry.sortOrder} onChange={(event) => updateBlock({ ...entry, sortOrder: Number(event.target.value) || 0 })} />
              </label>
              <label><input type="checkbox" checked={entry.isActive} onChange={(event) => updateBlock({ ...entry, isActive: event.target.checked })} /> Aktiv</label>
            </div>

            <div className="chip-row">
              <button type="button" className="button" onClick={() => duplicateBlock(entry)}>Duplizieren</button>
              <button type="button" className="button secondary" onClick={() => archiveBlock(entry.key)}>Deaktivieren</button>
            </div>
          </article>
        ))}

        <div className="chip-row">
          <button type="button" className="button primary" onClick={save}>Änderungen speichern</button>
          <Link href="/admin" className="button">Zurück zum Admin</Link>
        </div>
        {status && <p className="helper">{status}</p>}
      </div>
    </section>
  );
}
