'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { fetchAdminUsers } from '@/services/admin.service';
import { fetchAdminCmsState, persistAdminCmsState } from '@/services/admin-cms.service';
import type { AdminAuditEntry, AdminCmsState, NewsletterRecord, QuestionAdminRecord, SystemEmailTemplateRecord, TaskCatalogRecord, WebContentRecord } from '@/types/admin-cms';

const sections = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'questions', label: 'Fragenkatalog' },
  { key: 'tasks', label: 'Aufgabengebiete' },
  { key: 'content', label: 'Webseiten-Inhalte' },
  { key: 'emails', label: 'System-E-Mails' },
  { key: 'newsletters', label: 'Newsletter' },
  { key: 'users', label: 'User-Management' },
  { key: 'translations', label: 'Übersetzungen' },
  { key: 'system', label: 'System / Audit / Versionen' },
] as const;

type SectionKey = (typeof sections)[number]['key'];

function nowIso() {
  return new Date().toISOString();
}

function makeAudit(area: AdminAuditEntry['area'], action: string, targetId: string, summary: string): AdminAuditEntry {
  return {
    id: `${area}_${action}_${Date.now()}`,
    area,
    action,
    targetId,
    summary,
    actor: 'admin-ui',
    createdAt: nowIso(),
  };
}

function missingLocales(value?: { de?: string; en?: string; nl?: string }) {
  const missing: string[] = [];
  if (!value?.de?.trim()) missing.push('DE');
  if (!value?.nl?.trim()) missing.push('NL');
  return missing;
}

