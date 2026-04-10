'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { Modal } from '@/components/Modal';
import { FairCareInfo } from '@/components/FairCareInfo';
import { fetchContentBlocks, getDefaultContentBlocks, createTextResolver } from '@/services/contentBlocks.service';
import { getCurrentLocale, uiTexts } from '@/lib/i18n';
import type { LocalizedText } from '@/types/i18n';
import { siteVisibility } from '@/utils/siteVisibility';

export default function HomePage() {
  const [texts, setTexts] = useState<Record<string, LocalizedText>>(uiTexts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const locale = getCurrentLocale();

  useEffect(() => {
    (async () => {
      try {
        const blocks = await fetchContentBlocks();
        const resolver = createTextResolver(blocks);
        const merged = { ...uiTexts };
        for (const key of resolver.keys) {
          const value = resolver.resolve(key);
          if (value) merged[key] = value;
        }
        setTexts(merged);
      } catch {
        const fallback = createTextResolver(getDefaultContentBlocks());
        const merged = { ...uiTexts };
        for (const key of fallback.keys) {
          const value = fallback.resolve(key);
          if (value) merged[key] = value;
        }
        setTexts(merged);
      }
    })();
  }, []);

  const t = (key: string) => {
    const text = texts[key];
    if (!text) return `[[missing:${key}]]`;
    if (typeof text === 'string') return text;
    if (text[locale] !== undefined) return text[locale];
    if (text.de !== undefined) return text.de;
    return `[[missing:${key}]]`;
  };

  const linksGridClass = siteVisibility.about ? 'grid grid-3' : 'grid grid-2';
  const heroPrimaryText = locale === 'de' ? 'Quiz starten' : t('landing.hero.cta_primary');
  const problemPointOneText = locale === 'de'
    ? 'Das Quiz zeigt, wie Verantwortung heute verteilt ist.'
    : t('landing.problem.point1.text');
  const problemPointTwoText = locale === 'de'
    ? 'Eine offene Diskussion führen, was für Euch eine faire Verteilung bedeutet.'
    : t('landing.problem.point2.text');
  const finalCtaButtonText = locale === 'de' ? 'Jetzt Quiz starten' : t('landing.cta_final.button');
  const landingProblemCards = [
    {
      key: 'point1',
      title: t('landing.problem.point1.title'),
      text: problemPointOneText,
    },
    {
      key: 'point2',
      title: t('landing.problem.point2.title'),
      text: problemPointTwoText,
    },
    {
      key: 'point3',
      title: t('landing.problem.point3.title'),
      text: t('landing.problem.point3.text'),
    },
  ];

  return (
    <>
      <PageHero
        title={t('landing.hero.headline')}
        subtitle={t('landing.hero.subline')}
        actions={
          <>
            <CTAButton href="/quiz/filter">{heroPrimaryText}</CTAButton>
            <button
              type="button"
              className="cta-button secondary hero-info-button"
              onClick={() => setIsModalOpen(true)}
            >
              {t('landing.hero.cta_secondary')}
            </button>
          </>
        }
      />

      <SectionWrapper>
        <div className="landing-problem-grid" role="list" aria-label="Drei Schritte für eine faire Verteilung">
          {landingProblemCards.map((item, index) => (
            <article key={item.key} className="landing-problem-card" role="listitem">
              <span className="landing-problem-index">{`0${index + 1}`}</span>
              <h3 className="landing-problem-title">{item.title}</h3>
              <p className="landing-problem-text">{item.text}</p>
            </article>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper subdued>
        <div className={linksGridClass}>
          <Card
            className="card--link"
            title={t('landing.links.mental_load.title')}
            description={t('landing.links.mental_load.text')}
          >
            <div className="card-action card-action--centered">
              <CTAButton href="/mental-load" variant="secondary">{t('landing.links.mental_load.button')}</CTAButton>
            </div>
          </Card>
          <Card
            className="card--link"
            title={heroPrimaryText}
            description={t('landing.cta_final.text')}
          >
            <div className="card-action card-action--centered">
              <CTAButton href="/quiz/filter">{finalCtaButtonText}</CTAButton>
            </div>
          </Card>
          {siteVisibility.about && (
            <Card
              className="card--link"
              title={t('landing.links.about_us.title')}
              description={t('landing.links.about_us.text')}
            >
              <div className="card-action card-action--centered">
                <CTAButton href="/about" variant="secondary">{t('landing.links.about_us.button')}</CTAButton>
              </div>
            </Card>
          )}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="final-cta">
          <p className="final-cta-text">{t('landing.cta_final.text')}</p>
          <CTAButton href="/quiz/filter">{finalCtaButtonText}</CTAButton>
        </div>
      </SectionWrapper>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <FairCareInfo onClose={() => setIsModalOpen(false)} />
      </Modal>
    </>
  );
}
