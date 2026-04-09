import type { LocalizedText, LocalizedTextList } from '@/types/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';

export interface OwnershipTemplateSeedItem {
  title: LocalizedText;
  details: LocalizedTextList;
  filterTags?: string[];
}

interface OwnershipTemplateSourceItem {
  title: string;
  details: string[];
  filterTags?: string[];
}

const sameAllLocales = (value: string): LocalizedText => ({ de: value, en: value, nl: value });

function item(title: string, details: string[], filterTags?: string[]): OwnershipTemplateSourceItem {
  return { title, details, filterTags };
}

function toSeedItem(entry: OwnershipTemplateSourceItem): OwnershipTemplateSeedItem {
  return {
    title: sameAllLocales(entry.title),
    details: { de: entry.details, en: [], nl: [] },
    filterTags: entry.filterTags,
  };
}

const externalCareAddons: Record<QuizCategory, OwnershipTemplateSourceItem[]> = {
  betreuung_entwicklung: [
    item('Kita-Kommunikation im Blick behalten', ['Elterninfos, Rückmeldungen, Aushänge, Nachrichten und wichtige Absprachen mit der Kita nachhalten.'], ['externalCare:kita']),
    item('Eingewöhnung und Gruppenalltag begleiten', ['Eingewöhnung, Gruppenwechsel, Bezugspersonen und die Frage, wie das Kind dort zurechtkommt, im Blick behalten.'], ['externalCare:kita']),
    item('Kita-Termine und besondere Tage nachhalten', ['Elternabend, Feste, Ausflüge, Fototage oder Schließtage rechtzeitig mitdenken.'], ['externalCare:kita']),
    item('Absprachen mit der Tagespflege im Blick behalten', ['Zeiten, Gewohnheiten, Rückmeldungen und wichtige Änderungen laufend abstimmen.'], ['externalCare:tagespflege']),
    item('Eingewöhnung und Tagesablauf begleiten', ['Im Blick behalten, wie das Kind in der Betreuung ankommt und wie gut der Ablauf dort passt.'], ['externalCare:tagespflege']),
    item('Rückmeldungen aus der Betreuung nachhalten', ['Schlaf, Essen, Stimmung, Entwicklung oder besondere Vorkommnisse aufmerksam mitverfolgen.'], ['externalCare:tagespflege']),
    item('Betreuung durch Familie abstimmen', ['Zeiten, Verfügbarkeit, Erwartungen und Zuständigkeiten mit Großeltern oder Familie klar abstimmen.'], ['externalCare:familie']),
    item('Gewohnheiten und Absprachen weitergeben', ['Schlaf, Essen, Routinen, Regeln oder Besonderheiten klar erklären und aktuell halten.'], ['externalCare:familie']),
    item('Rückmeldungen aus der Familienbetreuung im Blick behalten', ['Mitdenken, was gut läuft, wo es Reibung gibt und was angepasst werden sollte.'], ['externalCare:familie']),
    item('Betreuungseinsätze planen und abstimmen', ['Zeiten, Anlässe, Verfügbarkeit und Änderungen bei Babysitter oder Nanny im Blick behalten.'], ['externalCare:babysitter']),
    item('Wichtige Abläufe und Routinen weitergeben', ['Schlaf, Essen, Beruhigung, Regeln und typische Abläufe klar erklären und aktuell halten.'], ['externalCare:babysitter']),
    item('Rückmeldungen aus der Betreuung nachhalten', ['Beobachtungen, Fragen, Unsicherheiten oder Veränderungen verlässlich aufnehmen und mitdenken.'], ['externalCare:babysitter']),
  ],
  babyalltag_pflege: [
    item('Kita-Tasche und Mitgebsachen vorbereiten', ['Wechselkleidung, Brotdose, Trinkflasche, Hausschuhe, Schlafsachen oder besondere Dinge vollständig mitdenken.'], ['externalCare:kita']),
    item('Bring- und Abholabläufe organisieren', ['Zeiten, Übergaben, spontane Änderungen und Vertretungen im Alltag abstimmen.'], ['externalCare:kita']),
    item('Tagesbedarf und Tasche vorbereiten', ['Essen, Wechselkleidung, Schlafsachen, Pflegeprodukte und persönliche Dinge vollständig mitdenken.'], ['externalCare:tagespflege']),
    item('Bring- und Abholzeiten organisieren', ['Zeiten, Wege, Übergaben und kurzfristige Änderungen verlässlich abstimmen.'], ['externalCare:tagespflege']),
    item('Mitgebsachen für Betreuung bei Familie vorbereiten', ['Essen, Kleidung, Schlafsachen, Medikamente oder andere wichtige Dinge vollständig mitgeben.'], ['externalCare:familie']),
    item('Bring-, Abhol- und Übergabelogik organisieren', ['Wer bringt, wer holt und wie spontane Änderungen laufen, verlässlich abstimmen.'], ['externalCare:familie']),
    item('Einsatz praktisch vorbereiten', ['Essen, Schlafsachen, Kontaktinfos, Notfallinfos und alles Wichtige für den Einsatz vollständig vorbereiten.'], ['externalCare:babysitter']),
    item('Betreuungsbedarf im Alltag vorausplanen', ['Rechtzeitig mitdenken, wann Betreuung gebraucht wird und wie sie zum Tagesablauf passt.'], ['externalCare:babysitter']),
  ],
  gesundheit: [
    item('Gesundheitsinfos an die Kita weitergeben', ['Allergien, Medikamente, Besonderheiten oder Krankmeldungen klar weitergeben und aktuell halten.'], ['externalCare:kita']),
    item('Gesundheitliche Besonderheiten weitergeben', ['Medikamente, Allergien, Krankheitssymptome oder wichtige Hinweise klar weitergeben und aktuell halten.'], ['externalCare:tagespflege']),
    item('Gesundheitsinfos für Familie aktuell halten', ['Allergien, Medikamente, Krankheit oder wichtige Hinweise verständlich weitergeben.'], ['externalCare:familie']),
    item('Notfall- und Gesundheitsinfos griffbereit halten', ['Medikamente, Allergien, wichtige Nummern und gesundheitliche Hinweise klar verfügbar machen.'], ['externalCare:babysitter']),
  ],
  haushalt_einkaeufe_vorraete: [
    item('Kita-Ausstattung vollständig halten', ['Hausschuhe, Wechselwäsche, Matschsachen, Brotdosen oder andere Kita-Sachen rechtzeitig ergänzen und ersetzen.'], ['externalCare:kita']),
    item('Kita-Ausfälle und Schließzeiten auffangen', ['Ferien, Krankheit, Eingewöhnung oder kurzfristige Schließungen frühzeitig mitdenken und absichern.'], ['externalCare:kita']),
    item('Sachen für die Tagespflege verfügbar halten', ['Wechselkleidung, Pflegeprodukte, Essen, Trinksachen oder Schlafsachen rechtzeitig ergänzen.'], ['externalCare:tagespflege']),
    item('Ausfall und Vertretung mitdenken', ['Urlaub, Krankheit oder Änderungen in der Betreuung rechtzeitig auffangen.'], ['externalCare:tagespflege']),
    item('Sachen für Betreuung bei Familie verfügbar halten', ['Wechselkleidung, Essen, Pflegeprodukte oder andere benötigte Dinge rechtzeitig bereithalten.'], ['externalCare:familie']),
    item('Ausfälle und Alternativen mitdenken', ['Absagen, Überforderung oder spontane Änderungen rechtzeitig auffangen.'], ['externalCare:familie']),
    item('Betreuungsausstattung vollständig halten', ['Snacks, Pflegeprodukte, Schlafsachen, Beschäftigungssachen oder andere benötigte Dinge rechtzeitig bereithalten.'], ['externalCare:babysitter']),
    item('Ausfälle und Ersatzlösungen absichern', ['Kurzfristige Absagen oder Änderungen rechtzeitig auffangen und Alternativen mitdenken.'], ['externalCare:babysitter']),
  ],
};

