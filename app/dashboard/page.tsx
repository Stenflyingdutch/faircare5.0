'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { categoryLabelMap } from '@/services/resultCalculator';
import type { QuizCategory } from '@/types/quiz';
import { observeAuthState } from '@/services/auth.service';
import { fetchUserResult } from '@/services/firestoreQuiz';

interface UserResultPayload {
  summary: { selfPercent: number; partnerPercent: number };
  detailedReport: { categories: Array<{ category: QuizCategory; text: string }> };
}

export default function DashboardPage() {
  const router = useRouter();
  const [result, setResult] = useState<UserResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      const data = await fetchUserResult(user.uid);
      setResult(data as UserResultPayload | null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  return (
    <section className="section">
      <div className="container stack">
        <h1 className="test-title">Dashboard</h1>
        <p className="helper">Wenn bisher nur dein Test vorliegt, zeigen wir bewusst nur die wichtigsten Bereiche.</p>

        <div className="grid grid-2">
          <article className="card stack">
            <h2 className="card-title">Eigenes Ergebnis</h2>
            {!result ? (
              <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            ) : (
              <div className="stack">
                <div>
                  <p className="helper">Gesamtverteilung</p>
                  <div className="result-bar"><div className="result-bar-me" style={{ width: `${result.summary.selfPercent}%` }} /></div>
                  <p>Du {result.summary.selfPercent}% · Partner {result.summary.partnerPercent}%</p>
                </div>
                <div className="stack">
                  {result.detailedReport.categories.map((entry: { category: QuizCategory; text: string }) => (
                    <div key={entry.category} className="report-block">
                      <strong>{categoryLabelMap[entry.category]}</strong>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="card stack">
            <h2 className="card-title">Partner einladen</h2>
            <p className="card-description">Dieser Bereich ist vorbereitet. In der nächsten Etappe folgt die gemeinsame Auswertung nach Partner-Test.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
