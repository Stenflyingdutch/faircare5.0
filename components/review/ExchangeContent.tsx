'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TeamCheckContent } from '@/components/review/TeamCheckContent';
import { fetchTaskThreadDetail, fetchTaskThreads, markTaskThreadRead, sendTaskMessageInThread } from '@/services/task-chat.service';
import type { TaskThreadDetailResponse, TaskThreadListItem } from '@/types/task-chat';

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function logExchangeDebug(event: string, context: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_EXCHANGE_DEBUG !== '1') return;
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_EXCHANGE_DEBUG !== '1') return;
  console.info(`[exchange] ${event}`, context);
}

export function ExchangeContent() {
  const [mainTab, setMainTab] = useState<'checkins' | 'chats'>('checkins');
  const [chatTab, setChatTab] = useState<'inbox' | 'threads'>('inbox');
  const [threads, setThreads] = useState<TaskThreadListItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<TaskThreadDetailResponse | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [inboxOpenCount, setInboxOpenCount] = useState(0);

  const loadThreads = useCallback(async (scope: 'inbox' | 'threads') => {
    setLoading(true);
    try {
      const [scoped, inbox] = await Promise.all([
        fetchTaskThreads(scope),
        fetchTaskThreads('inbox'),
      ]);
      setThreads(scoped.threads);
      setInboxOpenCount(inbox.threads.length);
      logExchangeDebug('badge recompute', { scope, inboxOpenCount: inbox.threads.length });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    logExchangeDebug('listener mount', { listener: 'chatScopeLoader', mainTab, chatTab });
    if (mainTab !== 'chats') {
      return () => logExchangeDebug('listener unmount', { listener: 'chatScopeLoader', mainTab, chatTab });
    }

    void loadThreads(chatTab);
    const intervalId = window.setInterval(() => {
      void loadThreads(chatTab);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      logExchangeDebug('listener unmount', { listener: 'chatScopeLoader', mainTab, chatTab });
    };
  }, [chatTab, loadThreads, mainTab]);

  useEffect(() => {
    if (!activeThreadId) {
      setActiveThread(null);
      return;
    }

    void fetchTaskThreadDetail(activeThreadId).then((detail) => {
      setActiveThread(detail);
      return markTaskThreadRead(activeThreadId);
    }).then(() => loadThreads(chatTab));
  }, [activeThreadId, chatTab, loadThreads]);

  const inboxCount = useMemo(() => inboxOpenCount, [inboxOpenCount]);

  return (
    <section className="section">
      <div className="container stack">
        <div className="exchange-segmented exchange-segmented-main" role="tablist" aria-label="Austausch Ansicht wählen">
          <button type="button" className={`exchange-segment ${mainTab === 'checkins' ? 'is-active' : ''}`} onClick={() => setMainTab('checkins')}>Check-ins</button>
          <button type="button" className={`exchange-segment ${mainTab === 'chats' ? 'is-active' : ''}`} onClick={() => setMainTab('chats')}>Chats</button>
        </div>

        {mainTab === 'checkins' ? (
          <TeamCheckContent />
        ) : (
          <div className="stack">
            <div className="exchange-chat-tabs card">
              <p className="exchange-chat-tabs-label">Chat-Ansicht</p>
              <div className="exchange-segmented exchange-sub-segmented">
                <button type="button" className={`exchange-segment ${chatTab === 'inbox' ? 'is-active' : ''}`} onClick={() => setChatTab('inbox')}>
                  Inbox {inboxCount > 0 ? <span className="exchange-unread-dot" aria-label={`${inboxCount} offene Fälle`} title={`${inboxCount} offene Fälle`} /> : null}
                </button>
                <button type="button" className={`exchange-segment ${chatTab === 'threads' ? 'is-active' : ''}`} onClick={() => setChatTab('threads')}>Threads</button>
              </div>
              <p className="helper exchange-chat-tabs-hint">
                <strong>Inbox</strong> zeigt offene Fälle, <strong>Threads</strong> zeigt alle Chatverläufe.
              </p>
            </div>

            {!activeThread ? (
              <article className="card stack">
                {loading ? <p className="helper" style={{ margin: 0 }}>Lade Chats …</p> : null}
                {!loading && !threads.length && (
                  <p className="helper" style={{ margin: 0 }}>
                    {chatTab === 'inbox' ? 'Keine offenen Fälle.' : 'Noch keine Nachrichten zu Aufgaben.'}
                  </p>
                )}
                <div className="stack" style={{ gap: 8 }}>
                  {threads.map((thread) => (
                    <button key={thread.id} type="button" className="exchange-thread-row" onClick={() => setActiveThreadId(thread.id)}>
                      <div className="stack" style={{ gap: 2 }}>
                        <strong>{thread.taskTitle}</strong>
                        <span className="helper exchange-preview">{thread.lastMessageText || 'Noch keine Nachricht.'}</span>
                        <span className="helper">{thread.lastMessageUserId === thread.createdByUserId ? 'Du' : 'Partner'} · {formatTime(thread.lastMessageAt)}</span>
                      </div>
                      {thread.unreadCount > 0 ? <span className="exchange-unread-dot" aria-label={`${thread.unreadCount} ungelesene Nachrichten`} title={`${thread.unreadCount} ungelesene Nachrichten`} /> : null}
                    </button>
                  ))}
                </div>
              </article>
            ) : (
              <article className="card stack">
                <div className="exchange-thread-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{activeThread.thread.taskTitle}</h3>
                  </div>
                  <button type="button" className="button" onClick={() => setActiveThreadId(null)}>Zurück</button>
                </div>

                <div className="exchange-thread-messages">
                  {activeThread.messages.map((message) => (
                    <div key={message.id} className={`exchange-message ${message.messageType === 'systemDelegation' ? 'is-system' : ''}`}>
                      <p style={{ margin: 0 }}>{message.text}</p>
                      <span className="helper">{formatTime(message.createdAt)}</span>
                    </div>
                  ))}
                </div>

                <form
                  className="exchange-input-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!activeThread || !messageDraft.trim()) return;
                    void sendTaskMessageInThread(activeThread.thread.id, activeThread.thread.taskId, messageDraft)
                      .then(() => fetchTaskThreadDetail(activeThread.thread.id))
                      .then((detail) => {
                        setActiveThread(detail);
                        setMessageDraft('');
                        return loadThreads(chatTab);
                      });
                  }}
                >
                  <input className="input" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Antwort schreiben" />
                  <button type="submit" className="button primary" disabled={!messageDraft.trim()}>Senden</button>
                </form>
              </article>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
