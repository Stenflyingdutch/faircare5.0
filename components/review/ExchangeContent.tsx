'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TeamCheckContent } from '@/components/review/TeamCheckContent';
import { fetchTaskThreadDetail, fetchTaskThreads, markTaskThreadRead, sendTaskMessageInThread, TaskChatApiError } from '@/services/task-chat.service';
import type { TaskThreadDetailResponse, TaskThreadListItem } from '@/types/task-chat';

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function logExchangeDebug(event: string, context: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[exchange] ${event}`, context);
}

function toUserFacingQueryError(error: unknown) {
  if (error instanceof TaskChatApiError) {
    if (error.status === 403 || error.errorCode === 'CHAT_PERMISSION_DENIED' || error.errorCode === 'CHAT_ACCESS_DENIED') {
      return 'Du hast aktuell keine Berechtigung auf diesen Chat-Bereich.';
    }
    if (error.status === 401 || error.errorCode === 'UNAUTHENTICATED') {
      return 'Bitte melde dich erneut an, um Chats zu laden.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Chats konnten nicht geladen werden.';
}

const EXCHANGE_DEBUG = process.env.NEXT_PUBLIC_TASK_CHAT_DEBUG === '1';

export function ExchangeContent() {
  const [mainTab, setMainTab] = useState<'checkins' | 'chats'>('chats');
  const [chatTab, setChatTab] = useState<'inbox' | 'threads'>('inbox');
  const [threads, setThreads] = useState<TaskThreadListItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<TaskThreadDetailResponse | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [inboxOpenCount, setInboxOpenCount] = useState(0);
  const [lastQueryError, setLastQueryError] = useState<string | null>(null);
  const [lastWriteError, setLastWriteError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  const loadThreads = useCallback(async (scope: 'inbox' | 'threads') => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setLastQueryError(null);
    try {
      const [scoped, inbox] = await Promise.all([
        fetchTaskThreads(scope),
        fetchTaskThreads('inbox'),
      ]);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setThreads(scoped.threads);
      setInboxOpenCount(inbox.threads.length);
      logExchangeDebug('badge recompute', { scope, inboxOpenCount: inbox.threads.length });
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      const message = toUserFacingQueryError(error);
      setLastQueryError(message);
      logExchangeDebug('loadThreads.error', { scope, message });
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
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
    }).then(() => loadThreads(chatTab))
      .catch((error) => {
        const message = toUserFacingQueryError(error);
        setLastQueryError(message);
        logExchangeDebug('loadThreadDetail.error', { activeThreadId, message });
      });
  }, [activeThreadId, chatTab, loadThreads]);

  const inboxCount = useMemo(() => inboxOpenCount, [inboxOpenCount]);
  const unreadMessageCount = useMemo(() => threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0), [threads]);

  return (
    <section className="section">
      <div className="container stack">
        <div className="exchange-segmented exchange-segmented-main" role="tablist" aria-label="Austausch Ansicht wählen">
          <button type="button" className={`exchange-segment ${mainTab === 'chats' ? 'is-active' : ''}`} onClick={() => setMainTab('chats')}>Chats</button>
          <button type="button" className={`exchange-segment ${mainTab === 'checkins' ? 'is-active' : ''}`} onClick={() => setMainTab('checkins')}>Check-ins</button>
        </div>

        {mainTab === 'checkins' ? (
          <TeamCheckContent />
        ) : (
          <div className="stack">
            <div className="exchange-chat-tabs card">
              <p className="exchange-chat-tabs-label">Chat-Ansicht</p>
              <div className="exchange-segmented exchange-sub-segmented">
                <button type="button" className={`exchange-segment ${chatTab === 'inbox' ? 'is-active' : ''}`} onClick={() => setChatTab('inbox')}>
                  Inbox {inboxCount > 0 ? <span className="ios-badge" aria-label={`${inboxCount} offene Fälle`} title={`${inboxCount} offene Fälle`}>{inboxCount > 99 ? '99+' : inboxCount}</span> : null}
                </button>
                <button type="button" className={`exchange-segment ${chatTab === 'threads' ? 'is-active' : ''}`} onClick={() => setChatTab('threads')}>Threads {chatTab === 'threads' && unreadMessageCount > 0 ? <span className="ios-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span> : null}</button>
              </div>
              <p className="helper exchange-chat-tabs-hint">
                <strong>Inbox</strong> zeigt offene Fälle, <strong>Threads</strong> zeigt alle Chatverläufe.
              </p>
            </div>

            {!activeThread ? (
              <article className="card stack">
                {loading ? <p className="helper" style={{ margin: 0 }}>Lade Chats …</p> : null}
                {!loading && !lastQueryError && !threads.length && (
                  <p className="helper" style={{ margin: 0 }}>
                    {chatTab === 'inbox' ? 'Keine offenen Fälle.' : 'Noch keine Chatverläufe vorhanden.'}
                  </p>
                )}
                {!loading && lastQueryError ? (
                  <p className="helper" style={{ margin: 0, color: '#b00020' }}>
                    {lastQueryError}
                  </p>
                ) : null}
                <div className="stack" style={{ gap: 8 }}>
                  {threads.map((thread) => (
                    <button key={thread.id} type="button" className="exchange-thread-row" onClick={() => setActiveThreadId(thread.id)}>
                      <div className="stack" style={{ gap: 2 }}>
                        <strong className={thread.unreadCount > 0 ? 'exchange-thread-title is-unread' : 'exchange-thread-title'}>{thread.taskTitle}</strong>
                        <span className="helper exchange-preview">{thread.lastMessageText || 'Noch keine Nachricht.'}</span>
                        <span className="helper">{thread.lastMessageUserId === thread.createdByUserId ? 'Du' : 'Partner'} · {formatDateTime(thread.lastMessageAt)}</span>
                      </div>
                      {thread.unreadCount > 0 ? <span className="ios-badge" aria-label={`${thread.unreadCount} ungelesene Nachrichten`} title={`${thread.unreadCount} ungelesene Nachrichten`}>{thread.unreadCount > 99 ? '99+' : thread.unreadCount}</span> : null}
                    </button>
                  ))}
                </div>
              </article>
            ) : (
              <article className="card stack">
                <div className="exchange-thread-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{activeThread.thread.taskTitle}</h3>
                    <p className="helper" style={{ margin: 0 }}>Unterhaltung zu dieser Aufgabe · letzte Aktivität {formatDateTime(activeThread.thread.lastMessageAt)}</p>
                  </div>
                  <button type="button" className="button" onClick={() => setActiveThreadId(null)}>Zurück</button>
                </div>

                <div className="exchange-thread-messages">
                  {activeThread.messages.map((message) => (
                    <div key={message.id} className={`exchange-message ${message.messageType === 'systemDelegation' ? 'is-system' : ''} ${message.senderUserId === activeThread.thread.lastMessageSenderId ? 'is-own' : 'is-other'}`}>
                      <p style={{ margin: 0 }}>{message.text}</p>
                      <span className="helper">{formatDateTime(message.createdAt)}</span>
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
                        setLastWriteError(null);
                        return loadThreads(chatTab);
                      })
                      .catch((error) => {
                        const message = error instanceof Error ? error.message : 'Nachricht konnte nicht gesendet werden.';
                        setLastWriteError(message);
                        logExchangeDebug('sendMessage.error', { threadId: activeThread.thread.id, message });
                      });
                  }}
                >
                  <input className="input" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Antwort schreiben" />
                  <button type="submit" className="button primary" disabled={!messageDraft.trim()}>Senden</button>
                </form>
                {lastWriteError ? <p className="helper" style={{ margin: 0, color: '#b00020' }}>{lastWriteError}</p> : null}
              </article>
            )}
            {EXCHANGE_DEBUG ? (
              <article className="card stack" data-testid="exchange-debug-panel">
                <strong>Debug</strong>
                <p className="helper" style={{ margin: 0 }}>activeThreadId: {activeThreadId ?? '—'}</p>
                <p className="helper" style={{ margin: 0 }}>inboxDocs: {inboxOpenCount}</p>
                <p className="helper" style={{ margin: 0 }}>threadDocs: {threads.length}</p>
                <p className="helper" style={{ margin: 0 }}>activeThreadMessages: {activeThread?.messages.length ?? 0}</p>
                <p className="helper" style={{ margin: 0 }}>lastQueryError: {lastQueryError ?? '—'}</p>
                <p className="helper" style={{ margin: 0 }}>lastWriteError: {lastWriteError ?? '—'}</p>
              </article>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
