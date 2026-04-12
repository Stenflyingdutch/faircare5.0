import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const CATALOG_COLLECTION = 'catalog_responsibility_cards';
const LANGUAGE = 'de';
const SCRIPT_ACTOR = 'script:seed-responsibility-catalog';
const AGE_GROUPS = ['0-1', '1-3', '3-6', '6-12', '12-18'];
const EXTERNAL_CARE_ORDER = ['kita', 'tagespflege', 'familie', 'babysitter'];

function resolvePrivateKey() {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    return Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  }
  return null;
}

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = resolvePrivateKey();

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  return applicationDefault();
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function chunk(list, size) {
  const items = [];
  for (let index = 0; index < list.length; index += size) {
    items.push(list.slice(index, index + size));
  }
  return items;
}

const standardCards = {
  '0-1': {
    Betreuung: [
      ['Schlafrhythmus im Blick behalten', 'Schlafenszeiten, Wachphasen und Müdigkeitssignale mitdenken und den Tag danach ausrichten.'],
      ['Beschäftigung und Anregung planen', 'Spielideen, Vorlesen, Singen und passende Anregung für den Tag mitdenken.'],
      ['Ausflüge und Besuche passend planen', 'Spaziergänge, Besuche und kleine Unternehmungen so planen, dass sie zum Rhythmus des Babys passen.'],
      ['Beruhigungswege kennen und vorbereiten', 'Im Blick behalten, was bei Unruhe, Weinen oder Überforderung hilft und was dafür griffbereit sein muss.'],
      ['Entwicklungsschritte mitverfolgen', 'Neue Fortschritte wahrnehmen, Veränderungen einordnen und überlegen, was als Nächstes gut passt.'],
    ],
    Gesundheit: [
      ['Vorsorge und Impftermine nachhalten', 'U-Termine, Impfungen und empfohlene Untersuchungen rechtzeitig im Blick behalten und vorbereiten.'],
      ['Krankheitssymptome einschätzen', 'Fieber, Husten, Haut, Verdauung oder auffälliges Verhalten beobachten und bewerten.'],
      ['Medikamente und Hausapotheke im Griff haben', 'Im Blick behalten, was vorhanden ist, was fehlt und was wann gegeben wurde.'],
      ['Arztbesuche vorbereiten', 'Unterlagen, Fragen, Versicherungskarte und passende Terminzeiten mitdenken.'],
      ['Gesundheitsunterlagen griffbereit halten', 'Impfpass, U-Heft und wichtige Infos so organisieren, dass sie schnell verfügbar sind.'],
    ],
    Babyalltag: [
      ['Mahlzeiten und Füttern steuern', 'Im Blick behalten, wann das Baby essen sollte und was dafür vorbereitet sein muss.'],
      ['Wickeln und Hautpflege nachhalten', 'Windeln, Wickelzeiten, Hautzustand und nötige Pflegeprodukte im Blick behalten.'],
      ['Baden, Nägel und Körperpflege einplanen', 'Regelmäßige Pflegeaufgaben rechtzeitig mitdenken und vorbereiten.'],
      ['Kleidung passend bereithalten', 'Für Tag, Nacht, Wetter und unterwegs passende Kleidung im Blick behalten.'],
      ['Tagesabläufe rund ums Baby abstimmen', 'Füttern, Wickeln, Schlafen und Losgehen im Alltag sinnvoll aufeinander abstimmen.'],
    ],
    Haushalt: [
      ['Windeln und Pflegevorräte sichern', 'Windeln, Feuchttücher, Creme und Pflegeprodukte rechtzeitig nachkaufen und verfügbar halten.'],
      ['Babywäsche organisieren', 'Bodys, Schlafsäcke, Spucktücher und Handtücher sauber und griffbereit halten.'],
      ['Flaschen und Essenszubehör bereithalten', 'Flaschen, Sauger, Lätzchen und Zubehör reinigen, prüfen und vollständig verfügbar halten.'],
      ['Babynahrung und Vorräte planen', 'Milch, Beikost, Snacks und wichtige Grundvorräte rechtzeitig im Haus haben.'],
      ['Ausstattung und Saisonbedarf im Blick behalten', 'Fehlende, kaputte oder unpassende Dinge sowie wetterabhängige Ausstattung rechtzeitig ersetzen.'],
    ],
  },
  '1-3': {
    Betreuung: [
      ['Schlaf, Pausen und Tagesablauf planen', 'Im Blick behalten, wann das Kind Ruhe, Schlaf oder einen ruhigeren Tag braucht.'],
      ['Spielideen und Beschäftigung auswählen', 'Passende Bücher, Spiele, Sprache und Beschäftigung für den Tag mitdenken.'],
      ['Bewegung und sicheres Ausprobieren ermöglichen', 'Klettern, Laufen, Toben und passende Bewegungsmöglichkeiten im Alltag mitdenken.'],
      ['Selbstständigkeit im Alltag einüben', 'Selber essen, anziehen, mithelfen und kleine Alltagsschritte bewusst aufbauen.'],
      ['Übergänge im Alltag vorbereiten', 'Losgehen, aufhören, heimkommen, schlafen oder umziehen so begleiten, dass es gut klappt.'],
    ],
    Gesundheit: [
      ['Vorsorge, Impfungen und Zahnarzttermine nachhalten', 'Gesundheitstermine rechtzeitig planen, erinnern und vorbereiten.'],
      ['Krankheit und Beschwerden einschätzen', 'Fieber, Husten, Zahnung, Magen-Darm oder Hautthemen beobachten und einordnen.'],
      ['Medikamente und Hausmittel im Blick behalten', 'Verfügbarkeit, Anwendung und Nachkauf verlässlich nachhalten.'],
      ['Arztbesuche organisatorisch vorbereiten', 'Unterlagen, Fragen, Karte und passende Zeitfenster mitdenken.'],
      ['Verträglichkeiten und wiederkehrende Themen verfolgen', 'Reaktionen auf Essen, Pflegeprodukte oder Medikamente im Blick behalten.'],
    ],
    Alltag: [
      ['Essen, Snacks und Trinken planen', 'Im Blick behalten, wann das Kind essen oder trinken sollte und was vorbereitet werden muss.'],
      ['Wickeln oder Toilettenübergang begleiten', 'Signale, Wechselwäsche und passende Abläufe im Alltag mitdenken.'],
      ['Körperpflege verlässlich einplanen', 'Baden, Zähneputzen, Haare, Nägel und Hautpflege regelmäßig mitdenken.'],
      ['Kleidung und Wechselkleidung organisieren', 'Für Alltag, Wetter, Betreuung und unterwegs passende Kleidung bereithalten.'],
      ['Alltagstasche und Unterwegs-Bedarf vorbereiten', 'Wechselkleidung, Snacks, Trinkflasche und wichtige Kleinigkeiten vor dem Losgehen mitdenken.'],
    ],
    Haushalt: [
      ['Pflegeprodukte und Verbrauchssachen nachkaufen', 'Windeln, Feuchttücher, Creme, Zahnpasta oder andere Alltagssachen rechtzeitig ergänzen.'],
      ['Kinderwäsche und Schlafsachen verfügbar halten', 'Saubere Kleidung, Schlafsachen und Reservekleidung im Blick behalten.'],
      ['Essenszubehör und Trinksachen im Griff haben', 'Becher, Teller, Besteck, Brotdose oder Flaschen reinigen, prüfen und ersetzen.'],
      ['Kindgerechte Lebensmittel bevorraten', 'Snacks, Obst, Getränke und einfache Mahlzeiten so planen, dass nichts fehlt.'],
      ['Saisonkleidung und Außensachen vorbereiten', 'Jacke, Mütze, Sonnenhut, Regenkleidung oder Schuhe rechtzeitig bereithalten.'],
    ],
  },
  '3-6': {
    Betreuung: [
      ['Nachmittage und freie Zeit planen', 'Im Blick behalten, wie Spielen, Bewegung, Termine und Erholung gut zusammenpassen.'],
      ['Freundschaften und Verabredungen organisieren', 'Verabredungen, Geburtstage, Gruppensituationen und soziale Themen im Blick behalten.'],
      ['Vorschule und Lernanreize mitdenken', 'Vorlesen, Zuhören, Konzentration und kleine Lernimpulse im Alltag bewusst einbauen.'],
      ['Selbstständigkeit im Alltag aufbauen', 'Anziehen, Aufräumen, kleine Aufgaben und Mithelfen verlässlich einüben.'],
      ['Regeln und Tagesabläufe stabil halten', 'Morgen, Heimkommen, Abend und typische Reibungsmomente mit klaren Abläufen steuern.'],
    ],
    Gesundheit: [
      ['Vorsorge, Impfungen und Zahnarzt nachhalten', 'Gesundheitstermine planen, vorbereiten und rechtzeitig wahrnehmen.'],
      ['Akute Beschwerden einschätzen', 'Fieber, Husten, Bauchweh, Haut oder Schmerzen beobachten und passend reagieren.'],
      ['Medikamente und Hilfsmittel verfügbar halten', 'Im Blick behalten, was da ist, was fehlt und was nachgekauft werden muss.'],
      ['Arztbesuche und Nachfragen vorbereiten', 'Fragen, Unterlagen und Terminorganisation zuverlässig mitdenken.'],
      ['Wiederkehrende Gesundheitsthemen verfolgen', 'Zahnthemen, Allergien, Haut oder andere Auffälligkeiten über längere Zeit im Blick behalten.'],
    ],
    Alltag: [
      ['Mahlzeiten und Trinkroutine steuern', 'Frühstück, Kita-Essen, Snacks und Trinken über den Tag im Blick behalten.'],
      ['Kleidung für Alltag und Wetter auswählen', 'Für Kita, Spielplatz und Wetter passende Kleidung rechtzeitig bereitlegen.'],
      ['Körperpflege und Hygiene nachhalten', 'Zähneputzen, Baden, Haare, Nägel und Toilettenroutine im Alltag absichern.'],
      ['Morgen- und Abendabläufe organisieren', 'Losgehen, Heimkommen, Umziehen und Schlafengehen mit klaren Abläufen steuern.'],
      ['Wechselkleidung und Mitgebsachen vorbereiten', 'Für Kita, Ausflug oder Sport passende Sachen vollständig mitdenken.'],
    ],
    Haushalt: [
      ['Kita-Kleidung und Reservewäsche verfügbar halten', 'Saubere Kleidung, Unterwäsche, Schlafsachen und Wechselkleidung im Blick behalten.'],
      ['Brotdosen, Trinkflaschen und Rucksäcke einsatzbereit halten', 'Reinigen, auffüllen und fehlende Dinge rechtzeitig ersetzen.'],
      ['Kindgerechte Lebensmittel und Snacks bevorraten', 'Für Kita, Zuhause und Ausflüge genug Passendes im Haus haben.'],
      ['Bastel-, Spiel- und Beschäftigungsmaterial ergänzen', 'Stifte, Papier, Bücher und kleine Spielsachen rechtzeitig nachfüllen.'],
      ['Saisonbedarf und Außensachen im Blick behalten', 'Regenzeug, Hausschuhe, Badesachen, Mütze oder Handschuhe passend bereithalten.'],
    ],
  },
  '6-12': {
    Betreuung: [
      ['Schule und Lernen organisieren', 'Hausaufgaben, Tests, Lernzeiten und passende Unterstützung im Blick behalten.'],
      ['Freundschaften und Verabredungen im Blick behalten', 'Wissen, was sozial läuft, was abgestimmt werden muss und wo Begleitung nötig ist.'],
      ['Hobbys und Wochenstruktur koordinieren', 'Vereine, Aktivitäten, freie Zeit und Erholung im Wochenablauf sinnvoll abstimmen.'],
      ['Medienregeln und Gerätezeiten steuern', 'Absprachen, Zeiten und Umgang mit Handy, Tablet, Konsole oder TV im Blick behalten.'],
      ['Selbstständigkeit im Alltag ausbauen', 'Tasche packen, Dinge selbst organisieren und Verantwortung Schritt für Schritt übergeben.'],
    ],
    Gesundheit: [
      ['Vorsorge, Zahnarzt und Impfungen nachhalten', 'Gesundheitstermine rechtzeitig planen, prüfen und vorbereiten.'],
      ['Beschwerden und Krankheitsverlauf beobachten', 'Fieber, Bauchweh, Kopfschmerzen, Haut oder andere Beschwerden einschätzen und nachverfolgen.'],
      ['Medikamente und Hausapotheke im Griff behalten', 'Bestände, Dosierungen und Anwendung verlässlich nachhalten.'],
      ['Sport, Belastung und Erholung mitdenken', 'Im Blick behalten, wann das Kind fit ist, Ruhe braucht oder körperlich überlastet wirkt.'],
      ['Gesundheitsunterlagen und Atteste organisieren', 'Impfstatus, Nachweise, Unterlagen oder Bescheinigungen griffbereit halten.'],
    ],
    Alltag: [
      ['Mahlzeiten und Schulversorgung steuern', 'Frühstück, Brotdose, Snacks und Trinken für Schule und Freizeit im Blick behalten.'],
      ['Kleidung für Schule, Sport und Wetter organisieren', 'Passende Kleidung und Ausrüstung rechtzeitig bereithalten.'],
      ['Hygiene und Körperpflege begleiten', 'Duschen, Zähne, Haare, Nägel und gepflegte Routinen im Blick behalten.'],
      ['Morgen- und Abendroutine stabil halten', 'Losgehen, Heimkommen, Hausaufgaben und Schlafenszeit verlässlich strukturieren.'],
      ['Sport- und Schulsachen vollständig halten', 'Im Blick behalten, was eingepackt, ersetzt oder ergänzt werden muss.'],
    ],
    Haushalt: [
      ['Schulmaterial rechtzeitig ergänzen', 'Hefte, Stifte, Bastelsachen und Verbrauchsmaterial im Blick behalten.'],
      ['Kleidung, Unterwäsche und Sportsachen verfügbar halten', 'Sauber, passend und einsatzbereit organisieren.'],
      ['Brotdose, Trinkflasche und Alltagsmaterial pflegen', 'Reinigen, auffüllen und ersetzen, wenn etwas fehlt oder kaputt ist.'],
      ['Hobby- und Sportbedarf im Griff haben', 'Ausrüstung, Kleidung oder Zubehör rechtzeitig beschaffen.'],
      ['Snacks und Vorräte für Schulwoche planen', 'So einkaufen, dass morgens und nachmittags alles da ist.'],
    ],
  },
  '12-18': {
    Betreuung: [
      ['Schule, Lernen und Prüfungen im Blick behalten', 'Prüfungen, Abgaben, Lernphasen und schulische Belastung rechtzeitig mitdenken.'],
      ['Praktika, Bewerbungen und Zukunftsschritte organisieren', 'Fristen, Unterlagen, Gespräche und nächste Schritte frühzeitig im Blick behalten.'],
      ['Mediennutzung und Tagesstruktur steuern', 'Gerätenutzung, Schlaf, Erreichbarkeit und Tagesrhythmus im Blick behalten.'],
      ['Selbstständigkeit und Eigenverantwortung übergeben', 'Mehr Verantwortung abgeben und trotzdem wichtige Themen weiter nachhalten.'],
      ['Gesprächsbedarf und Überforderung früh merken', 'Im Blick behalten, wann Rückzug, Druck oder Überforderung zunehmen und Gespräch nötig wird.'],
    ],
    Gesundheit: [
      ['Vorsorge, Zahnarzt und Impfungen nachhalten', 'Wichtige Gesundheitstermine auch im Jugendalter verlässlich im Blick behalten.'],
      ['Beschwerden und Warnzeichen beobachten', 'Körperliche und psychische Auffälligkeiten früh erkennen und einordnen.'],
      ['Medikamente und gesundheitliche Selbstverantwortung begleiten', 'Nachhalten, was da ist, wie es genommen wird und wo noch Unterstützung nötig ist.'],
      ['Schlaf, Stress und Erholung im Blick behalten', 'Erkennen, wenn Belastung zu hoch wird oder Routinen kippen.'],
      ['Gesundheitsunterlagen und Nachweise organisieren', 'Impfstatus, Atteste, Versicherungsthemen und wichtige Unterlagen griffbereit halten.'],
    ],
    Alltag: [
      ['Essen, Trinken und Tagesstruktur im Blick behalten', 'Auch bei mehr Eigenständigkeit wahrnehmen, wenn Grundroutinen wegrutschen.'],
      ['Schlafrhythmus und Morgenstart stabilisieren', 'Schulalltag, Schlaf und Erholung so mitdenken, dass es nicht kippt.'],
      ['Kleidung, Ausrüstung und besondere Anlässe organisieren', 'Alltag, Schule, Sport, Events oder Praktika passend vorbereiten.'],
      ['Hygiene, Wäsche und Grundpflege im Blick behalten', 'Nicht alles übernehmen, aber aufmerksam bleiben, wo Routinen wegbrechen.'],
      ['Prüfungsphasen im Alltag absichern', 'Ruhe, Essen, Zeitfenster und praktische Entlastung in stressigen Phasen mitdenken.'],
    ],
    Haushalt: [
      ['Kleidung und Saisonbedarf rechtzeitig erneuern', 'Alltag, Sport, Schule und Wetter passend ausstatten.'],
      ['Schul- und Lernmaterial verfügbar halten', 'Hefte, Technik, Zubehör und Verbrauchssachen rechtzeitig ergänzen.'],
      ['Sport-, Hobby- und Freizeitausrüstung im Blick behalten', 'Fehlendes, Unpassendes oder Defektes früh erkennen und ersetzen.'],
      ['Snacks, Schulverpflegung und Alltagsbedarf planen', 'So einkaufen, dass im Alltag genug da ist.'],
      ['Prüfungs-, Reise- oder Praktikumsbedarf vorbereiten', 'Unterlagen, Kleidung, Material und Besonderheiten rechtzeitig beschaffen.'],
    ],
  },
};

