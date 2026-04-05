import type { LocalizedText } from '@/types/i18n';
import type { QuizCategory } from '@/types/quiz';

export interface OwnershipTemplateSeedItem {
  title: LocalizedText;
  note: LocalizedText;
}

const sameAllLocales = (value: string): LocalizedText => ({ de: value, en: value, nl: value });

function item(title: string, note: string): OwnershipTemplateSeedItem {
  return {
    title: sameAllLocales(title),
    note: sameAllLocales(note),
  };
}

export const ownershipTaskPackageSeed: Record<QuizCategory, OwnershipTemplateSeedItem[]> = {
  betreuung_entwicklung: [
    item('Entwicklung im Blick behalten und passende nächste Schritte mitdenken', 'Dazu gehört, Entwicklungsschritte wahrzunehmen, Veränderungen früh zu erkennen, Fragen einzuordnen und passende nächste Schritte im Alltag mitzudenken.'),
    item('Spiel, Förderung und altersgerechte Anregung planen und umsetzen', 'Dazu gehört, passende Spielideen auszuwählen, Materialien bereitzulegen und dem Baby regelmäßig gute Entwicklungsanreize zu geben.'),
    item('Betreuung planen und Veränderungen begleiten', 'Dazu gehört, Betreuungslösungen mitzudenken, Optionen zu prüfen, Unterlagen vorzubereiten, Starts zu organisieren und Übergänge wie Eingewöhnung oder Wechsel gut zu begleiten.'),
    item('Tagesrhythmus und Routinen passend zur Entwicklung gestalten', 'Dazu gehört, Veränderungen bei Schlaf, Wachphasen, Aktivität und Bedürfnissen früh mitzudenken und Routinen entsprechend anzupassen.'),
    item('Essenlernen und Ernährungsentwicklung begleiten', 'Dazu gehört, den richtigen Zeitpunkt für Veränderungen mitzudenken, neue Lebensmittel einzuführen und die Entwicklung rund ums Essen passend zu begleiten.'),
    item('Neue Entwicklungsphasen und Übergänge vorausschauend vorbereiten', 'Dazu gehört, Phasen wie mehr Mobilität, stärkere Eigenständigkeit, Fremdeln oder veränderte Bedürfnisse rechtzeitig mitzudenken.'),
    item('Soziale Kontakte und gemeinsame Aktivitäten für das Baby mitgestalten', 'Dazu gehört, Treffen, Kurse, Spielgruppen oder andere passende Aktivitäten auszuwählen, zu planen und alltagstauglich vorzubereiten.'),
    item('Auffälligkeiten oder besondere Entwicklungsthemen beobachten und nachhalten', 'Dazu gehört, Unsicherheiten oder Auffälligkeiten ernst zu nehmen, Beobachtungen festzuhalten und bei Bedarf nächste Schritte vorzubereiten.'),
    item('Wissen und Orientierung rund um Entwicklung aktiv einholen', 'Dazu gehört, Fragen zu recherchieren, Informationen einzuordnen und hilfreiche Quellen oder Ansprechpartner mitzudenken.'),
    item('Entwicklungsbezogene Entscheidungen im Alltag vorbereiten und abstimmen', 'Dazu gehört, abzuwägen, was gerade passt, Entscheidungen vorzubereiten und wichtige Entwicklungsthemen gemeinsam tragfähig zu besprechen.'),
  ],
  gesundheit: [
    item('Gesundheitstermine planen und begleiten', 'Dazu gehört, Vorsorgen, Untersuchungen und andere Gesundheitstermine im Blick zu behalten, zu organisieren und zu begleiten.'),
    item('Vorsorge, Impfungen und Gesundheitsfristen nachhalten', 'Dazu gehört, Empfehlungen, Zeitpunkte und Fristen im Blick zu behalten, Unterlagen bereitzuhalten und nächste Schritte rechtzeitig einzuplanen.'),
    item('Gesundheitssymptome beobachten und passende Reaktionen vorbereiten', 'Dazu gehört, Veränderungen oder Beschwerden wahrzunehmen, einzuordnen und angemessen darauf zu reagieren.'),
    item('Medikamente und Gesundheitsbedarf prüfen und verfügbar halten', 'Dazu gehört, Vorräte zu prüfen, fehlende Mittel zu besorgen, Haltbarkeit mitzudenken und wichtige Dinge griffbereit zu haben.'),
    item('Hausapotheke und gesundheitliche Grundausstattung organisieren', 'Dazu gehört, wichtige Produkte vollständig und alltagstauglich verfügbar zu halten und rechtzeitig nachzukaufen.'),
    item('Gesundheitsthemen recherchieren und Entscheidungen vorbereiten', 'Dazu gehört, Informationen einzuordnen, Unsicherheiten zu klären und gute nächste Schritte rund um Gesundheit vorzubereiten.'),
    item('Besondere Gesundheitsthemen im Alltag berücksichtigen', 'Dazu gehört, Allergien, Unverträglichkeiten, empfindliche Haut oder andere Besonderheiten wahrzunehmen und im Alltag mitzudenken.'),
    item('Notfälle und Ausnahmesituationen gesundheitlich vorbereiten', 'Dazu gehört, wichtige Kontakte, Abläufe, Informationen und Materialien so vorzuhalten, dass im Ernstfall schnell gehandelt werden kann.'),
    item('Körperliche Entwicklung und gesundheitliche Pflege begleiten', 'Dazu gehört, Themen wie Zahnen, Haut, Bewegung oder andere körperliche Veränderungen früh mitzudenken und passend zu begleiten.'),
    item('Gesundheitsunterlagen und medizinische Informationen geordnet halten', 'Dazu gehört, U-Heft, Impfpass, Arztinformationen, Rezepte oder Befunde übersichtlich und verfügbar aufzubewahren.'),
  ],
  babyalltag_pflege: [
    item('Tägliche Pflege des Babys planen und verlässlich mittragen', 'Dazu gehört, Wickeln, Waschen, Eincremen und andere Pflegeroutinen im Alltag mitzudenken und zuverlässig zu übernehmen.'),
    item('Kleidung passend mitdenken und nachhalten', 'Dazu gehört, Größen, Wetter, Wechselbedarf und saisonale Veränderungen rechtzeitig mitzudenken und passende Kleidung verfügbar zu halten.'),
    item('Schlafumgebung und schlafbezogene Abläufe gestalten', 'Dazu gehört, Schlafplatz, Schlafkleidung, Temperatur und alltagsnahe Schlafroutinen passend vorzubereiten und anzupassen.'),
    item('Ernährung im Alltag vorbereiten und begleiten', 'Dazu gehört, Stillen, Flasche, Mahlzeiten, Mengen, Hilfsmittel und hygienische Abläufe im Alltag mitzudenken.'),
    item('Unterwegsbedarf für das Baby vorbereiten und verfügbar halten', 'Dazu gehört, Taschen, Wechselkleidung, Nahrung, Pflegeprodukte und andere notwendige Dinge für unterwegs vollständig bereitzuhalten.'),
    item('Körperpflege und besondere Pflegeroutinen abstimmen und umsetzen', 'Dazu gehört, Baden, Nägel, Hautpflege oder andere wiederkehrende Pflegethemen passend vorzubereiten und im Blick zu behalten.'),
    item('Beruhigung, Tragen und Übergänge im Alltag mitgestalten', 'Dazu gehört, passende Strategien, Hilfsmittel und Abläufe für unruhige Phasen, Übergänge und emotionale Regulation mitzudenken.'),
    item('Aufenthalts- und Spielbereiche alltagstauglich halten', 'Dazu gehört, sichere, saubere und passende Bereiche für Pflege, Spiel und Tagesablauf vorzubereiten und nutzbar zu halten.'),
    item('Pflege- und Alltagsmaterialien rechtzeitig prüfen und ersetzen', 'Dazu gehört, Windeln, Feuchttücher, Pflegeprodukte und andere laufend benötigte Dinge regelmäßig zu prüfen und nachzukaufen.'),
    item('Wiederkehrende Babyroutinen im Alltag abstimmen und stabil halten', 'Dazu gehört, wiederkehrende Abläufe rund um Pflege, Schlaf, Essen und Übergänge gemeinsam tragfähig zu gestalten und anzupassen.'),
  ],
  haushalt_einkaeufe_vorraete: [
    item('Babybezogene Vorräte im Blick behalten und rechtzeitig ergänzen', 'Dazu gehört, Windeln, Pflegeartikel, Nahrung und andere regelmäßig benötigte Dinge rechtzeitig zu prüfen und nachzukaufen.'),
    item('Einkäufe für den Familienalltag planen und organisieren', 'Dazu gehört, Bedarfe zu sammeln, Einkäufe vorzubereiten und Engpässe im Alltag früh mitzudenken.'),
    item('Alltagsversorgung der Familie mit Baby mitplanen', 'Dazu gehört, Essen, Getränke, Snacks und praktische Grundversorgung so mitzudenken, dass der Alltag gut funktioniert.'),
    item('Wäsche rund um Baby und Familie nachhalten', 'Dazu gehört, Waschbedarf zu erkennen, Kleidung, Textilien und Schlafsachen rechtzeitig sauber und verfügbar zu halten.'),
    item('Babysachen geordnet, passend und einsatzbereit halten', 'Dazu gehört, wichtige Dinge auffindbar, nutzbar und passend sortiert zu halten und bei Bedarf neu zu ordnen.'),
    item('Wachsende und saisonale Bedarfe frühzeitig vorbereiten', 'Dazu gehört, neue Größen, wetterpassende Ausstattung oder veränderte Alltagsbedarfe rechtzeitig mitzudenken.'),
    item('Verbrauchsprodukte im Haushalt im Blick behalten', 'Dazu gehört, auch über den Babybereich hinaus wichtige Haushaltsmaterialien rechtzeitig zu prüfen und zu ergänzen.'),
    item('Unterwegs- und Reisebedarf praktisch vorbereiten', 'Dazu gehört, Ausflüge, Besuche oder Reisen mit allem Nötigen so vorzubereiten, dass Versorgung und Alltag gut funktionieren.'),
    item('Größere Anschaffungen für Baby und Familie auswählen und organisieren', 'Dazu gehört, Bedarf zu erkennen, Optionen zu vergleichen, Entscheidungen vorzubereiten und Anschaffungen oder Ersatz zu organisieren.'),
    item('Nicht mehr passende Babysachen sortieren, weitergeben oder ersetzen', 'Dazu gehört, zu kleine, unpassende oder nicht mehr benötigte Dinge rechtzeitig auszusortieren, weiterzugeben oder zu ersetzen.'),
  ],
  termine_planung_absprachen: [
    item('Familienkalender und wichtige Termine verlässlich im Blick behalten', 'Dazu gehört, relevante Termine früh zu erfassen, Überschneidungen zu vermeiden und an wichtige Zeitpunkte rechtzeitig zu denken.'),
    item('Gesundheits-, Betreuungs- und Organisationstermine abstimmen', 'Dazu gehört, passende Zeitfenster zu finden, Termine zu koordinieren und Begleitung oder Vorbereitung mitzudenken.'),
    item('Zuständigkeiten im Alltag vorausschauend abstimmen', 'Dazu gehört, klar festzulegen, wer woran denkt, was vorbereitet und was übernimmt.'),
    item('Wochen- und Vorausplanung für Familie und Baby strukturieren', 'Dazu gehört, kommende Termine, Bedarfe, Wege und Engpässe frühzeitig zu ordnen und praktikabel zu planen.'),
    item('Absprachen mit Betreuung, Familie und Bezugspersonen organisieren', 'Dazu gehört, Informationen weiterzugeben, Hilfe abzustimmen und relevante Erwartungen oder Änderungen klar zu kommunizieren.'),
    item('Fristen, Anmeldungen und Unterlagen nachhalten', 'Dazu gehört, Formulare, Rückmeldungen, Anträge oder andere wichtige Fristen rechtzeitig mitzudenken und vorzubereiten.'),
    item('Besuche, Ausflüge und besondere Anlässe vorbereiten', 'Dazu gehört, Bedarf einzuschätzen, Organisatorisches mitzudenken und solche Termine alltagstauglich vorzubereiten.'),
    item('Reisen, Urlaube und längere Ausnahmen mit Baby organisieren', 'Dazu gehört, Unterlagen, Versorgung, Packen und praktische Abläufe frühzeitig und vollständig zu planen.'),
    item('Informationsfluss zwischen den Partnern aktiv sicherstellen', 'Dazu gehört, relevantes Wissen nicht nur zu haben, sondern bewusst weiterzugeben, abzugleichen und transparent zu machen.'),
    item('Regelmäßige Abstimmung zur Ownership einplanen und nachhalten', 'Dazu gehört, immer wieder gemeinsam zu prüfen, ob Zuständigkeiten im Alltag noch passen und ob etwas angepasst werden sollte.'),
  ],
};
