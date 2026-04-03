import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function TestEntryPage() {
  return (
    <>
      <PageHero
        badge="Test"
        title="Mental-Load-Test"
        subtitle="Ohne Registrierung starten. Du siehst zuerst eine kurze Auswertung."
        actions={<CTAButton href="/test/filter">Test starten</CTAButton>}
      />
      <SectionWrapper />
    </>
  );
}