const externalCareCards = {
  kita: {
    tag: 'externalCare:kita',
    Betreuung: [
      ['Kita-Kommunikation steuern', 'Nachrichten, Elterninfos, Rückmeldungen, Aushänge und Absprachen mit der Kita im Blick behalten und beantworten.'],
      ['Eingewöhnung und Betreuungsplatz organisieren', 'Eingewöhnung, Gruppenwechsel, Bezugspersonen, Vertrags- oder Platzthemen und wichtige Abstimmungen mit der Kita steuern.'],
    ],
    Gesundheit: [
      ['Gesundheitsinfos für die Kita aktuell halten', 'Allergien, Medikamente, Krankmeldungen und gesundheitliche Besonderheiten klar weitergeben und aktuell halten.'],
    ],
    Alltag: [
      ['Kita-Tasche und Mitgebsachen vorbereiten', 'Wechselkleidung, Brotdose, Trinkflasche, Hausschuhe, Schlafsachen und besondere Mitgebsachen vollständig bereithalten.'],
      ['Bring- und Abholabläufe organisieren', 'Bringzeiten, Abholzeiten, Übergaben, Vertretungen und kurzfristige Änderungen verlässlich abstimmen.'],
    ],
    Haushalt: [
      ['Kita-Ausstattung vollständig halten', 'Hausschuhe, Wechselwäsche, Matschsachen, Brotdosen und andere Kita-Sachen rechtzeitig besorgen, ergänzen und ersetzen.'],
      ['Schließtage und Betreuungsausfälle auffangen', 'Ferien, Konzeptionstage, Krankheit, Eingewöhnungsphasen oder spontane Ausfälle rechtzeitig mitdenken und absichern.'],
    ],
  },
  tagespflege: {
    tag: 'externalCare:tagespflege',
    Betreuung: [
      ['Absprachen mit der Tagespflege steuern', 'Zeiten, Besonderheiten, Rückfragen und laufende Abstimmungen mit der Tagespflege im Blick behalten.'],
      ['Betreuungsplatz und Eingewöhnung organisieren', 'Start, Wechsel, Eingewöhnung und grundlegende Betreuungsabsprachen verlässlich steuern.'],
    ],
    Gesundheit: [
      ['Gesundheitsinfos für die Tagespflege aktuell halten', 'Allergien, Medikamente, Krankmeldungen und wichtige gesundheitliche Hinweise klar weitergeben.'],
    ],
    Alltag: [
      ['Tagespflege-Tasche und Tagesbedarf vorbereiten', 'Essen, Wechselkleidung, Schlafsachen, Pflegeprodukte und persönliche Dinge vollständig bereithalten.'],
      ['Bring- und Abholabläufe organisieren', 'Zeiten, Wege, Übergaben und kurzfristige Änderungen rund um die Tagespflege abstimmen.'],
    ],
    Haushalt: [
      ['Sachen für die Tagespflege vollständig halten', 'Wechselkleidung, Pflegeprodukte, Essen, Trinksachen und Schlafsachen rechtzeitig ergänzen und ersetzen.'],
      ['Ausfälle und Vertretung absichern', 'Urlaub, Krankheit oder Änderungen in der Tagespflege rechtzeitig auffangen und Alternativen organisieren.'],
    ],
  },
  familie: {
    tag: 'externalCare:familie',
    Betreuung: [
      ['Betreuung mit Familie abstimmen', 'Zeiten, Zuständigkeiten, Verfügbarkeit und Erwartungen mit Großeltern oder Familie klar regeln.'],
      ['Regeln, Routinen und wichtige Infos weitergeben', 'Schlaf, Essen, Gewohnheiten, Abläufe und wichtige Besonderheiten verständlich abstimmen und aktuell halten.'],
    ],
    Gesundheit: [
      ['Gesundheitsinfos für Familie aktuell halten', 'Allergien, Medikamente, Krankheit und wichtige Hinweise klar weitergeben.'],
    ],
    Alltag: [
      ['Mitgebsachen für die Familienbetreuung vorbereiten', 'Essen, Kleidung, Schlafsachen, Medikamente und andere wichtige Dinge vollständig mitgeben.'],
      ['Bring-, Abhol- und Übergabelogik organisieren', 'Wer bringt, wer holt und wie spontane Änderungen laufen, verlässlich abstimmen.'],
    ],
    Haushalt: [
      ['Sachen für Betreuung bei Familie bereithalten', 'Wechselkleidung, Essen, Pflegeprodukte oder andere benötigte Dinge rechtzeitig vorbereiten.'],
      ['Ausfälle und Alternativen absichern', 'Absagen, Überforderung oder spontane Änderungen rechtzeitig auffangen und Ersatz mitdenken.'],
    ],
  },
  babysitter: {
    tag: 'externalCare:babysitter',
    Betreuung: [
      ['Einsätze mit Babysitter oder Nanny planen', 'Termine, Zeiten, Verfügbarkeit und Änderungen rund um die Betreuung im Blick behalten.'],
      ['Abläufe und Regeln für die Betreuung klar übergeben', 'Schlaf, Essen, Beruhigung, Routinen und wichtige Regeln klar erklären und aktuell halten.'],
    ],
    Gesundheit: [
      ['Notfall- und Gesundheitsinfos griffbereit halten', 'Allergien, Medikamente, wichtige Nummern und gesundheitliche Hinweise klar verfügbar machen.'],
    ],
    Alltag: [
      ['Einsatz praktisch vorbereiten', 'Essen, Schlafsachen, Kontaktinfos, Schlüssel, Notfallinfos und alles Nötige für den Einsatz vollständig vorbereiten.'],
      ['Betreuungsbedarf im Alltag vorausplanen', 'Rechtzeitig mitdenken, wann Betreuung gebraucht wird und wie sie in euren Alltag passt.'],
    ],
    Haushalt: [
      ['Betreuungsausstattung vollständig halten', 'Snacks, Pflegeprodukte, Schlafsachen, Beschäftigungssachen und andere benötigte Dinge rechtzeitig bereithalten.'],
      ['Ausfälle und Ersatzlösungen absichern', 'Kurzfristige Absagen oder Änderungen rechtzeitig auffangen und Alternativen organisieren.'],
    ],
  },
};

