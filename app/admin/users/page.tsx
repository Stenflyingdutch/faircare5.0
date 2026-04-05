'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { deleteUserCascade, listUsers, suspendUser, unsuspendUser } from '@/services/admin-user-management.client';
import type { AdminManagedUser } from '@/services/server/admin/types';

const sortOptions = [
  { value: 'createdAt', label: 'Registrierung' },
  { value: 'displayName', label: 'Name' },
  { value: 'email', label: 'E-Mail' },
  { value: 'updatedAt', label: 'Zuletzt geändert' },
] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listUsers({ search, sortBy, sortDirection });
      setUsers(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortDirection]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function onToggleSuspended(user: AdminManagedUser) {
    setBusyUserId(user.id);
    setError(null);
    setMessage(null);
    try {
      if (user.suspended) {
        await unsuspendUser(user.id);
        setMessage(`${user.email} wurde entsperrt.`);
      } else {
        await suspendUser(user.id);
        setMessage(`${user.email} wurde gesperrt.`);
      }
      await loadUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function onDeleteUser(user: AdminManagedUser) {
    const confirmed = window.confirm(`User ${user.email} endgültig löschen?\n\nAlle zugehörigen Daten werden unwiderruflich entfernt.`);
    if (!confirmed) return;

    setBusyUserId(user.id);
    setError(null);
    setMessage(null);
    try {
      await deleteUserCascade(user.id);
      setMessage(`${user.email} wurde endgültig gelöscht.`);
      await loadUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  const totalLabel = useMemo(() => `${users.length} Nutzer geladen`, [users.length]);

  return (
    <section className="section">
      <div className="container stack">
        <h1 className="test-title">Admin · User Management</h1>
        <p className="helper">{totalLabel}. Suche nach Name oder E-Mail, sperre/entsperre Konten und lösche Accounts inklusive verknüpfter Daten.</p>

        <article className="card stack">
          <div className="grid grid-2">
            <label className="stack" htmlFor="user-search">
              <span className="helper">Suche</span>
              <input
                id="user-search"
                className="input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name oder E-Mail"
              />
            </label>
            <div className="grid grid-2">
              <label className="stack" htmlFor="sort-by">
                <span className="helper">Sortieren nach</span>
                <select id="sort-by" className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="stack" htmlFor="sort-direction">
                <span className="helper">Richtung</span>
                <select
                  id="sort-direction"
                  className="input"
                  value={sortDirection}
                  onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">Absteigend</option>
                  <option value="asc">Aufsteigend</option>
                </select>
              </label>
            </div>
          </div>
        </article>

        {message && <p className="helper" style={{ color: 'var(--c-good)' }}>{message}</p>}
        {error && <p className="helper" style={{ color: '#b42318' }}>{error}</p>}

        <article className="card stack">
          {isLoading ? <p>Lade User …</p> : users.length === 0 ? <p>Keine User gefunden.</p> : (
            <div className="stack">
              {users.map((user) => (
                <article key={user.id} className="report-block stack" style={{ gap: 10 }}>
                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <div>
                      <strong>{user.displayName || '—'}</strong>
                      <p className="helper" style={{ marginBottom: 0 }}>{user.email}</p>
                      <p className="helper" style={{ marginBottom: 0 }}>Rolle: {user.role || 'user'}</p>
                    </div>
                    <div>
                      <p className="helper" style={{ marginBottom: 0 }}>
                        Status: {user.suspended ? 'Gesperrt' : 'Aktiv'}
                      </p>
                      <p className="helper" style={{ marginBottom: 0 }}>
                        Registrierung: {user.createdAt ? new Date(user.createdAt).toLocaleString('de-DE') : 'unbekannt'}
                      </p>
                      {user.lastActivityAt && (
                        <p className="helper" style={{ marginBottom: 0 }}>
                          Letzte Aktivität: {new Date(user.lastActivityAt).toLocaleString('de-DE')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="chip-row">
                    <button
                      type="button"
                      className="button"
                      onClick={() => onToggleSuspended(user)}
                      disabled={busyUserId === user.id}
                    >
                      {user.suspended ? 'Entsperren' : 'Sperren'}
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => onDeleteUser(user)}
                      disabled={busyUserId === user.id}
                    >
                      Endgültig löschen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <Link href="/admin" className="button">Zurück zum Admin-Bereich</Link>
      </div>
    </section>
  );
}
