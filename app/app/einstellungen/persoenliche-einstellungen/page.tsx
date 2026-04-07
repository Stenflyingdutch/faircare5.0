'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { LoginBackButton } from '@/components/personal/LoginBackButton';
import { observeAuthState } from '@/services/auth.service';
import { fetchAppUserProfile } from '@/services/partnerFlow.service';
import {
  reauthenticateForPersonalSettings,
  resolvePersonalSettingsError,
  updatePersonalSettings,
} from '@/services/userSettings.service';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  newPassword: string;
  newPasswordRepeat: string;
  currentPassword: string;
};

const initialState: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  newPassword: '',
  newPasswordRepeat: '',
  currentPassword: '',
};

export default function PersonalSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requiresReauth, setRequiresReauth] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [userId, setUserId] = useState<string | null>(null);
  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [form, setForm] = useState<FormState>(initialState);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.uid);
      const profile = await fetchAppUserProfile(user.uid);
      const firstName = profile?.firstName ?? profile?.displayName?.trim().split(' ')[0] ?? '';
      const lastName = profile?.lastName ?? profile?.displayName?.trim().split(' ').slice(1).join(' ') ?? '';
      const email = profile?.email ?? user.email ?? '';

      setInitialFirstName(firstName.trim());
      setInitialLastName(lastName.trim());
      setInitialEmail(email);
      setForm({
        firstName,
        lastName,
        email,
        newPassword: '',
        newPasswordRepeat: '',
        currentPassword: '',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const hasChanges = useMemo(() => {
    const hasPasswordChange = form.newPassword.trim().length > 0 || form.newPasswordRepeat.trim().length > 0;
    if (hasPasswordChange) return true;
    if (form.firstName.trim().length === 0) return false;
    return (
      form.firstName.trim() !== initialFirstName
      || form.lastName.trim() !== initialLastName
      || form.email.trim().toLowerCase() !== initialEmail.trim().toLowerCase()
    );
  }, [form, initialEmail, initialFirstName, initialLastName]);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setError(null);
    setMessage(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'Bitte gib einen Vornamen ein.';
    }

    const emailValue = form.email.trim();
    if (!emailValue) {
      nextErrors.email = 'Bitte gib eine E-Mail-Adresse ein.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      nextErrors.email = 'Bitte gib eine gültige E-Mail-Adresse ein.';
    }

    const hasPasswordChange = form.newPassword.trim().length > 0 || form.newPasswordRepeat.trim().length > 0;
    if (hasPasswordChange && form.newPassword !== form.newPasswordRepeat) {
      nextErrors.newPasswordRepeat = 'Die beiden Passwörter stimmen nicht überein.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSave() {
    if (!userId || !validate()) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updatePersonalSettings({
        userId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        currentEmail: initialEmail,
        newPassword: form.newPassword.trim() || undefined,
      });
      setInitialFirstName(form.firstName.trim());
      setInitialLastName(form.lastName.trim());
      setInitialEmail(form.email.trim());
      setForm((prev) => ({ ...prev, newPassword: '', newPasswordRepeat: '', currentPassword: '' }));
      setRequiresReauth(false);
      setMessage('Persönliche Einstellungen wurden gespeichert.');
    } catch (saveError) {
      const code = (saveError as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        setRequiresReauth(true);
        setError(resolvePersonalSettingsError(saveError));
      } else {
        setError(resolvePersonalSettingsError(saveError));
      }
    } finally {
      setSaving(false);
    }
  }

  async function onReauthenticate() {
    if (!form.currentPassword.trim()) {
      setFieldErrors((prev) => ({ ...prev, currentPassword: 'Bitte gib dein aktuelles Passwort ein.' }));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await reauthenticateForPersonalSettings({ email: initialEmail, currentPassword: form.currentPassword });
      await onSave();
    } catch (reauthError) {
      setError(resolvePersonalSettingsError(reauthError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <article className="card stack"><h2 className="card-title">Persönliche Einstellungen</h2><p className="helper">Lade Einstellungen …</p></article>;
  }

  return (
    <article className="card stack">
      <div className="settings-subpage-head">
        <LoginBackButton fallbackHref="/app/einstellungen" label="Zurück zu Einstellungen" />
        <h2 className="card-title">Persönliche Einstellungen</h2>
      </div>

      <label className="stack" style={{ gap: 6 }}>
        <span>Vorname</span>
        <input className="input" value={form.firstName} onChange={(event) => onChange('firstName', event.target.value)} />
        {fieldErrors.firstName && <span className="inline-error">{fieldErrors.firstName}</span>}
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <span>Nachname</span>
        <input className="input" value={form.lastName} onChange={(event) => onChange('lastName', event.target.value)} />
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <span>E-Mail-Adresse</span>
        <input className="input" type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} />
        {fieldErrors.email && <span className="inline-error">{fieldErrors.email}</span>}
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <span>Neues Passwort</span>
        <input className="input" type="password" value={form.newPassword} onChange={(event) => onChange('newPassword', event.target.value)} />
      </label>

      <label className="stack" style={{ gap: 6 }}>
        <span>Neues Passwort wiederholen</span>
        <input className="input" type="password" value={form.newPasswordRepeat} onChange={(event) => onChange('newPasswordRepeat', event.target.value)} />
        {fieldErrors.newPasswordRepeat && <span className="inline-error">{fieldErrors.newPasswordRepeat}</span>}
      </label>

      {requiresReauth && (
        <label className="stack" style={{ gap: 6 }}>
          <span>Aktuelles Passwort</span>
          <input className="input" type="password" value={form.currentPassword} onChange={(event) => onChange('currentPassword', event.target.value)} />
          {fieldErrors.currentPassword && <span className="inline-error">{fieldErrors.currentPassword}</span>}
        </label>
      )}

      <button type="button" className="button primary" disabled={saving || !hasChanges} onClick={onSave}>
        {saving ? 'Speichert …' : 'Speichern'}
      </button>

      {requiresReauth && (
        <button type="button" className="button" disabled={saving} onClick={onReauthenticate}>
          {saving ? 'Bestätigt …' : 'Mit aktuellem Passwort bestätigen'}
        </button>
      )}

      {error && <p className="inline-error">{error}</p>}
      {message && <p className="helper" style={{ margin: 0 }}>{message}</p>}
    </article>
  );
}
