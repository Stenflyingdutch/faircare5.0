'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { questionTemplates } from '@/data/questionTemplates';
import { loadSessionFromStorage } from '@/services/sessionStorage';

const TOTAL_DURATION_MS = 5000;
const TICK_MS = 100;
const BANNER_TICK_MS = 450;

export default function QuizPreparingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [questionPool, setQuestionPool] = useState<string[]>([]);

  useEffect(() => {
    const session = loadSessionFromStorage();
    if (!session) {
      router.replace('/quiz/filter');
      return;
    }

    const extraQuestions = questionTemplates
      .filter((entry) => !session.questionIds.includes(entry.id))
      .slice(0, 30)
      .map((entry) => entry.questionText?.de ?? entry.id);

    setQuestionPool(extraQuestions.length ? extraQuestions : questionTemplates.slice(0, 10).map((entry) => entry.questionText?.de ?? entry.id));

    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, Math.round((elapsed / TOTAL_DURATION_MS) * 100));
      setProgress(nextProgress);
      if (nextProgress >= 100) {
        window.clearInterval(progressTimer);
        router.replace('/quiz/result');
      }
    }, TICK_MS);

    const bannerTimer = window.setInterval(() => {
      setBannerIndex((current) => current + 1);
    }, BANNER_TICK_MS);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(bannerTimer);
    };
  }, [router]);

  const bannerText = useMemo(() => {
    if (!questionPool.length) return '';
    const visible = Array.from({ length: 4 }).map((_, offset) => questionPool[(bannerIndex + offset) % questionPool.length]);
    return visible.join(' - ');
  }, [bannerIndex, questionPool]);

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Dein Ergebnis wird vorbereitet</h1>

        <div className="quiz-progress" aria-label="Ladefortschritt">
          <div className="quiz-progress-bar" style={{ width: `${progress}%`, transition: `width ${TICK_MS}ms linear` }} />
        </div>
        <p className="helper">{progress}%</p>

        <div className="card" style={{ overflow: 'hidden' }}>
          <p className="helper" style={{ marginBottom: 8 }}>Kurzer Gedanken-Check</p>
          <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bannerText}</p>
        </div>
      </div>
    </section>
  );
}
