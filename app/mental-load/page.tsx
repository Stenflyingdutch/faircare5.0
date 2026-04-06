import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

const keyFigures = [
  {
    value: '44 %',
    title: 'Gender Care Gap',
    text: 'Frauen leisten in Deutschland rund 44 Prozent mehr unbezahlte Sorgearbeit als Männer.',
    source: 'Destatis, Zeitverwendungserhebung 2022',
  },
  {
    value: '62 %',
    title: 'Hauptverantwortung bei Frauen',
    text: 'In Paarhaushalten sehen sich 62 Prozent der Frauen als Hauptverantwortliche für Organisation und Alltagskoordination.',
    source: 'WSI-Studie 2023',
  },
  {
    value: '20 %',
    title: 'Hauptverantwortung bei Männern',
    text: 'Nur 20 Prozent der Männer beschreiben sich in derselben Untersuchung als Hauptverantwortliche.',
    source: 'WSI-Studie 2023',
  },
] as const;

const sources = [
  {
    title: 'Zeitverwendungserhebung 2022',
    org: 'Statistisches Bundesamt',
    text: 'Die Erhebung zeigt deutlich, wie ungleich unbezahlte Sorgearbeit in Deutschland verteilt bleibt.',
    href: 'https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Einkommen-Konsum-Lebensbedingungen/Zeitverwendung/zve2022/_inhalt.html',
  },
  {
    title: 'Mental Load in Paarhaushalten',
    org: 'Hans-Böckler-Stiftung / WSI',
    text: 'Die Analyse zeigt, dass die mentale Gesamtverantwortung selbst bei Vollzeitbeschäftigung häufig bei Frauen bleibt.',
    href: 'https://www.boeckler.de/de/faust-detail.htm?sync_id=HBS-008679',
  },
  {
    title: 'Eltern-Burnout und Care-Arbeit',
    org: 'Müttergenesungswerk',
    text: 'Das Müttergenesungswerk beschreibt Mütter oft als Schnittstelle zwischen Familie, Schule, Kita und Beruf.',
    href: 'https://www.muettergenesungswerk.de/blog/artikel/eltern-burnout',
  },
  {
    title: 'Dritter Gleichstellungsbericht',
    org: 'BMFSFJ',
    text: 'Der Bericht ordnet ungleich verteilte Care-Arbeit politisch ein und zeigt Folgen für Einkommen, Karriere und Alterssicherung.',
    href: 'https://www.bmfsfj.de/bmfsfj/service/publikationen/dritter-gleichstellungsbericht-der-bundesregierung-182784',
  },
  {
    title: 'Rushhour des Lebens',
    org: 'Deutsches Jugendinstitut',
    text: 'Das DJI untersucht die Verdichtung von Erwerbsarbeit und Familienorganisation, besonders in Familien mit kleinen Kindern.',
    href: 'https://www.dji.de/themen/familie/rushhour-des-lebens.html',
  },
  {
    title: 'Mental Load – Organisieren bis zum Limit',
    org: 'ZDF 37° Leben',
    text: 'Die Reportage macht sichtbar, wie unsichtbare Alltagskoordination zur dauerhaften Belastung wird.',
    href: 'https://www.zdf.de/video/reportagen/37-grad-leben-102/mental-load---organisieren-bis-zum-limit-102',
  },
] as const;

const relevanceItems = [
  'Einkommensentwicklung',
  'Karrierechancen',
  'Teilzeitquoten',
  'Rentenansprüche',
  'Gesundheit und Erschöpfung',
] as const;

const mediaLinks = [
  {
    title: 'Tagesspiegel zur WSI-Untersuchung',
    href: 'https://www.tagesspiegel.de/gesellschaft/studie-zu-mental-load-frauen-ubernehmen-familienorganisation--auch-wenn-sie-vollzeit-arbeiten-10311055.html',
  },
  {
    title: 'Deutschlandfunk zur gleichen Untersuchung',
    href: 'https://www.deutschlandfunk.de/frauen-uebernehmen-auch-bei-vollzeitjob-zumeist-die-alltagsorganisation-in-familien-100.html',
  },
] as const;

