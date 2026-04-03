import { InfoBlock } from '@/components/InfoBlock';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function MentalLoadPage() {
  return (
    <>
      <PageHero
        badge="Wissen"
        title="Mental Load in Familien verstehen"
        subtitle="Mental Load beschreibt die unsichtbare Verantwortung, an alles zu denken – von Kita-Terminen bis zu Geburtstagsgeschenken."
      />
      <SectionWrapper>
        <InfoBlock
          heading="Warum ist das relevant?"
          text="Ungleich verteilte mentale Last kann zu Überforderung, Konflikten und einem dauerhaften Gefühl von Alleinverantwortung führen."
        />
        <InfoBlock
          heading="Warum betrifft es viele Eltern?"
          text="Gerade mit kleinen Kindern entstehen viele parallele Aufgaben. Wer mehr Mental Load trägt, plant oft im Hintergrund ohne sichtbare Anerkennung."
        />
        <InfoBlock
          heading="Was folgt in Etappe 2+?"
          text="Hier entstehen später vertiefende Studien-Links, Doku-Empfehlungen, praxisnahe Leitfäden und interaktive Inhalte."
        />
      </SectionWrapper>
    </>
  );
}
