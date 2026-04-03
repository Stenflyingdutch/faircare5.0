import { InfoBlock } from '@/components/InfoBlock';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function MentalLoadPage() {
  return (
    <>
      <PageHero
        badge="Mental Load"
        title="Mental Load in Familien besser verstehen"
        subtitle="Mental Load ist die Verantwortung, an alles zu denken – von Terminen über Einkäufe bis zu kleinen Details im Alltag."
      />
      <SectionWrapper>
        <InfoBlock
          heading="Warum ist das wichtig?"
          text="Wenn mentale Verantwortung dauerhaft einseitig liegt, entstehen Erschöpfung, Konflikte und das Gefühl, alles allein tragen zu müssen."
        />
        <InfoBlock
          heading="Warum trifft es so viele Eltern?"
          text="Mit Kindern laufen viele Aufgaben parallel. Oft übernimmt eine Person unbemerkt das Mitdenken im Hintergrund."
        />
        <InfoBlock
          heading="Was findest du hier künftig?"
          text="Schritt für Schritt ergänzen wir verständliche Inhalte, Studien und praxisnahe Hilfen für eine fairere Aufteilung im Alltag."
        />
      </SectionWrapper>
    </>
  );
}