function buildCatalogCards() {
  const cards = [];

  for (const ageGroup of AGE_GROUPS) {
    const orderByCategory = new Map();
    const pushCard = ({ categoryKey, title, description, tags }) => {
      const nextSort = (orderByCategory.get(categoryKey) ?? 0) + 1;
      orderByCategory.set(categoryKey, nextSort);

      const tagSuffix = tags.length ? slugify(tags.join('-')) : 'default';
      const id = `${ageGroup}__${slugify(categoryKey)}__${tagSuffix}__${String(nextSort).padStart(3, '0')}`;

      cards.push({
        id,
        ageGroup,
        categoryKey,
        title,
        description,
        language: LANGUAGE,
        sortOrder: nextSort,
        isActive: true,
        tags,
        version: 1,
      });
    };

    for (const categoryKey of ['Betreuung', 'Gesundheit', ageGroup === '0-1' ? 'Babyalltag' : 'Alltag', 'Haushalt']) {
      const standard = standardCards[ageGroup][categoryKey] ?? [];
      for (const [title, description] of standard) {
        pushCard({ categoryKey, title, description, tags: [] });
      }

      for (const provider of EXTERNAL_CARE_ORDER) {
        const providerConfig = externalCareCards[provider];
        const sourceCategory = categoryKey === 'Babyalltag' ? 'Alltag' : categoryKey;
        const externalEntries = providerConfig[sourceCategory] ?? [];
        for (const [title, description] of externalEntries) {
          pushCard({ categoryKey, title, description, tags: [providerConfig.tag] });
        }
      }
    }
  }

  const unique = new Set();
  for (const card of cards) {
    const key = `${card.ageGroup}|${card.categoryKey}|${card.title}|${card.tags.join(',')}`;
    if (unique.has(key)) {
      throw new Error(`Duplicate catalog definition detected for ${key}`);
    }
    unique.add(key);
  }

  return cards;
}

