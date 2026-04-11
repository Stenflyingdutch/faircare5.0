'use client';

import { LoginBackButton } from '@/components/personal/LoginBackButton';

import { useEffect, useMemo, useState } from 'react';

import { Modal } from '@/components/Modal';
import { fetchAdminUsers, updateAdminUser, deleteAdminUser, type AdminUserRecord } from '@/services/admin.service';

type FilterValue = 'all' | 'admins' | 'active' | 'blocked';

function formatDate(value?: string | null) {
  if (!value) return 'Unbekannt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unbekannt';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchAdminUsers();
      setUsers(response.users);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const visibleUsers = useMemo(() => users
    .filter((user) => {
      if (filter === 'admins') return user.adminRole === 'admin';
      if (filter === 'active') return user.accountStatus === 'active';
      if (filter === 'blocked') return user.accountStatus === 'blocked';
      return true;
    })
    .filter((user) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return user.displayName.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    }), [filter, search, users]);

  const selectedVisibleUsers = visibleUsers.filter((user) => selectedUserIds.includes(user.id));
  const areAllVisibleSelected = visibleUsers.length > 0 && visibleUsers.every((user) => selectedUserIds.includes(user.id));

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId]
    ));
  }

  function toggleSelectAllVisible() {
    setSelectedUserIds((current) => {
      if (areAllVisibleSelected) {
        return current.filter((id) => !visibleUsers.some((user) => user.id === id));
      }

      const next = new Set(current);
      visibleUsers.forEach((user) => next.add(user.id));
      return [...next];
    });
  }

  async function onToggleAdmin(user: AdminUserRecord) {
    setBusyUserId(user.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const nextRole = user.adminRole === 'admin' ? 'user' : 'admin';
      const response = await updateAdminUser(user.id, { adminRole: nextRole });
      setUsers((current) => current.map((entry) => (entry.id === user.id ? response.user : entry)));
      setStatusMessage(nextRole === 'admin' ? 'Adminrechte wurden vergeben.' : 'Adminrechte wurden entzogen.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function onToggleBlock(user: AdminUserRecord) {
    setBusyUserId(user.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const nextStatus = user.accountStatus === 'blocked' ? 'active' : 'blocked';
      const response = await updateAdminUser(user.id, { accountStatus: nextStatus });
      setUsers((current) => current.map((entry) => (entry.id === user.id ? response.user : entry)));
      setStatusMessage(nextStatus === 'blocked' ? 'Nutzer wurde gesperrt.' : 'Nutzer wurde entsperrt.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function onDeleteConfirmed() {
    if (!userToDelete) return;
    const deletingUser = userToDelete;

    setBusyUserId(deletingUser.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await deleteAdminUser(deletingUser.id);
      setUsers((current) => current.filter((entry) => entry.id !== deletingUser.id));
      setSelectedUserIds((current) => current.filter((entry) => entry !== deletingUser.id));
      setStatusMessage('Nutzer und verknüpfte Daten wurden gelöscht.');
      setUserToDelete((current) => (current?.id === deletingUser.id ? null : current));
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function onBulkDeleteConfirmed() {
    if (selectedVisibleUsers.length === 0) return;

    setBulkBusy(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const results = await Promise.allSettled(selectedVisibleUsers.map((user) => deleteAdminUser(user.id)));
      const deletedIds = selectedVisibleUsers
        .filter((_user, index) => results[index]?.status === 'fulfilled')
        .map((user) => user.id);
      const rejected = results.filter((entry) => entry.status === 'rejected');

      if (deletedIds.length > 0) {
        setUsers((current) => current.filter((entry) => !deletedIds.includes(entry.id)));
        setSelectedUserIds((current) => current.filter((entry) => !deletedIds.includes(entry)));
      }

      if (rejected.length > 0) {
        const firstMessage = rejected[0].reason instanceof Error ? rejected[0].reason.message : 'Mindestens eine Löschaktion ist fehlgeschlagen.';
        setErrorMessage(firstMessage);
      }

      if (deletedIds.length > 0) {
        setStatusMessage(
          rejected.length > 0
            ? `${deletedIds.length} Nutzer wurden gelöscht. Einzelne Aktionen konnten nicht abgeschlossen werden.`
            : `${deletedIds.length} Nutzer wurden gelöscht.`,
        );
      }
    } finally {
      setBulkBusy(false);
      setShowBulkDeleteConfirm(false);
    }
  }

  return (
    <section className="section">
      <div className="container stack">
        <LoginBackButton fallbackHref="/admin" label="Zurück zu Admin" />
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="test-title">Nutzerverwaltung</h1>
          <p className="helper">Admins können hier Nutzer suchen, Rollen ändern, Konten sperren und Konten mit verknüpften Daten löschen.</p>
        </div>

        <div className="card stack">
          <label className="stack">
            <span>Suche nach Name oder E-Mail</span>
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="z. B. sander oder tenijenhuis@gmail.com" />
          </label>

          <div className="chip-row">
            {([
              ['all', 'Alle'],
              ['admins', 'Admins'],
              ['active', 'Aktiv'],
              ['blocked', 'Gesperrt'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`option-chip ${filter === value ? 'selected' : ''}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="chip-row">
            <button type="button" className="button" onClick={toggleSelectAllVisible}>
              {areAllVisibleSelected ? 'Auswahl aufheben' : 'Alle sichtbaren auswählen'}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={bulkBusy || selectedVisibleUsers.length === 0}
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              {bulkBusy ? 'Löscht …' : `Ausgewählte löschen (${selectedVisibleUsers.length})`}
            </button>
          </div>
        </div>

        {loading && <p className="helper">Lade Nutzerverwaltung …</p>}
        {errorMessage && <p className="inline-error">{errorMessage}</p>}
        {statusMessage && <p className="helper">{statusMessage}</p>}

        <div className="stack">
          {visibleUsers.map((user) => {
            const isBusy = busyUserId === user.id;
            const isSelected = selectedUserIds.includes(user.id);
            return (
              <article key={user.id} className="card stack">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUserSelection(user.id)}
                    aria-label={`${user.email} auswählen`}
                    style={{ marginTop: 6 }}
                  />
                  <div className="stack" style={{ gap: 6, flex: 1 }}>
                    <strong>{user.displayName || user.email}</strong>
                    <span className="helper">{user.email}</span>
                  </div>
                </div>

                <div className="grid grid-3">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Rolle</span>
                    <strong>{user.adminRole === 'admin' ? 'Admin' : 'Nutzer'}</strong>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Superuser</span>
                    <strong>{user.isSuperuser ? 'Freigeschaltet' : 'Nein'}</strong>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Status</span>
                    <strong>{user.accountStatus === 'blocked' ? 'Gesperrt' : 'Aktiv'}</strong>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Familienrolle</span>
                    <strong>{user.role ?? 'Keine'}</strong>
                  </div>
                </div>

                <div className="grid grid-3">
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Erstellt</span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Letzter Login</span>
                    <span>{formatDate(user.lastLoginAt)}</span>
                  </div>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="helper">Familie</span>
                    <span>{user.familyId ?? 'Keine Verknüpfung'}</span>
                  </div>
                </div>

                <div className="chip-row">
                  <button type="button" className="button" disabled={isBusy} onClick={() => onToggleAdmin(user)}>
                    {isBusy ? 'Speichert …' : user.adminRole === 'admin' ? 'Admin entziehen' : 'Admin geben'}
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setBusyUserId(user.id);
                      setStatusMessage(null);
                      setErrorMessage(null);

                      try {
                        const response = await updateAdminUser(user.id, { isSuperuser: !user.isSuperuser });
                        setUsers((current) => current.map((entry) => (entry.id === user.id ? response.user : entry)));
                        setStatusMessage(!user.isSuperuser ? 'Superuser wurde freigeschaltet.' : 'Superuser-Freigabe wurde entfernt.');
                      } catch (error) {
                        setErrorMessage((error as Error).message);
                      } finally {
                        setBusyUserId(null);
                      }
                    }}
                  >
                    {isBusy ? 'Speichert …' : user.isSuperuser ? 'Superuser entziehen' : 'Superuser geben'}
                  </button>
                  <button type="button" className="button" disabled={isBusy} onClick={() => onToggleBlock(user)}>
                    {isBusy ? 'Speichert …' : user.accountStatus === 'blocked' ? 'Entsperren' : 'Sperren'}
                  </button>
                  <button type="button" className="button secondary" disabled={isBusy} onClick={() => setUserToDelete(user)}>
                    Löschen
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && visibleUsers.length === 0 && (
          <article className="card stack">
            <h2 className="card-title">Keine Treffer</h2>
            <p className="card-description">Für diese Suche oder Filterkombination wurden keine Nutzer gefunden.</p>
          </article>
        )}
      </div>

      <Modal isOpen={Boolean(userToDelete)} onClose={() => {
        if (!busyUserId) setUserToDelete(null);
      }}
      >
        <div className="stack">
          <h2 className="card-title">Bist du sicher, dass du dein Konto löschen möchtest?</h2>
          <p className="card-description">
            Dein Konto, deine persönlichen Daten, deine Quizdaten und deine persönlichen Ergebnisse werden dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
          </p>
          {userToDelete?.email && <p className="helper" style={{ margin: 0 }}>Zu löschendes Konto: {userToDelete.email}</p>}
          <div className="chip-row">
            <button type="button" className="button secondary" disabled={Boolean(busyUserId)} onClick={() => setUserToDelete(null)}>Abbrechen</button>
            <button type="button" className="button primary" disabled={Boolean(busyUserId)} onClick={onDeleteConfirmed}>
              {busyUserId ? 'Löscht …' : 'Endgültig löschen'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)}>
        <div className="stack">
          <h2 className="card-title">Bist du sicher, dass du dein Konto löschen möchtest?</h2>
          <p className="card-description">
            Dein Konto, deine persönlichen Daten, deine Quizdaten und deine persönlichen Ergebnisse werden dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
          </p>
          <p className="helper" style={{ margin: 0 }}>Ausgewählte Konten: {selectedVisibleUsers.length}</p>
          <div className="chip-row">
            <button type="button" className="button secondary" onClick={() => setShowBulkDeleteConfirm(false)}>Abbrechen</button>
            <button type="button" className="button primary" disabled={bulkBusy} onClick={onBulkDeleteConfirmed}>
              {bulkBusy ? 'Löscht …' : 'Endgültig löschen'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