function mergeWithExternalCare(base: Record<QuizCategory, OwnershipTemplateSourceItem[]>) {
  return {
    betreuung_entwicklung: [...base.betreuung_entwicklung, ...externalCareAddons.betreuung_entwicklung],
    gesundheit: [...base.gesundheit, ...externalCareAddons.gesundheit],
    babyalltag_pflege: [...base.babyalltag_pflege, ...externalCareAddons.babyalltag_pflege],
    haushalt_einkaeufe_vorraete: [...base.haushalt_einkaeufe_vorraete, ...externalCareAddons.haushalt_einkaeufe_vorraete],
  } satisfies Record<QuizCategory, OwnershipTemplateSourceItem[]>;
}

// Bestehende Schlüssel bleiben erhalten: `6_10` trägt die Inhalte für 6–12 und `10_plus` die Inhalte für 12–18.
const rawSeedContent: Record<AgeGroup, Record<QuizCategory, OwnershipTemplateSourceItem[]>> = {
  '0_1': mergeWithExternalCare({
    betreuung_entwicklung: [
      item('Schlafrhythmus im Blick behalten', ['Schlafenszeiten, Wachphasen und Müdigkeitssignale mitdenken und den Tag danach ausrichten.']),
      item('Beschäftigung und Anregung planen', ['Spielideen, Vorlesen, Singen und passende Anregung für den Tag mitdenken.']),
      item('Ausflüge und Besuche passend planen', ['Spaziergänge, Besuche und kleine Unternehmungen so planen, dass sie zum Rhythmus des Babys passen.']),
      item('Beruhigungswege kennen und vorbereiten', ['Im Blick behalten, was bei Unruhe, Weinen oder Überforderung hilft und was dafür griffbereit sein muss.']),
      item('Entwicklungsschritte mitverfolgen', ['Neue Fortschritte wahrnehmen, Veränderungen einordnen und überlegen, was als Nächstes gut passt.']),
    ],
    gesundheit: [
      item('Vorsorge und Impftermine nachhalten', ['U-Termine, Impfungen und empfohlene Untersuchungen rechtzeitig im Blick behalten und vorbereiten.']),
      item('Krankheitssymptome einschätzen', ['Fieber, Husten, Haut, Verdauung oder auffälliges Verhalten beobachten und bewerten.']),
      item('Medikamente und Hausapotheke im Griff haben', ['Im Blick behalten, was vorhanden ist, was fehlt und was wann gegeben wurde.']),
      item('Arztbesuche vorbereiten', ['Unterlagen, Fragen, Versicherungskarte und passende Terminzeiten mitdenken.']),
      item('Gesundheitsunterlagen griffbereit halten', ['Impfpass, U-Heft und wichtige Infos so organisieren, dass sie schnell verfügbar sind.']),
    ],
    babyalltag_pflege: [
      item('Mahlzeiten und Füttern steuern', ['Im Blick behalten, wann das Baby essen sollte und was dafür vorbereitet sein muss.']),
      item('Wickeln und Hautpflege nachhalten', ['Windeln, Wickelzeiten, Hautzustand und nötige Pflegeprodukte im Blick behalten.']),
      item('Baden, Nägel und Körperpflege einplanen', ['Regelmäßige Pflegeaufgaben rechtzeitig mitdenken und vorbereiten.']),
      item('Kleidung passend bereithalten', ['Für Tag, Nacht, Wetter und unterwegs passende Kleidung im Blick behalten.']),
      item('Tagesabläufe rund ums Baby abstimmen', ['Füttern, Wickeln, Schlafen und Losgehen im Alltag sinnvoll aufeinander abstimmen.']),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Windeln und Pflegevorräte sichern', ['Windeln, Feuchttücher, Creme und Pflegeprodukte rechtzeitig nachkaufen und verfügbar halten.']),
      item('Babywäsche organisieren', ['Bodys, Schlafsäcke, Spucktücher und Handtücher sauber und griffbereit halten.']),
      item('Flaschen und Essenszubehör bereithalten', ['Flaschen, Sauger, Lätzchen und Zubehör reinigen, prüfen und vollständig verfügbar halten.']),
      item('Babynahrung und Vorräte planen', ['Milch, Beikost, Snacks und wichtige Grundvorräte rechtzeitig im Haus haben.']),
      item('Ausstattung und Saisonbedarf im Blick behalten', ['Fehlende, kaputte oder unpassende Dinge sowie wetterabhängige Ausstattung rechtzeitig ersetzen.']),
    ],
  }),
  '1_3': mergeWithExternalCare({
    betreuung_entwicklung: [
      item('Schlaf, Pausen und Tagesablauf planen', ['Im Blick behalten, wann das Kind Ruhe, Schlaf oder einen ruhigeren Tag braucht.']),
      item('Spielideen und Beschäftigung auswählen', ['Passende Bücher, Spiele, Sprache und Beschäftigung für den Tag mitdenken.']),
      item('Bewegung und sicheres Ausprobieren ermöglichen', ['Klettern, Laufen, Toben und passende Bewegungsmöglichkeiten im Alltag mitdenken.']),
      item('Selbstständigkeit im Alltag einüben', ['Selber essen, anziehen, mithelfen und kleine Alltagsschritte bewusst aufbauen.']),
      item('Übergänge im Alltag vorbereiten', ['Losgehen, aufhören, heimkommen, schlafen oder umziehen so begleiten, dass es gut klappt.']),
    ],
    gesundheit: [
      item('Vorsorge, Impfungen und Zahnarzttermine nachhalten', ['Gesundheitstermine rechtzeitig planen, erinnern und vorbereiten.']),
      item('Krankheit und Beschwerden einschätzen', ['Fieber, Husten, Zahnung, Magen-Darm oder Hautthemen beobachten und einordnen.']),
      item('Medikamente und Hausmittel im Blick behalten', ['Verfügbarkeit, Anwendung und Nachkauf verlässlich nachhalten.']),
      item('Arztbesuche organisatorisch vorbereiten', ['Unterlagen, Fragen, Karte und passende Zeitfenster mitdenken.']),
      item('Verträglichkeiten und wiederkehrende Themen verfolgen', ['Reaktionen auf Essen, Pflegeprodukte oder Medikamente im Blick behalten.']),
    ],
    babyalltag_pflege: [
      item('Essen, Snacks und Trinken planen', ['Im Blick behalten, wann das Kind essen oder trinken sollte und was vorbereitet werden muss.']),
      item('Wickeln oder Toilettenübergang begleiten', ['Signale, Wechselwäsche und passende Abläufe im Alltag mitdenken.']),
      item('Körperpflege verlässlich einplanen', ['Baden, Zähneputzen, Haare, Nägel und Hautpflege regelmäßig mitdenken.']),
      item('Kleidung und Wechselkleidung organisieren', ['Für Alltag, Wetter, Betreuung und unterwegs passende Kleidung bereithalten.']),
      item('Alltagstasche und Unterwegs-Bedarf vorbereiten', ['Wechselkleidung, Snacks, Trinkflasche und wichtige Kleinigkeiten vor dem Losgehen mitdenken.']),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Pflegeprodukte und Verbrauchssachen nachkaufen', ['Windeln, Feuchttücher, Creme, Zahnpasta oder andere Alltagssachen rechtzeitig ergänzen.']),
      item('Kinderwäsche und Schlafsachen verfügbar halten', ['Saubere Kleidung, Schlafsachen und Reservekleidung im Blick behalten.']),
      item('Essenszubehör und Trinksachen im Griff haben', ['Becher, Teller, Besteck, Brotdose oder Flaschen reinigen, prüfen und ersetzen.']),
      item('Kindgerechte Lebensmittel bevorraten', ['Snacks, Obst, Getränke und einfache Mahlzeiten so planen, dass nichts fehlt.']),
      item('Saisonkleidung und Außensachen vorbereiten', ['Jacke, Mütze, Sonnenhut, Regenkleidung oder Schuhe rechtzeitig bereithalten.']),
    ],
  }),
  '3_6': mergeWithExternalCare({
    betreuung_entwicklung: [
      item('Nachmittage und freie Zeit planen', ['Im Blick behalten, wie Spielen, Bewegung, Termine und Erholung gut zusammenpassen.']),
      item('Freundschaften und Verabredungen organisieren', ['Verabredungen, Geburtstage, Gruppensituationen und soziale Themen im Blick behalten.']),
      item('Vorschule und Lernanreize mitdenken', ['Vorlesen, Zuhören, Konzentration und kleine Lernimpulse im Alltag bewusst einbauen.']),
      item('Selbstständigkeit im Alltag aufbauen', ['Anziehen, Aufräumen, kleine Aufgaben und Mithelfen verlässlich einüben.']),
      item('Regeln und Tagesabläufe stabil halten', ['Morgen, Heimkommen, Abend und typische Reibungsmomente mit klaren Abläufen steuern.']),
    ],
    gesundheit: [
      item('Vorsorge, Impfungen und Zahnarzt nachhalten', ['Gesundheitstermine planen, vorbereiten und rechtzeitig wahrnehmen.']),
      item('Akute Beschwerden einschätzen', ['Fieber, Husten, Bauchweh, Haut oder Schmerzen beobachten und passend reagieren.']),
      item('Medikamente und Hilfsmittel verfügbar halten', ['Im Blick behalten, was da ist, was fehlt und was nachgekauft werden muss.']),
      item('Arztbesuche und Nachfragen vorbereiten', ['Fragen, Unterlagen und Terminorganisation zuverlässig mitdenken.']),
      item('Wiederkehrende Gesundheitsthemen verfolgen', ['Zahnthemen, Allergien, Haut oder andere Auffälligkeiten über längere Zeit im Blick behalten.']),
    ],
    babyalltag_pflege: [
      item('Mahlzeiten und Trinkroutine steuern', ['Frühstück, Kita-Essen, Snacks und Trinken über den Tag im Blick behalten.']),
      item('Kleidung für Alltag und Wetter auswählen', ['Für Kita, Spielplatz und Wetter passende Kleidung rechtzeitig bereitlegen.']),
      item('Körperpflege und Hygiene nachhalten', ['Zähneputzen, Baden, Haare, Nägel und Toilettenroutine im Alltag absichern.']),
      item('Morgen- und Abendabläufe organisieren', ['Losgehen, Heimkommen, Umziehen und Schlafengehen mit klaren Abläufen steuern.']),
      item('Wechselkleidung und Mitgebsachen vorbereiten', ['Für Kita, Ausflug oder Sport passende Sachen vollständig mitdenken.']),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Kita-Kleidung und Reservewäsche verfügbar halten', ['Saubere Kleidung, Unterwäsche, Schlafsachen und Wechselkleidung im Blick behalten.']),
      item('Brotdosen, Trinkflaschen und Rucksäcke einsatzbereit halten', ['Reinigen, auffüllen und fehlende Dinge rechtzeitig ersetzen.']),
      item('Kindgerechte Lebensmittel und Snacks bevorraten', ['Für Kita, Zuhause und Ausflüge genug Passendes im Haus haben.']),
      item('Bastel-, Spiel- und Beschäftigungsmaterial ergänzen', ['Stifte, Papier, Bücher und kleine Spielsachen rechtzeitig nachfüllen.']),
      item('Saisonbedarf und Außensachen im Blick behalten', ['Regenzeug, Hausschuhe, Badesachen, Mütze oder Handschuhe passend bereithalten.']),
    ],
  }),
  '6_10': mergeWithExternalCare({
    betreuung_entwicklung: [
      item('Schule und Lernen organisieren', ['Hausaufgaben, Tests, Lernzeiten und passende Unterstützung im Blick behalten.']),
      item('Freundschaften und Verabredungen im Blick behalten', ['Wissen, was sozial läuft, was abgestimmt werden muss und wo Begleitung nötig ist.']),
      item('Hobbys und Wochenstruktur koordinieren', ['Vereine, Aktivitäten, freie Zeit und Erholung im Wochenablauf sinnvoll abstimmen.']),
      item('Medienregeln und Gerätezeiten steuern', ['Absprachen, Zeiten und Umgang mit Handy, Tablet, Konsole oder TV im Blick behalten.']),
      item('Selbstständigkeit im Alltag ausbauen', ['Tasche packen, Dinge selbst organisieren und Verantwortung Schritt für Schritt übergeben.']),
    ],
    gesundheit: [
      item('Vorsorge, Zahnarzt und Impfungen nachhalten', ['Gesundheitstermine rechtzeitig planen, prüfen und vorbereiten.']),
      item('Beschwerden und Krankheitsverlauf beobachten', ['Fieber, Bauchweh, Kopfschmerzen, Haut oder andere Beschwerden einschätzen und nachverfolgen.']),
      item('Medikamente und Hausapotheke im Griff behalten', ['Bestände, Dosierungen und Anwendung verlässlich nachhalten.']),
      item('Sport, Belastung und Erholung mitdenken', ['Im Blick behalten, wann das Kind fit ist, Ruhe braucht oder körperlich überlastet wirkt.']),
      item('Gesundheitsunterlagen und Atteste organisieren', ['Impfstatus, Nachweise, Unterlagen oder Bescheinigungen griffbereit halten.']),
    ],
    babyalltag_pflege: [
      item('Mahlzeiten und Schulversorgung steuern', ['Frühstück, Brotdose, Snacks und Trinken für Schule und Freizeit im Blick behalten.']),
      item('Kleidung für Schule, Sport und Wetter organisieren', ['Passende Kleidung und Ausrüstung rechtzeitig bereithalten.']),
      item('Hygiene und Körperpflege begleiten', ['Duschen, Zähne, Haare, Nägel und gepflegte Routinen im Blick behalten.']),
      item('Morgen- und Abendroutine stabil halten', ['Losgehen, Heimkommen, Hausaufgaben und Schlafenszeit verlässlich strukturieren.']),
      item('Sport- und Schulsachen vollständig halten', ['Im Blick behalten, was eingepackt, ersetzt oder ergänzt werden muss.']),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Schulmaterial rechtzeitig ergänzen', ['Hefte, Stifte, Bastelsachen und Verbrauchsmaterial im Blick behalten.']),
      item('Kleidung, Unterwäsche und Sportsachen verfügbar halten', ['Sauber, passend und einsatzbereit organisieren.']),
      item('Brotdose, Trinkflasche und Alltagsmaterial pflegen', ['Reinigen, auffüllen und ersetzen, wenn etwas fehlt oder kaputt ist.']),
      item('Hobby- und Sportbedarf im Griff haben', ['Ausrüstung, Kleidung oder Zubehör rechtzeitig beschaffen.']),
      item('Snacks und Vorräte für Schulwoche planen', ['So einkaufen, dass morgens und nachmittags alles da ist.']),
    ],
  }),
  '10_plus': mergeWithExternalCare({
    betreuung_entwicklung: [
      item('Schule, Lernen und Prüfungen im Blick behalten', ['Prüfungen, Abgaben, Lernphasen und schulische Belastung rechtzeitig mitdenken.']),
      item('Praktika, Bewerbungen und Zukunftsschritte organisieren', ['Fristen, Unterlagen, Gespräche und nächste Schritte frühzeitig im Blick behalten.']),
      item('Mediennutzung und Tagesstruktur steuern', ['Gerätenutzung, Schlaf, Erreichbarkeit und Tagesrhythmus im Blick behalten.']),
      item('Selbstständigkeit und Eigenverantwortung übergeben', ['Mehr Verantwortung abgeben und trotzdem wichtige Themen weiter nachhalten.']),
      item('Gesprächsbedarf und Überforderung früh merken', ['Im Blick behalten, wann Rückzug, Druck oder Überforderung zunehmen und Gespräch nötig wird.']),
    ],
    gesundheit: [
      item('Vorsorge, Zahnarzt und Impfungen nachhalten', ['Wichtige Gesundheitstermine auch im Jugendalter verlässlich im Blick behalten.']),
      item('Beschwerden und Warnzeichen beobachten', ['Körperliche und psychische Auffälligkeiten früh erkennen und einordnen.']),
      item('Medikamente und gesundheitliche Selbstverantwortung begleiten', ['Nachhalten, was da ist, wie es genommen wird und wo noch Unterstützung nötig ist.']),
      item('Schlaf, Stress und Erholung im Blick behalten', ['Erkennen, wenn Belastung zu hoch wird oder Routinen kippen.']),
      item('Gesundheitsunterlagen und Nachweise organisieren', ['Impfstatus, Atteste, Versicherungsthemen und wichtige Unterlagen griffbereit halten.']),
    ],
    babyalltag_pflege: [
      item('Essen, Trinken und Tagesstruktur im Blick behalten', ['Auch bei mehr Eigenständigkeit wahrnehmen, wenn Grundroutinen wegrutschen.']),
      item('Schlafrhythmus und Morgenstart stabilisieren', ['Schulalltag, Schlaf und Erholung so mitdenken, dass es nicht kippt.']),
      item('Kleidung, Ausrüstung und besondere Anlässe organisieren', ['Alltag, Schule, Sport, Events oder Praktika passend vorbereiten.']),
      item('Hygiene, Wäsche und Grundpflege im Blick behalten', ['Nicht alles übernehmen, aber aufmerksam bleiben, wo Routinen wegbrechen.']),
      item('Prüfungsphasen im Alltag absichern', ['Ruhe, Essen, Zeitfenster und praktische Entlastung in stressigen Phasen mitdenken.']),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Kleidung und Saisonbedarf rechtzeitig erneuern', ['Alltag, Sport, Schule und Wetter passend ausstatten.']),
      item('Schul- und Lernmaterial verfügbar halten', ['Hefte, Technik, Zubehör und Verbrauchssachen rechtzeitig ergänzen.']),
      item('Sport-, Hobby- und Freizeitausrüstung im Blick behalten', ['Fehlendes, Unpassendes oder Defektes früh erkennen und ersetzen.']),
      item('Snacks, Schulverpflegung und Alltagsbedarf planen', ['So einkaufen, dass im Alltag genug da ist.']),
      item('Prüfungs-, Reise- oder Praktikumsbedarf vorbereiten', ['Unterlagen, Kleidung, Material und Besonderheiten rechtzeitig beschaffen.']),
    ],
  }),
};

export const ownershipTaskPackageSeedByAgeGroup: Partial<Record<AgeGroup, Record<QuizCategory, OwnershipTemplateSeedItem[]>>> =
  Object.fromEntries(
    Object.entries(rawSeedContent).map(([ageGroup, categories]) => [
      ageGroup,
      Object.fromEntries(
        Object.entries(categories).map(([categoryKey, items]) => [
          categoryKey,
          items.map(toSeedItem),
        ]),
      ),
    ]),
  ) as Partial<Record<AgeGroup, Record<QuizCategory, OwnershipTemplateSeedItem[]>>>;
