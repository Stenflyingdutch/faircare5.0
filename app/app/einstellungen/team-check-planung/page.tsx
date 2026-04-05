'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import {
  fetchTeamCheckEmailPreference,
  saveTeamCheckEmailPreference,
  saveTeamCheckPlan,
} from '@/services/teamCheck.service';
import type { TeamCheckFrequency } from '@/types/team-check';

const weekDayOptions = [
  { label: 'Montag', value: 1 },
  { label: 'Dienstag', value: 2 },
  { label: 'Mittwoch', value: 3 },
  { label: 'Donnerstag', value: 4 },
  { label: 'Freitag', value: 5 },
  { label: 'Samstag', value: 6 },
  { label: 'Sonntag', value: 0 },
];

export default function TeamCheckPlanungPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<TeamCheckFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [time, setTime] = useState('');
  const [emailReminderEnabled, setEmailReminderEnabled] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);
      const bundle = await fetchDashboardBundle(user.uid);
      setFamilyId(bundle.profile?.familyId ?? null);

      const plan = bundle.family?.teamCheckPlan;
      if (plan) {
        setFrequency(plan.frequency);
        setDayOfWeek(plan.dayOfWeek);
        setTime(plan.time ?? '');
      }

      const pref = await fetchTeamCheckEmailPreference(user.uid);
      setEmailReminderEnabled(pref);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function onSavePlan() {
    if (!familyId || !userId) return;
    setSavingPlan(true);
    setError(null);
    setMessage(null);
    try {
      await saveTeamCheckPlan({
        familyId,
        actorUserId: userId,
        frequency,
        dayOfWeek,
        time,
      });
      setMessage('Team-Check Planung gespeichert. Die Erinnerung wird 1 Tag vorher aktiv.');
    } catch {
      setError('Die Team-Check Planung konnte nicht gespeichert werden.');
    } finally {
      setSavingPlan(false);
    }
  }

  async function onSaveReminder(nextValue: boolean) {
    if (!userId) return;
    setSavingReminder(true);
    setError(null);
    setMessage(null);
    setEmailReminderEnabled(nextValue);
    try {
      await saveTeamCheckEmailPreference({ userId, enabled: nextValue });
      setMessage('E-Mail-Erinnerung aktualisiert (1 Tag vorher).');
    } catch {
      setEmailReminderEnabled(!nextValue);
      setError('Die E-Mail-Erinnerung konnte nicht gespeichert werden.');
    } finally {
      setSavingReminder(false);
    }
  }

  if (loading) {
    return <article className="card stack"><h2 className="card-title">Team-Check Planung</h2><p className="helper">Lade Einstellungen …</p></article>;
  }

  return (
    <article className="card stack">
      <div className="settings-subpage-head">
        <Link href="/app/einstellungen" className="button settings-back-button">Zurück zu Einstellungen</Link>
        <h2 className="card-title">Team-Check Planung</h2>
      </div>
      <p className="helper" style={{ margin: 0 }}>Die Planung gilt für euer Team. Die E-Mail-Erinnerung steuerst du individuell pro Nutzerprofil.</p>

      {!familyId && <p className="helper" style={{ margin: 0 }}>Noch keine Familie verknüpft.</p>}

      {!!familyId && (
        <>
          <label className="stack" style={{ gap: 6 }}>
            <span>Frequenz des Team-Checks</span>
            <select className="input" value={frequency} onChange={(event) => setFrequency(event.target.value as TeamCheckFrequency)}>
              <option value="weekly">Wöchentlich</option>
              <option value="biweekly">Alle 2 Wochen</option>
              <option value="monthly">Monatlich</option>
            </select>
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <span>Tag des Team-Checks</span>
            <select className="input" value={dayOfWeek} onChange={(event) => setDayOfWeek(Number(event.target.value))}>
              {weekDayOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {frequency === 'monthly' ? `Erster ${entry.label} im Monat` : entry.label}
                </option>
              ))}
            </select>
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <span>Uhrzeit (optional)</span>
            <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>

          <button type="button" className="button primary" onClick={onSavePlan} disabled={savingPlan}>
            {savingPlan ? 'Speichert …' : 'Speichern'}
          </button>
        </>
      )}

      <div className="stack" style={{ gap: 8 }}>
        <h3 className="card-title" style={{ margin: 0 }}>E-Mail-Erinnerung</h3>
        <p className="helper" style={{ margin: 0 }}>Erinnerung immer genau 1 Tag vor dem Team-Check.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`button ${emailReminderEnabled ? 'primary' : ''}`} onClick={() => onSaveReminder(true)} disabled={savingReminder}>
            Ja
          </button>
          <button type="button" className={`button ${!emailReminderEnabled ? 'primary' : ''}`} onClick={() => onSaveReminder(false)} disabled={savingReminder}>
            Nein
          </button>
        </div>
      </div>

      {error && <p className="inline-error">{error}</p>}
      {message && <p className="helper" style={{ margin: 0 }}>{message}</p>}
    </article>
  );
}