export function AdminConsole() {
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [state, setState] = useState<AdminCmsState | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [usersCount, setUsersCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [cms, users] = await Promise.allSettled([fetchAdminCmsState(), fetchAdminUsers()]);
      if (cms.status === 'fulfilled') setState(cms.value);
      if (users.status === 'fulfilled') setUsersCount(users.value.users.filter((entry) => entry.accountStatus === 'active').length);
    })();
  }, []);

  async function save(nextState: AdminCmsState, message = 'Änderungen gespeichert.') {
    setState(nextState);
    setStatus('Speichert …');
    try {
      await persistAdminCmsState(nextState);
      setStatus(message);
    } catch {
      setStatus('Speichern in Firestore nicht möglich – lokale Version wurde behalten.');
    }
  }

  if (!state) {
    return <section className="section"><div className="container"><p>Lade Admin-CMS …</p></div></section>;
  }

  const cms = state;

  const draftCount = cms.questions.filter((entry) => entry.publishStatus === 'draft').length
    + cms.taskCatalog.filter((entry) => entry.publishStatus === 'draft').length
    + cms.webContent.filter((entry) => entry.publishStatus === 'draft').length
    + cms.systemEmails.filter((entry) => entry.publishStatus === 'draft').length
    + cms.newsletters.filter((entry) => entry.status === 'draft').length;

  const missingTranslations = cms.questions.filter((entry) => missingLocales(entry.questionText).length > 0).length
    + cms.taskCatalog.filter((entry) => missingLocales(entry.title).length > 0).length
    + cms.webContent.filter((entry) => missingLocales(entry.pageTitle).length > 0).length;

  const filteredQuestions = cms.questions
    .filter((entry) => [entry.key, entry.category, entry.questionText.de, entry.questionText.nl].join(' ').toLowerCase().includes(search.toLowerCase()));
  const filteredTasks = cms.taskCatalog
    .filter((entry) => [entry.key, entry.category, entry.title.de, entry.title.nl].join(' ').toLowerCase().includes(search.toLowerCase()));

  function addQuestion() {
    const id = `q_${Date.now()}`;
    const nextQuestion: QuestionAdminRecord = {
      id,
      key: `question_${Date.now()}`,
      questionText: { de: '', en: '', nl: '' },
      helperText: { de: '', en: '', nl: '' },
      internalDescription: '',
      ageGroup: '0_1',
      category: 'betreuung_entwicklung',
      sortOrder: cms.questions.length + 1,
      activationStatus: 'active',
      publishStatus: 'draft',
      answerType: 'single_choice',
      answerOptions: [{ de: '', en: '', nl: '' }],
      logicTags: [],
      isRequired: false,
      usageReferences: [],
      versions: [],
    };

    const nextState = {
      ...cms,
      questions: [nextQuestion, ...cms.questions],
      auditLog: [makeAudit('questions', 'create', id, 'Neue Frage erstellt'), ...cms.auditLog],
    };
    void save(nextState, 'Neue Frage angelegt.');
    setActiveSection('questions');
  }

  function duplicateQuestion(question: QuestionAdminRecord) {
    const duplicate = { ...question, id: `${question.id}_copy_${Date.now()}`, key: `${question.key}_copy`, publishStatus: 'draft' as const };
    void save({
      ...cms,
      questions: [duplicate, ...cms.questions],
      auditLog: [makeAudit('questions', 'duplicate', duplicate.id, `Frage ${question.key} dupliziert`), ...cms.auditLog],
    }, 'Frage dupliziert.');
  }

  function addTaskCard() {
    const id = `task_${Date.now()}`;
    const nextTask: TaskCatalogRecord = {
      id,
      key: `task_${Date.now()}`,
      title: { de: '', en: '', nl: '' },
      shortDescription: { de: '', en: '', nl: '' },
      details: { de: '', en: '', nl: '' },
      category: 'betreuung_entwicklung',
      ageGroup: '0_1',
      sortOrder: cms.taskCatalog.length + 1,
      activationStatus: 'active',
      publishStatus: 'draft',
      tags: [],
      isRecommended: false,
      isSpecialCard: false,
      versions: [],
    };

    void save({
      ...cms,
      taskCatalog: [nextTask, ...cms.taskCatalog],
      auditLog: [makeAudit('tasks', 'create', id, 'Neues Aufgabengebiet erstellt'), ...cms.auditLog],
    }, 'Neues Aufgabengebiet angelegt.');
    setActiveSection('tasks');
  }

  function addAudit(area: AdminAuditEntry['area'], action: string, targetId: string, summary: string) {
    return [makeAudit(area, action, targetId, summary), ...cms.auditLog];
  }

  return (
    <section className="section admin-console-section">
      <div className="container admin-console-layout">
        <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="admin-sidebar-head">
            <strong>FairCare Admin</strong>
            <button type="button" className="button" onClick={() => setMobileMenuOpen((current) => !current)}>Menü</button>
          </div>
          <nav className="admin-nav">
            {sections.map((section) => (
              <button key={section.key} type="button" className={`admin-nav-item ${activeSection === section.key ? 'active' : ''}`} onClick={() => { setActiveSection(section.key); setMobileMenuOpen(false); }}>
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main stack">
          <header className="card stack">
            <div className="admin-header-row">
              <div>
                <h1 className="card-title">Admin-CMS</h1>
                <p className="card-description">Zentrale Pflegeoberfläche für Inhalte, Nutzerverwaltung, E-Mails, Newsletter und Audit-Log.</p>
              </div>
              <div className="chip-row">
                <button type="button" className="button primary" onClick={addQuestion}>Neue Frage</button>
                <button type="button" className="button" onClick={addTaskCard}>Neues Aufgabengebiet</button>
                <Link href="/admin/users" className="button">User suchen</Link>
              </div>
            </div>
            <label className="stack">Suche in aktuellem Bereich
              <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Titel, Key, Kategorie, Betreff …" />
            </label>
            {status && <p className="helper">{status}</p>}
          </header>

          {activeSection === 'dashboard' && (
            <div className="grid grid-3">
              <article className="card"><h2 className="card-title">Fragen</h2><p>{cms.questions.length}</p></article>
              <article className="card"><h2 className="card-title">Aufgabengebiete</h2><p>{cms.taskCatalog.length}</p></article>
              <article className="card"><h2 className="card-title">Aktive User</h2><p>{usersCount}</p></article>
              <article className="card"><h2 className="card-title">E-Mail-Templates</h2><p>{cms.systemEmails.length}</p></article>
              <article className="card"><h2 className="card-title">Newsletter</h2><p>{cms.newsletters.length}</p></article>
              <article className="card"><h2 className="card-title">Unveröffentlichte Entwürfe</h2><p>{draftCount}</p></article>
              <article className="card"><h2 className="card-title">Fehlende Übersetzungen</h2><p>{missingTranslations}</p></article>
              <article className="card"><h2 className="card-title">Letzte Änderungen</h2><p>{cms.auditLog.slice(0, 3).map((entry) => entry.summary).join(' · ') || 'Keine'}</p></article>
              <article className="card"><h2 className="card-title">Qualitätshinweise</h2><p>Variablen-Check in E-Mails und Newslettern integriert, fehlende Pflichtfelder markiert.</p></article>
            </div>
          )}

          {activeSection === 'questions' && (
            <div className="stack">
              {filteredQuestions.map((question) => (
                <article key={question.id} className="card stack">
                  <div className="admin-header-row"><strong>{question.key}</strong><span className="helper">{question.publishStatus}</span></div>
                  <label className="stack">Fragetext (DE)
                    <textarea className="input" value={question.questionText.de || ''} onChange={(event) => setState({ ...cms, questions: cms.questions.map((entry) => entry.id === question.id ? { ...entry, questionText: { ...entry.questionText, de: event.target.value } } : entry) })} />
                  </label>
                  <div className="chip-row">
                    <button type="button" className="button" onClick={() => duplicateQuestion(question)}>Duplizieren</button>
                    <button type="button" className="button secondary" onClick={() => save({ ...cms, questions: cms.questions.map((entry) => entry.id === question.id ? { ...entry, activationStatus: 'inactive' } : entry), auditLog: addAudit('questions', 'archive', question.id, `Frage ${question.key} archiviert`) }, 'Frage archiviert.')}>Archivieren</button>
                    <button type="button" className="button primary" onClick={() => save({ ...cms, questions: cms.questions.map((entry) => entry.id === question.id ? { ...entry, publishStatus: 'published' } : entry), auditLog: addAudit('questions', 'publish', question.id, `Frage ${question.key} veröffentlicht`) }, 'Frage veröffentlicht.')}>Veröffentlichen</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeSection === 'tasks' && (
            <div className="stack">
              {filteredTasks.map((task) => (
                <article key={task.id} className="card stack">
                  <div className="admin-header-row"><strong>{task.key}</strong><span className="helper">{task.publishStatus}</span></div>
                  <label className="stack">Titel (DE)
                    <input className="input" value={task.title.de || ''} onChange={(event) => setState({ ...cms, taskCatalog: cms.taskCatalog.map((entry) => entry.id === task.id ? { ...entry, title: { ...entry.title, de: event.target.value } } : entry) })} />
                  </label>
                  <label className="stack">Kategorie
                    <input className="input" value={task.category} onChange={(event) => setState({ ...cms, taskCatalog: cms.taskCatalog.map((entry) => entry.id === task.id ? { ...entry, category: event.target.value } : entry) })} />
                  </label>
                  <div className="chip-row">
                    <button type="button" className="button secondary" onClick={() => save({ ...cms, taskCatalog: cms.taskCatalog.map((entry) => entry.id === task.id ? { ...entry, activationStatus: 'inactive' } : entry), auditLog: addAudit('tasks', 'archive', task.id, `Karte ${task.key} archiviert`) }, 'Aufgabengebiet archiviert.')}>Archivieren</button>
                    <button type="button" className="button primary" onClick={() => save({ ...cms, taskCatalog: cms.taskCatalog.map((entry) => entry.id === task.id ? { ...entry, publishStatus: 'published' } : entry), auditLog: addAudit('tasks', 'publish', task.id, `Karte ${task.key} veröffentlicht`) }, 'Aufgabengebiet veröffentlicht.')}>Veröffentlichen</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeSection === 'content' && (
            <div className="stack">
              {cms.webContent.map((page: WebContentRecord) => (
                <article key={page.id} className="card stack">
                  <strong>{page.key}</strong>
                  <label className="stack">Seitentitel (DE)<input className="input" value={page.pageTitle.de || ''} onChange={(event) => setState({ ...cms, webContent: cms.webContent.map((entry) => entry.id === page.id ? { ...entry, pageTitle: { ...entry.pageTitle, de: event.target.value } } : entry) })} /></label>
                  <label className="stack">Hero (DE)<textarea className="input" value={page.heroText.de || ''} onChange={(event) => setState({ ...cms, webContent: cms.webContent.map((entry) => entry.id === page.id ? { ...entry, heroText: { ...entry.heroText, de: event.target.value } } : entry) })} /></label>
                  <div className="chip-row">
                    <button type="button" className="button" onClick={() => save({ ...cms, auditLog: addAudit('content', 'preview', page.id, `Vorschau für ${page.key} geöffnet`) }, 'Vorschau vorbereitet.')}>Vorschau</button>
                    <button type="button" className="button primary" onClick={() => save({ ...cms, webContent: cms.webContent.map((entry) => entry.id === page.id ? { ...entry, publishStatus: 'published' } : entry), auditLog: addAudit('content', 'publish', page.id, `${page.key} veröffentlicht`) }, 'Inhalt veröffentlicht.')}>Veröffentlichen</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeSection === 'emails' && (
            <div className="stack">
              {cms.systemEmails.map((template: SystemEmailTemplateRecord) => {
                const unknownVariables = Array.from(template.htmlText.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g))
                  .map((entry) => entry[1])
                  .filter((variable) => !template.allowedVariables.includes(variable));
                return (
                  <article key={template.id} className="card stack">
                    <strong>{template.name}</strong>
                    <label className="stack">Betreff<input className="input" value={template.subject} onChange={(event) => setState({ ...cms, systemEmails: cms.systemEmails.map((entry) => entry.id === template.id ? { ...entry, subject: event.target.value } : entry) })} /></label>
                    <label className="stack">Plain Text<textarea className="input" value={template.plainText} onChange={(event) => setState({ ...cms, systemEmails: cms.systemEmails.map((entry) => entry.id === template.id ? { ...entry, plainText: event.target.value } : entry) })} /></label>
                    <label className="stack">HTML<textarea className="input" value={template.htmlText} onChange={(event) => setState({ ...cms, systemEmails: cms.systemEmails.map((entry) => entry.id === template.id ? { ...entry, htmlText: event.target.value } : entry) })} /></label>
                    {!!unknownVariables.length && <p className="inline-error">Ungültige Variablen: {unknownVariables.join(', ')}</p>}
                    <div className="chip-row">
                      <button type="button" className="button" onClick={() => save({ ...cms, auditLog: addAudit('emails', 'test_send', template.id, `${template.key} Testversand vorbereitet`) }, 'Testversand ausgelöst (simuliert).')}>Testversand</button>
                      <button type="button" className="button primary" onClick={() => save({ ...cms, systemEmails: cms.systemEmails.map((entry) => entry.id === template.id ? { ...entry, publishStatus: 'published' } : entry), auditLog: addAudit('emails', 'publish', template.id, `${template.key} veröffentlicht`) }, 'E-Mail-Template veröffentlicht.')}>Veröffentlichen</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeSection === 'newsletters' && (
            <div className="stack">
              {cms.newsletters.map((newsletter: NewsletterRecord) => {
                const missingUnsubscribe = !newsletter.plainText.includes('{{unsubscribe_link}}') || !newsletter.htmlText.includes('{{unsubscribe_link}}');
                return (
                  <article key={newsletter.id} className="card stack">
                    <strong>{newsletter.internalName}</strong>
                    <label className="stack">Betreff<input className="input" value={newsletter.subject} onChange={(event) => setState({ ...cms, newsletters: cms.newsletters.map((entry) => entry.id === newsletter.id ? { ...entry, subject: event.target.value } : entry) })} /></label>
                    <label className="stack">HTML<textarea className="input" value={newsletter.htmlText} onChange={(event) => setState({ ...cms, newsletters: cms.newsletters.map((entry) => entry.id === newsletter.id ? { ...entry, htmlText: event.target.value } : entry) })} /></label>
                    <label className="stack">Plain Text<textarea className="input" value={newsletter.plainText} onChange={(event) => setState({ ...cms, newsletters: cms.newsletters.map((entry) => entry.id === newsletter.id ? { ...entry, plainText: event.target.value } : entry) })} /></label>
                    {missingUnsubscribe && <p className="inline-error">Pflicht-Hinweis: Abmeldelink fehlt in Plain Text oder HTML.</p>}
                    <div className="chip-row">
                      <button type="button" className="button" onClick={() => save({ ...cms, newsletters: [{ ...newsletter, id: `${newsletter.id}_copy_${Date.now()}`, key: `${newsletter.key}_copy`, internalName: `${newsletter.internalName} (Kopie)`, status: 'draft' }, ...cms.newsletters], auditLog: addAudit('newsletters', 'duplicate', newsletter.id, `${newsletter.key} dupliziert`) }, 'Newsletter dupliziert.')}>Duplizieren</button>
                      <button type="button" className="button" onClick={() => save({ ...cms, auditLog: addAudit('newsletters', 'test_send', newsletter.id, `${newsletter.key} Testversand vorbereitet`) }, 'Testversand ausgelöst (simuliert).')}>Testversand</button>
                      <button type="button" className="button primary" onClick={() => save({ ...cms, newsletters: cms.newsletters.map((entry) => entry.id === newsletter.id ? { ...entry, status: 'published' } : entry), auditLog: addAudit('newsletters', 'publish', newsletter.id, `${newsletter.key} veröffentlicht`) }, 'Newsletter veröffentlicht.')}>Veröffentlichen</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeSection === 'users' && (
            <article className="card stack">
              <h2 className="card-title">User-Management</h2>
              <p className="card-description">Vollständige User-Verwaltung (Suche, Rollen, Sperrung, Löschung) bleibt über die bestehende gesicherte API erreichbar.</p>
              <div className="chip-row">
                <Link className="button primary" href="/admin/users">Zur User-Verwaltung</Link>
              </div>
            </article>
          )}

          {activeSection === 'translations' && (
            <article className="card stack">
              <h2 className="card-title">Übersetzungsstatus</h2>
              <p>Fehlende Übersetzungen werden pro Datensatz markiert (mindestens DE + NL).</p>
              <ul>
                {cms.questions.slice(0, 8).map((entry) => (
                  <li key={entry.id}>{entry.key}: {missingLocales(entry.questionText).length ? `Fehlt: ${missingLocales(entry.questionText).join(', ')}` : 'Vollständig'}</li>
                ))}
              </ul>
            </article>
          )}

          {activeSection === 'system' && (
            <article className="card stack">
              <h2 className="card-title">Audit-Log & Versionen</h2>
              <p>Änderungen werden zentral protokolliert. Version-Reset ist für die nächste Iteration vorbereitet.</p>
              <div className="stack">
                {cms.auditLog.slice(0, 40).map((entry) => (
                  <div key={entry.id} className="report-block">
                    <strong>{entry.area}</strong>
                    <p className="helper" style={{ margin: 0 }}>{new Date(entry.createdAt).toLocaleString('de-DE')} · {entry.summary}</p>
                  </div>
                ))}
              </div>
            </article>
          )}
        </main>
      </div>
    </section>
  );
}
