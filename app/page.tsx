'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { fetchContentBlocks, getDefaultContentBlocks, createTextResolver } from '@/services/contentBlocks.service';
import { getCurrentLocale, uiTexts } from '@/lib/i18n';
import type { LocalizedText } from '@/types/i18n';

export default function HomePage() {
  const [texts, setTexts] = useState<Record<string, LocalizedText>>(uiTexts);
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
    return text[locale] || text.de || `[[missing:${key}]]`;
  };

  return (
    <>
      <PageHero
        title={t('landing.hero.headline')}
        subtitle={t('landing.hero.subline')}
        actions={
          <>
            <CTAButton href="/quiz/filter">{t('landing.hero.cta_primary')}</CTAButton>
            <CTAButton href="#differentiation" variant="secondary">{t('landing.hero.cta_secondary')}</CTAButton>
          </>
        }
      />

      <SectionWrapper>
        <div className="grid grid-3">
          <Card
            title={t('landing.problem.point1.title')}
            description={t('landing.problem.point1.text')}
          />
          <Card
            title={t('landing.problem.point2.title')}
            description={t('landing.problem.point2.text')}
          />
          <Card
            title={t('landing.problem.point3.title')}
            description={t('landing.problem.point3.text')}
          />
        </div>
      </SectionWrapper>

      <SectionWrapper subdued id="differentiation">
        <h2 className="section-title">{t('landing.differentiation.headline')}</h2>
        <p className="section-description">{t('landing.differentiation.text')}</p>
        <ul className="bullet-list">
          <li>{t('landing.differentiation.bullet1')}</li>
          <li>{t('landing.differentiation.bullet2')}</li>
          <li>{t('landing.differentiation.bullet3')}</li>
        </ul>
        <p className="section-description">{t('landing.differentiation.additional')}</p>
      </SectionWrapper>

      <SectionWrapper>
        <h2 className="section-title">{t('landing.process.title')}</h2>
        <div className="process-timeline">
          <div className="process-step">
            <h3 className="process-step-title">{t('landing.process.step1.title')}</h3>
            <p className="process-step-text">{t('landing.process.step1.text')}</p>
          </div>
          <div className="process-step">
            <h3 className="process-step-title">{t('landing.process.step2.title')}</h3>
            <p className="process-step-text">{t('landing.process.step2.text')}</p>
          </div>
          <div className="process-step">
            <h3 className="process-step-title">{t('landing.process.step3.title')}</h3>
            <p className="process-step-text">{t('landing.process.step3.text')}</p>
          </div>
          <div className="process-step">
            <h3 className="process-step-title">{t('landing.process.step4.title')}</h3>
            <p className="process-step-text">{t('landing.process.step4.text')}</p>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper subdued>
        <div className="grid grid-3">
          <Card
            title={t('landing.links.mental_load.title')}
            description={t('landing.links.mental_load.text')}
          >
            <div style={{ marginTop: '1rem' }}>
              <CTAButton href="/mental-load" variant="secondary">{t('landing.links.mental_load.button')}</CTAButton>
            </div>
          </Card>
          <Card
            title={t('landing.links.what_is_faircare.title')}
            description={t('landing.links.what_is_faircare.text')}
          >
            <div style={{ marginTop: '1rem' }}>
              <CTAButton href="/about" variant="secondary">{t('landing.links.what_is_faircare.button')}</CTAButton>
            </div>
          </Card>
          <Card
            title={t('landing.links.about_us.title')}
            description={t('landing.links.about_us.text')}
          >
            <div style={{ marginTop: '1rem' }}>
              <CTAButton href="/about" variant="secondary">{t('landing.links.about_us.button')}</CTAButton>
            </div>
          </Card>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="final-cta">
          <p className="final-cta-text">{t('landing.cta_final.text')}</p>
          <CTAButton href="/quiz/filter">{t('landing.cta_final.button')}</CTAButton>
        </div>
      </SectionWrapper>
    </>
  );
}