const dryRun = process.argv.includes('--dry-run');
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const app = getApps()[0] ?? initializeApp({ credential: buildCredential(), projectId });
const db = getFirestore(app);

async function run() {
  const cards = buildCatalogCards();
  const existingSnapshot = await db.collection(CATALOG_COLLECTION).get();

  console.log(JSON.stringify({
    action: dryRun ? 'dry-run' : 'upsert',
    collection: CATALOG_COLLECTION,
    existingCount: existingSnapshot.size,
    replacementCount: cards.length,
  }));

  if (dryRun) {
    return;
  }

  for (const docs of chunk(existingSnapshot.docs, 400)) {
    const batch = db.batch();
    for (const snap of docs) {
      batch.delete(snap.ref);
    }
    await batch.commit();
  }

  for (const items of chunk(cards, 400)) {
    const batch = db.batch();
    for (const item of items) {
      const ref = db.collection(CATALOG_COLLECTION).doc(item.id);
      batch.set(ref, {
        ...item,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: SCRIPT_ACTOR,
        updatedBy: SCRIPT_ACTOR,
      });
    }
    await batch.commit();
  }

  console.log(JSON.stringify({
    success: true,
    collection: CATALOG_COLLECTION,
    written: cards.length,
    replacedPreviousCount: existingSnapshot.size,
  }));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