export default function MentalLoadPage() {
  return (
    <>
      <PageHero
        badge="Mental Load"
        title="Mental Load in Deutschland sichtbar machen"
        subtitle="Mental Load beschreibt die unsichtbare Kopfarbeit im Alltag: planen, erinnern, koordinieren, vorausdenken. Genau diese Gesamtverantwortung liegt in Familien oft dauerhaft bei einer Person."
      />

      <SectionWrapper>
        <div className="mental-load-layout">
          <article className="mental-load-quote-card">
            <p className="mental-load-quote-mark">„</p>
            <p className="mental-load-quote-text">
              Ich nehme eine Windel und denke mir, haben wir noch genug? Wann ist die nächste Größe fällig.
              {' '}Er nimmt die Windel und ... fertig.
            </p>
            <p className="mental-load-quote-source">
              Aus der ZDF-Reportage <strong>„37° Leben: Mental Load – Organisieren bis zum Limit“</strong> vom 07.04.2024
            </p>
            <a
              href="https://www.zdf.de/video/reportagen/37-grad-leben-102/mental-load---organisieren-bis-zum-limit-102"
              target="_blank"
              rel="noreferrer"
              className="button primary"
              style={{ width: 'fit-content' }}
            >
              Zur ZDF-Reportage
            </a>
          </article>

          <div className="mental-load-intro-grid">
            <article className="card stack">
              <h2 className="card-title">Was Mental Load bedeutet</h2>
              <p className="card-description">
                Wer plant den Einkauf? Wer denkt an Arzttermine? Wer behält Kita-Schließzeiten im Blick?
                {' '}Wer merkt, dass die nächste Windelgröße fällig ist? Diese Planungs- und Steuerungsarbeit läuft im Hintergrund.
                {' '}Meist bei einer Person.
              </p>
            </article>

            <article className="card stack">
              <h2 className="card-title">Warum das relevant ist</h2>
              <p className="card-description">
                Die Datenlage in Deutschland ist klar: Es geht nicht nur um einzelne Aufgaben, sondern um Gesamtverantwortung.
                {' '}Wer im Alltag dauerhaft den Überblick trägt, trägt oft auch die größere Erschöpfung.
              </p>
              <div className="mental-load-pill-list">
                {relevanceItems.map((item) => (
                  <span key={item} className="option-chip selected">{item}</span>
                ))}
              </div>
            </article>
          </div>

          <section className="mental-load-data-section">
            <div className="mental-load-section-head">
              <h2 className="section-title">Definition und Datenlage in Deutschland</h2>
              <p className="section-description">
                Die wichtigsten Zahlen aus amtlicher Statistik, Forschung und politischer Einordnung zeigen dieselbe Richtung:
                {' '}Care-Arbeit und mentale Koordination sind strukturell ungleich verteilt.
              </p>
            </div>
            <div className="mental-load-stat-grid">
              {keyFigures.map((item) => (
                <article key={item.title} className="mental-load-stat-card">
                  <div className="mental-load-stat-value">{item.value}</div>
                  <h3 className="card-title" style={{ marginBottom: 8 }}>{item.title}</h3>
                  <p className="card-description">{item.text}</p>
                  <p className="mental-load-stat-source">{item.source}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mental-load-analysis-grid">
            <article className="card stack">
              <h2 className="card-title">Politische Einordnung</h2>
              <p className="card-description">
                Der Gleichstellungsbericht der Bundesregierung zeigt, welche langfristigen Folgen eine ungleiche Verteilung von Care-Arbeit hat:
                weniger Einkommen, häufigere Reduktion von Erwerbsarbeitszeit und geringere Alterssicherung.
              </p>
              <p className="card-description" style={{ marginTop: 0 }}>
                Das DJI beschreibt besonders Familien mit kleinen Kindern als Phase hoher Verdichtung.
                Genau dort steigt Mental Load besonders stark.
              </p>
            </article>

            <article className="card stack">
              <h2 className="card-title">Mediale Einordnung</h2>
              <p className="card-description">
                Die ZDF-Doku macht das Thema emotional greifbar. Tagesspiegel und Deutschlandfunk greifen die WSI-Ergebnisse auf und
                zeigen denselben Kern: Selbst bei Vollzeitbeschäftigung bleibt die Alltagsorganisation häufig bei Frauen.
              </p>
              <div className="stack" style={{ gap: 10 }}>
                {mediaLinks.map((item) => (
                  <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="mental-load-link-card">
                    <strong>{item.title}</strong>
                    <span>Quelle öffnen</span>
                  </a>
                ))}
              </div>
            </article>
          </section>

          <section className="mental-load-source-section">
            <div className="mental-load-section-head">
              <h2 className="section-title">Quellen zum Weiterlesen</h2>
              <p className="section-description">
                Wenn du das Thema prüfen oder als Gesprächsanlass in eurer Familie nutzen willst, starte mit diesen Originalquellen.
              </p>
            </div>
            <div className="mental-load-source-grid">
              {sources.map((source) => (
                <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="mental-load-source-card">
                  <span className="mental-load-source-org">{source.org}</span>
                  <h3 className="card-title" style={{ marginBottom: 8 }}>{source.title}</h3>
                  <p className="card-description">{source.text}</p>
                  <span className="mental-load-source-cta">Original öffnen</span>
                </a>
              ))}
            </div>
          </section>

          <article className="mental-load-conclusion-card">
            <div className="mental-load-conclusion-copy">
              <span className="badge">Fazit</span>
              <h2 className="section-title">Mental Load ist empirisch belegt</h2>
              <p className="section-description">
                Die Datenlage in Deutschland ist klar. Wer gerechter verteilen will, muss zuerst sichtbar machen,
                wer im Alltag den Überblick trägt. Genau dafür kann ein strukturierter Mental-Load-Test ein guter Anfang sein.
              </p>
            </div>
          </article>
        </div>
      </SectionWrapper>
    </>
  );
}
