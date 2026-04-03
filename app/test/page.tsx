import Link from 'next/link';

import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function TestPage() {
  return (
    <>
      <PageHero
        badge="Test"
        title="Mental-Load-Test starten"
        subtitle="Beantworte die Fragen Schritt für Schritt. Am Ende bekommst du ein individuelles und gemeinsames Ergebnis."
      />

      <SectionWrapper>
        <div style={{ width: 'min(640px, 100%)' }}>
          <Card
            title="So funktioniert der Test"
            description="Der Test führt euch durch die wichtigsten Mental-Load-Bereiche. Starte hier und wir leiten euch durch die nächsten Schritte."
          >
            <div style={{ marginTop: '1rem' }}>
              <Link href="/dashboard" className="button primary" style={{ display: 'inline-flex' }}>
                Test jetzt starten
              </Link>
            </div>
          </Card>
        </div>
      </SectionWrapper>
    </>
  );
}
