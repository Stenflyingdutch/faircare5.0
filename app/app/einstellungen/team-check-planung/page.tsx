'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LoginBackButton } from '@/components/personal/LoginBackButton';
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

const timeOptions = [
  '',
  '08:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
  '22:00',
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
  const [showCustomTime, setShowCustomTime] = useState(false);

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
        setShowCustomTime(Boolean(plan.time) && !timeOptions.includes(plan.time ?? ''));
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
      router.push('/app/review');
    } catch {
      setError('Die Check-in Planung konnte nicht gespeichert werden.');
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
      setMessage('E-Mail-Erinnerung aktualisiert.');
    } catch {
      setEmailReminderEnabled(!nextValue);
      setError('Die E-Mail-Erinnerung konnte nicht gespeichert werden.');
    } finally {
      setSavingReminder(false);
    }
  }

  if (loading) {
    return <article className="card stack"><h2 className="card-title">Check-in Planung</h2><p className="helper">Lade Einstellungen …</p></article>;
  }

  return (
    <article className="card stack team-check-settings-card">
      <div className="settings-subpage-head">
        <LoginBackButton fallbackHref="/app/einstellungen" label="Zurück zu Einstellungen" />
        <h2 className="card-title">Check-in Planung</h2>
      </div>

      {!familyId && <p className="helper" style={{ margin: 0 }}>Noch keine Familie verknüpft.</p>}

      {!!familyId && (
        <>
          <section className="team-check-settings-section">
            <div className="team-check-settings-label-group">
              <span className="team-check-settings-label">Rhythmus</span>
            </div>
            <div className="team-check-segment-grid team-check-segment-grid--three">
              {([{
                label: 'Wöchentlich',
                value: 'weekly',
              }, {
                label: 'Alle 2 Wochen',
                value: 'biweekly',
              }, {
                label: 'Monatlich',
                value: 'monthly',
              }] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`team-check-segment-button ${frequency === option.value ? 'is-active' : ''}`}
                  onClick={() => setFrequency(option.value)}
                  aria-pressed={frequency === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="team-check-settings-section">
            <div className="team-check-settings-label-group">
              <span className="team-check-settings-label">Tag</span>
            </div>
            <div className="team-check-segment-grid team-check-segment-grid--two">
              {weekDayOptions.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className={`team-check-segment-button ${dayOfWeek === entry.value ? 'is-active' : ''}`}
                  onClick={() => setDayOfWeek(entry.value)}
                  aria-pressed={dayOfWeek === entry.value}
                >
                  {frequency === 'monthly' ? `Erster ${entry.label}` : entry.label}
                </button>
              ))}
            </div>
          </section>

          <section className="team-check-settings-section">
            <div className="team-check-settings-label-group">
              <span className="team-check-settings-label">Uhrzeit</span>
              <span className="helper team-check-settings-note">Optional</span>
            </div>
            <div className="team-check-time-grid" role="list" aria-label="Uhrzeit wählen">
              {timeOptions.map((option) => (
                <button
                  key={option || 'none'}
                  type="button"
                  className={`team-check-time-chip ${time === option && (!showCustomTime || option === '') ? 'is-active' : ''}`}
                  onClick={() => {
                    setShowCustomTime(false);
                    setTime(option);
                  }}
                  aria-pressed={time === option}
                >
                  {option || 'Keine Uhrzeit'}
                </button>
              ))}
              <button
                type="button"
                className={`team-check-time-chip team-check-time-chip--custom ${showCustomTime ? 'is-active' : ''}`}
                onClick={() => {
                  setShowCustomTime(true);
                  if (!time || timeOptions.includes(time)) {
                    setTime('09:30');
                  }
                }}
                aria-pressed={showCustomTime}
              >
                Eigene Zeit
              </button>
            </div>
            {showCustomTime && (
              <label className="team-check-custom-time-field">
                <span className="helper team-check-custom-time-label">Zeit auswählen</span>
                <input
                  className="input team-check-custom-time-input"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  step={300}
                />
              </label>
            )}
          </section>

          <button type="button" className="button team-check-save-button" onClick={onSavePlan} disabled={savingPlan}>
            {savingPlan ? 'Speichert …' : 'Speichern'}
          </button>
        </>
      )}

      <section className="team-check-settings-section team-check-settings-section--muted">
        <div className="team-check-settings-label-group">
          <h3 className="card-title" style={{ margin: 0 }}>E-Mail-Erinnerung</h3>
        </div>
        <div className="team-check-segment-grid team-check-segment-grid--two">
          <button
            type="button"
            className={`team-check-segment-button ${emailReminderEnabled ? 'is-active' : ''}`}
            onClick={() => onSaveReminder(true)}
            disabled={savingReminder}
          >
            Ja
          </button>
          <button
            type="button"
            className={`team-check-segment-button ${!emailReminderEnabled ? 'is-active' : ''}`}
            onClick={() => onSaveReminder(false)}
            disabled={savingReminder}
          >
            Nein
          </button>
        </div>
      </section>

      {error && <p className="inline-error">{error}</p>}
      {message && <p className="helper" style={{ margin: 0 }}>{message}</p>}
    </article>
  );
}
