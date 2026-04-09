import type { LocalizedText, LocalizedTextList } from '@/types/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';

export interface OwnershipTemplateSeedItem {
  title: LocalizedText;
  details: LocalizedTextList;
}

interface OwnershipTemplateSourceItem {
  title: string;
  details: string[];
}

const sameAllLocales = (value: string): LocalizedText => ({ de: value, en: value, nl: value });

function item(title: string, details: string[]): OwnershipTemplateSourceItem {
  return { title, details };
}

function toSeedItem(entry: OwnershipTemplateSourceItem): OwnershipTemplateSeedItem {
  return {
    title: sameAllLocales(entry.title),
    details: { de: entry.details, en: [], nl: [] },
  };
}

// Bestehende Schlüssel bleiben erhalten: `6_10` trägt die Inhalte für 6–12 und `10_plus` die Inhalte für 12–18.
const rawSeedContent: Record<AgeGroup, Record<QuizCategory, OwnershipTemplateSourceItem[]>> = {
  '0_1': {
    betreuung_entwicklung: [
      item('Wer wählt passende Spiel- und Lernimpulse aus', [
        'Welche Aktivitäten passen gerade zum Alter',
        'Was fördert das Kind sinnvoll',
        'Was bringt Abwechslung in den Alltag',
      ]),
      item('Wer sorgt dafür, dass regelmäßiger Kontakt zu anderen Kindern stattfindet', [
        'Treffen mit anderen Kindern im Kopf haben',
        'Regelmäßigkeit im Blick behalten',
        'Gelegenheiten aktiv erkennen',
      ]),
      item('Wer sucht passende Kurse und Angebote aus', [
        'Überblick über Angebote behalten',
        'Einschätzen, was sinnvoll ist',
        'Zeitpunkt für Teilnahme erkennen',
      ]),
      item('Wer organisiert Treffen mit anderen Eltern aktiv', [
        'Kontakte im Kopf behalten',
        'Anstoßen, dass Treffen stattfinden',
        'Regelmäßigkeit sichern',
      ]),
      item('Wer plant passende Aktivitäten im Alltag', [
        'Ideen für den Tag im Kopf haben',
        'Abwechslung sicherstellen',
        'Aktivität passend zur Situation wählen',
      ]),
      item('Wer führt neue Aktivitäten ein. Bücher, Musik, Bewegung', [
        'Erkennen, wann etwas Neues sinnvoll ist',
        'Neue Impulse bewusst einbringen',
        'Entwicklung dadurch anstoßen',
      ]),
      item('Wer beobachtet Interessen und passt Aktivitäten daran an', [
        'Wahrnehmen, was das Kind interessiert',
        'Aktivitäten entsprechend anpassen',
        'Veränderungen erkennen',
      ]),
      item('Wer verfolgt Entwicklungsschritte aktiv', [
        'Meilensteine im Blick behalten',
        'Entwicklung einschätzen',
        'Fortschritte bewusst wahrnehmen',
      ]),
      item('Wer erkennt frühzeitig Entwicklungsbedarfe', [
        'Auffälligkeiten erkennen',
        'Unterstützungsbedarf einschätzen',
        'Handlungsbedarf ableiten',
      ]),
      item('Wer überprüft regelmäßig, ob vorhandenes Spielzeug noch zum Entwicklungsstand passt', [
        'Spielzeug regelmäßig hinterfragen',
        'Passung zum Alter prüfen',
        'Bedarf für Veränderung erkennen',
      ]),
    ],
    gesundheit: [
      item('Wer behält Vorsorgeuntersuchungen im Blick', [
        'Nächste U-Untersuchung im Kopf haben',
        'Timing nicht verpassen',
        'Reihenfolge verstehen',
      ]),
      item('Wer behält anstehende Impfungen im Blick', [
        'Impfstatus kennen',
        'Nächste Schritte im Kopf haben',
        'Zeitfenster berücksichtigen',
      ]),
      item('Wer entscheidet, wann ein Arztbesuch nötig ist', [
        'Symptome einschätzen',
        'Abwägen, ob Arzt nötig ist',
        'Sicherheit herstellen',
      ]),
      item('Wer denkt rechtzeitig an anstehende Arzttermine', [
        'Termin nicht vergessen',
        'Vorbereitung im Kopf haben',
        'Ablauf antizipieren',
      ]),
      item('Wer hält die Hausapotheke einsatzbereit', [
        'Überblick über vorhandene Mittel',
        'Fehlendes früh erkennen',
        'Einsatzfähigkeit sicherstellen',
      ]),
      item('Wer kennt typische Symptome und kann sie einordnen', [
        'Fieber, Husten etc. einschätzen',
        'Normal vs. kritisch unterscheiden',
        'Ruhe oder Handeln ableiten',
      ]),
      item('Wer erkennt frühzeitig gesundheitliche Auffälligkeiten', [
        'Veränderungen wahrnehmen',
        'Abweichungen erkennen',
        'rechtzeitig reagieren',
      ]),
      item('Wer behält Krankheitsverläufe im Blick', [
        'Entwicklung einer Krankheit verfolgen',
        'Besserung oder Verschlechterung erkennen',
        'nächste Schritte ableiten',
      ]),
      item('Wer stellt sicher, dass Gesundheitsinformationen verfügbar sind', [
        'Wissen griffbereit im Kopf',
        'wichtige Infos kennen',
        'Zugriff sicherstellen',
      ]),
      item('Wer organisiert Krankschreibungen, Atteste und medizinische Nachweise', [
        'Wissen, wann Nachweise nötig sind',
        'Überblick über Anforderungen haben',
        'rechtzeitig daran denken',
      ]),
    ],
    babyalltag_pflege: [
      item('Wer behält den Überblick über tägliche Routinen', [
        'Tagesstruktur im Kopf haben',
        'Wiederkehrendes koordinieren',
        'Stabilität sichern',
      ]),
      item('Wer erkennt, wann Routinen angepasst werden müssen', [
        'Veränderungen im Verhalten erkennen',
        'Bedarf zur Anpassung ableiten',
        'Timing einschätzen',
      ]),
      item('Wer behält Schlafverhalten und Veränderungen im Blick', [
        'Schlafmuster kennen',
        'Abweichungen erkennen',
        'Anpassungen ableiten',
      ]),
      item('Wer denkt an nächste Entwicklungsschritte im Alltag', [
        'Übergänge antizipieren',
        'nächste Phase im Kopf haben',
        'Vorbereitung gedanklich leisten',
      ]),
      item('Wer sorgt dafür, dass im Alltag alles Notwendige verfügbar ist', [
        'Bedarf im Kopf behalten',
        'nichts Wichtiges vergessen',
        'Alltag reibungslos halten',
      ]),
      item('Wer erkennt frühzeitig neue Bedürfnisse des Babys', [
        'Signale wahrnehmen',
        'Veränderungen interpretieren',
        'darauf reagieren',
      ]),
      item('Wer passt den Alltag an Entwicklungsschritte an', [
        'Alltag flexibel anpassen',
        'neue Anforderungen integrieren',
        'Struktur weiterentwickeln',
      ]),
      item('Wer behält Wechselkleidung und Bedarf im Blick', [
        'Größe und Menge im Kopf haben',
        'Bedarf rechtzeitig erkennen',
        'Engpässe vermeiden',
      ]),
      item('Wer sorgt für Struktur im Alltag', [
        'Orientierung geben',
        'Wiederkehr schaffen',
        'Chaos vermeiden',
      ]),
      item('Wer denkt an anstehende Veränderungen im Alltag', [
        'Übergänge erkennen',
        'kommende Anpassungen im Kopf haben',
        'frühzeitig vorbereiten',
      ]),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Wer plant den Wocheneinkauf gedanklich', [
        'Bedarf im Kopf haben',
        'kommende Woche antizipieren',
        'nichts Wichtiges vergessen',
      ]),
      item('Wer erkennt frühzeitig, wann Einkäufe nötig werden', [
        'Vorräte einschätzen',
        'Engpässe erkennen',
        'rechtzeitig reagieren',
      ]),
      item('Wer behält Vorräte im Blick', [
        'Bestand kennen',
        'Verbrauch einschätzen',
        'Überblick behalten',
      ]),
      item('Wer denkt rechtzeitig an wiederkehrende Besorgungen', [
        'Regelmäßiges im Kopf behalten',
        'Timing nicht verpassen',
        'Routine sicherstellen',
      ]),
      item('Wer sorgt dafür, dass Babybedarf nie ausgeht', [
        'kritische Produkte im Blick haben',
        'rechtzeitig nachdenken',
        'Versorgung sichern',
      ]),
      item('Wer behält Haushaltsbedarf im Blick', [
        'Waschmittel, etc. im Kopf haben',
        'Bedarf erkennen',
        'Engpässe vermeiden',
      ]),
      item('Wer erkennt, wann neue Anschaffungen nötig sind', [
        'Bedarf antizipieren',
        'Notwendigkeit einschätzen',
        'rechtzeitig handeln',
      ]),
      item('Wer plant größere Anschaffungen gedanklich', [
        'Bedarf früh erkennen',
        'Optionen durchdenken',
        'Entscheidung vorbereiten',
      ]),
      item('Wer behält das Haushaltsbudget im Blick', [
        'Ausgaben im Kopf haben',
        'Grenzen einschätzen',
        'Prioritäten setzen',
      ]),
      item('Wer erkennt frühzeitig Engpässe im Haushalt', [
        'Probleme antizipieren',
        'Risiken erkennen',
        'rechtzeitig gegensteuern',
      ]),
    ],
  },
  '1_3': {
    betreuung_entwicklung: [
      item('Tagesrhythmus passend steuern', [
        'Schlaf, Ruhe, Aktivität und Ausflüge so im Blick behalten, dass der Tag zum Kind passt.',
      ]),
      item('Spiel und Anregung passend auswählen', [
        'Ideen, Spielsachen und kleine Aktivitäten passend zu Alter, Energie und Interesse des Kindes im Blick behalten.',
      ]),
      item('Sprachentwicklung im Alltag fördern', [
        'Vorlesen, Benennen, Singen und kleine Sprechanreize regelmäßig mitdenken und einbauen.',
      ]),
      item('Motorische Entwicklung begleiten', [
        'Bewegung, Klettern, Laufen, Greifen und sichere Übungsmöglichkeiten im Alltag mitdenken.',
      ]),
      item('Selbstständigkeit Schritt für Schritt aufbauen', [
        'Kleine Schritte wie selbst essen, mithelfen, Schuhe probieren oder einfache Abläufe begleiten.',
      ]),
      item('Routinen stabil halten und anpassen', [
        'Morgen, Mahlzeiten, Schlafen, Heimkommen und Übergänge im Blick behalten und nach Bedarf anpassen.',
      ]),
      item('Überreizung früh erkennen', [
        'Signale für Müdigkeit, Frust, Reizüberflutung oder Rückzug wahrnehmen und Alltag entsprechend steuern.',
      ]),
      item('Übergänge gut vorbereiten', [
        'Wechsel zwischen Zuhause, Betreuung, Spielplatz, Essen, Schlafen oder Heimweg gut begleiten.',
      ]),
      item('Entwicklungsstände im Blick behalten', [
        'Beobachten, was neu gelingt, wo Unterstützung sinnvoll ist und was gerade gut passt.',
      ]),
      item('Passende Regeln und Orientierung geben', [
        'Einfache Grenzen, Wiederholungen und klare Abläufe so im Blick behalten, dass das Kind Sicherheit hat.',
      ]),
    ],
    gesundheit: [
      item('Vorsorgetermine und Impfungen steuern', [
        'U-Termine, Impfungen, Zahnarzt und empfohlene Kontrollen im Blick behalten und vorbereiten.',
      ]),
      item('Krankheitssymptome beobachten', [
        'Fieber, Husten, Haut, Magen-Darm, Zahnung oder auffälliges Verhalten früh wahrnehmen und einordnen.',
      ]),
      item('Medikamente und Hausapotheke im Griff haben', [
        'Standardmittel, Dosierungen, Verfügbarkeit und Anwendung im Alltag geordnet im Blick behalten.',
      ]),
      item('Zahnung begleiten', [
        'Beschwerden, Hilfsmittel, Entlastung und passende Reaktion auf Zahnungsthemen mitdenken.',
      ]),
      item('Trinken und Essen bei Krankheit absichern', [
        'Darauf achten, dass das Kind bei Krankheit genug trinkt, isst und sich erholt.',
      ]),
      item('Arztbesuche vorbereiten', [
        'Karte, Unterlagen, Fragen, Terminzeit und passende Begleitung für Arztbesuche mitdenken.',
      ]),
      item('Verträglichkeiten beobachten', [
        'Reaktionen auf Lebensmittel, Pflegeprodukte oder Medikamente wahrnehmen und nachhalten.',
      ]),
      item('Sonnenschutz und Wetterschutz mitdenken', [
        'Hitze, Kälte, Sonne und Jahreszeit im Alltag gesundheitlich passend absichern.',
      ]),
      item('Auffälligkeiten im Verlauf verfolgen', [
        'Beobachten, ob etwas besser, gleich oder schlechter wird und wann nachgesteuert werden muss.',
      ]),
      item('Gesundheitsunterlagen griffbereit halten', [
        'Impfpass, U-Heft, Arztinfos und wichtige Notizen schnell auffindbar organisieren.',
      ]),
    ],
    babyalltag_pflege: [
      item('Essen und Zwischenmahlzeiten steuern', [
        'Mahlzeiten, Snacks, Trinkphasen und Hungerzeichen im Tagesverlauf im Blick behalten.',
      ]),
      item('Beikost und kindgerechtes Essen weiterentwickeln', [
        'Passende Mahlzeiten, neue Lebensmittel und alltagstaugliche Essenslösungen planen.',
      ]),
      item('Wickeln oder Toilettenübergang begleiten', [
        'Windeln, Sauberkeitsthemen, Signale und passende Abläufe im Alltag im Blick behalten.',
      ]),
      item('Körperpflege regelmäßig sichern', [
        'Baden, Waschen, Zähneputzen, Nägel, Haare und Hautpflege passend einplanen.',
      ]),
      item('Kleidung im Alltag passend bereithalten', [
        'Für Wetter, Schlaf, Betreuung und Aktivität passende Kleidung auswählen und verfügbar halten.',
      ]),
      item('Größenwechsel rechtzeitig erkennen', [
        'Zu kleine Kleidung, Schuhe oder Schlafsachen rechtzeitig aussortieren und ersetzen.',
      ]),
      item('Wechselkleidung und Alltagstasche mitdenken', [
        'Für Betreuung, Ausflüge und spontane Zwischenfälle alles Nötige griffbereit halten.',
      ]),
      item('Schlafen im Alltag begleiten', [
        'Schlafbedarf, Einschlafhilfen, Schlafrituale und Veränderungen im Schlafverhalten im Blick behalten.',
      ]),
      item('Beruhigung und Trost organisieren', [
        'Lieblingssachen, Schnuller, Kuscheltiere und beruhigende Abläufe im Alltag mitdenken.',
      ]),
      item('Tägliche Grundbedürfnisse koordinieren', [
        'Essen, Schlaf, Pflege, Kleidung und Begleitung als Gesamtpaket im Blick behalten.',
      ]),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Windeln und Pflegevorräte sichern', [
        'Windeln, Feuchttücher, Creme und Pflegeprodukte rechtzeitig nachkaufen und verfügbar halten.',
      ]),
      item('Kinderwäsche rechtzeitig organisieren', [
        'Kleidung, Schlafsachen, Lätzchen und Handtücher sauber, sortiert und passend verfügbar halten.',
      ]),
      item('Essenszubehör und Trinksachen im Griff haben', [
        'Flaschen, Becher, Teller, Besteck, Lätzchen und Boxen sauber und vollständig bereithalten.',
      ]),
      item('Kindgerechte Lebensmittel bevorraten', [
        'Snacks, Obst, Getränke und Mahlzeiten so planen, dass im Alltag nichts fehlt.',
      ]),
      item('Saisonkleidung und Außensachen bereitstellen', [
        'Regenkleidung, Sonnenhut, Mütze, Jacke oder Gummistiefel passend verfügbar halten.',
      ]),
      item('Alltagstaschen und Wechselsets nachfüllen', [
        'Rucksack, Betreuungstasche und Wechselkleidung nach Nutzung wieder auffüllen.',
      ]),
      item('Kaputte oder unpassende Dinge ersetzen', [
        'Fehlende, kaputte oder nicht mehr passende Kindersachen rechtzeitig erkennen und ersetzen.',
      ]),
      item('Spiel- und Beschäftigungsmaterial ergänzen', [
        'Bücher, kleine Spielsachen oder Alltagshilfen passend erneuern oder austauschen.',
      ]),
      item('Vorräte für Wochenende und Feiertage planen', [
        'So vorausdenken, dass rund um Schließzeiten nichts Wichtiges fehlt.',
      ]),
      item('Gesamtüberblick über Alltagsmaterial halten', [
        'Behalten, was da ist, was fehlt und was bald wieder gebraucht wird.',
      ]),
    ],
  },
  '3_6': {
    betreuung_entwicklung: [
      item('Tagesstruktur passend steuern', [
        'Kita, Ruhe, Spiel, Termine und freie Zeit so im Blick behalten, dass der Alltag gut passt.',
      ]),
      item('Spiel und Beschäftigung passend auswählen', [
        'Spiele, Basteln, Bewegung und ruhige Phasen passend zu Alter und Stimmung mitdenken.',
      ]),
      item('Soziale Entwicklung begleiten', [
        'Teilen, Warten, Frust, Freundschaften und Gruppensituationen aufmerksam begleiten.',
      ]),
      item('Sprache und Ausdruck fördern', [
        'Vorlesen, Erzählen, Fragen beantworten und sprachliche Entwicklung im Alltag mitdenken.',
      ]),
      item('Selbstständigkeit im Alltag aufbauen', [
        'Anziehen, Aufräumen, kleine Verantwortlichkeiten und Mithelfen Schritt für Schritt begleiten.',
      ]),
      item('Regeln und Grenzen alltagstauglich halten', [
        'Klare Orientierung, Wiederholungen und passende Konsequenz im Familienalltag im Blick behalten.',
      ]),
      item('Vorschulthemen spielerisch begleiten', [
        'Konzentration, Feinmotorik, Zuhören und kleine Lernimpulse passend einbauen.',
      ]),
      item('Übergänge und Stimmungswechsel gut begleiten', [
        'Morgens, Heimkommen, Schlafen, Verabschieden oder Stoppen von Spielen gut steuern.',
      ]),
      item('Routinen regelmäßig nachschärfen', [
        'Beobachten, wo Abläufe nicht mehr tragen und was neu angepasst werden sollte.',
      ]),
      item('Entwicklungsbedarfe früh erkennen', [
        'Wahrnehmen, wo das Kind mehr Sicherheit, Förderung oder Begleitung braucht.',
      ]),
    ],
    gesundheit: [
      item('Vorsorge, Zahnarzt und Impfungen steuern', [
        'Gesundheitstermine rechtzeitig planen, wahrnehmen und vorbereiten.',
      ]),
      item('Akute Beschwerden einschätzen', [
        'Fieber, Husten, Magen-Darm, Haut oder Schmerzen früh erkennen und passend reagieren.',
      ]),
      item('Medikamente und Hausmittel geordnet halten', [
        'Verfügbarkeit, Anwendung und Nachkauf im Blick behalten.',
      ]),
      item('Zahngesundheit begleiten', [
        'Putzen, Termine, Beschwerden und Zahnarztfragen mitdenken.',
      ]),
      item('Bewegung, Ruhe und Belastung balancieren', [
        'Erkennen, wann das Kind körperlich fit, erschöpft oder überfordert ist.',
      ]),
      item('Ansteckung und Krankheitsphasen organisieren', [
        'Kita-Ausfall, Zuhause-Betreuung und Wiedereinstieg mitdenken.',
      ]),
      item('Verträglichkeiten und Auffälligkeiten beobachten', [
        'Reaktionen auf Essen, Hautprodukte oder wiederkehrende Beschwerden nachhalten.',
      ]),
      item('Sonnen-, Zecken- und Wetterschutz sichern', [
        'Jahreszeitliche Gesundheitsthemen im Alltag mitdenken.',
      ]),
      item('Arztbesuche gut vorbereiten', [
        'Fragen, Unterlagen, Zeitfenster und Begleitung passend organisieren.',
      ]),
      item('Gesamtüberblick über Gesundheit halten', [
        'Wissen, was aktuell läuft, was beobachtet wird und was ansteht.',
      ]),
    ],
    babyalltag_pflege: [
      item('Mahlzeiten im Alltag steuern', [
        'Frühstück, Kita-Essen, Snacks und Abendessen alltagstauglich im Blick behalten.',
      ]),
      item('Brotdose und Trinkflasche mitdenken', [
        'Für Kita, Ausflug oder Sport passende Versorgung vorbereiten.',
      ]),
      item('Kleidung passend für Wetter und Aktivität wählen', [
        'Alltag, Kita, Spielplatz und Jahreszeit mitdenken.',
      ]),
      item('Körperpflege und Hygiene begleiten', [
        'Zähneputzen, Baden, Haare, Nägel und Sauberkeit alltagssicher einplanen.',
      ]),
      item('Toilettenroutine stabil halten', [
        'Toilettengänge, Unfälle, Wechselkleidung und Sicherheit im Alltag mitdenken.',
      ]),
      item('Schlafen und Ruhephasen begleiten', [
        'Erholung, Abendroutine und Schlafbedarf im Blick behalten.',
      ]),
      item('Selbstständigkeit im Alltag fördern', [
        'Anziehen, Tisch decken, Aufräumen und kleine Routinen mit dem Kind üben.',
      ]),
      item('Wechselkleidung und Außensachen bereithalten', [
        'Für Kita und Alltag passende Reserve mitdenken.',
      ]),
      item('Alltagsabläufe verlässlich machen', [
        'Morgen, Heimkommen, Abend und Losgehen so strukturieren, dass wenig Chaos entsteht.',
      ]),
      item('Gesamtüberblick über tägliche Bedürfnisse halten', [
        'Essen, Kleidung, Pflege, Ruhe und Begleitung zusammen im Blick behalten.',
      ]),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Kita- und Alltagskleidung verfügbar halten', [
        'Saubere, passende und wetterfeste Kleidung rechtzeitig bereitstellen.',
      ]),
      item('Brotdosen, Trinkflaschen und Rucksäcke im Griff haben', [
        'Reinigen, auffüllen und einsatzbereit halten.',
      ]),
      item('Kinderwäsche und Bettwäsche organisieren', [
        'Alltagssachen sauber und vollständig verfügbar halten.',
      ]),
      item('Saisonbedarf rechtzeitig umstellen', [
        'Badesachen, Hausschuhe, Regenzeug, Mütze oder Handschuhe passend bereitstellen.',
      ]),
      item('Snacks und kindgerechte Lebensmittel bevorraten', [
        'Für Kita, Zuhause und Ausflüge genug Passendes im Haus haben.',
      ]),
      item('Bastel- und Beschäftigungsmaterial ergänzen', [
        'Stifte, Papier, Kleber, Bücher oder kleine Spielsachen rechtzeitig nachfüllen.',
      ]),
      item('Kaputte oder verlorene Sachen ersetzen', [
        'Hausschuhe, Brotdose, Jacke oder Lieblingssachen rechtzeitig neu besorgen.',
      ]),
      item('Ausflugssachen und Reservebedarf mitdenken', [
        'Rucksack, Trinkflasche, Wechselkleidung und Kleinigkeiten für unterwegs im Blick behalten.',
      ]),
      item('Einkäufe rund um Kita und Wochenende planen', [
        'So vorausdenken, dass im Alltag keine Engpässe entstehen.',
      ]),
      item('Gesamtüberblick über kindbezogene Vorräte halten', [
        'Wissen, was da ist, was fehlt und was bald wieder gebraucht wird.',
      ]),
    ],
  },
  '6_10': {
    betreuung_entwicklung: [
      item('Schulalltag passend begleiten', [
        'Lernen, Erholung, Freizeit und Anforderungen so im Blick behalten, dass das Kind gut mitkommt.',
      ]),
      item('Hausaufgaben und Lernroutinen strukturieren', [
        'Passende Zeiten, Unterstützung und Verlässlichkeit rund ums Lernen mitdenken.',
      ]),
      item('Freundschaften und soziale Themen begleiten', [
        'Wahrnehmen, was in Schule, Gruppe oder Freundeskreis läuft und wo Begleitung nötig ist.',
      ]),
      item('Selbstständigkeit schrittweise ausbauen', [
        'Mehr Verantwortung im Alltag, ohne das Kind zu überfordern, sinnvoll mitdenken.',
      ]),
      item('Freizeit und Hobbys passend balancieren', [
        'Bewegung, Verein, freie Zeit und Erholung im Alltag gut austarieren.',
      ]),
      item('Mediennutzung im Blick behalten', [
        'Regeln, Zeiten und Umgang mit Medien immer wieder passend nachschärfen.',
      ]),
      item('Motivation und Selbstvertrauen stärken', [
        'Erkennen, wo das Kind Zuspruch, Orientierung oder Entlastung braucht.',
      ]),
      item('Routinen an neue Anforderungen anpassen', [
        'Wenn Schule, Hausaufgaben oder Hobbys Abläufe verändern, passend nachsteuern.',
      ]),
      item('Entwicklungs- und Lernthemen früh erkennen', [
        'Wahrnehmen, wo Unterstützung, Förderung oder Klärung nötig ist.',
      ]),
      item('Gesamtüberblick über Entwicklung und Begleitung halten', [
        'Schule, Freizeit, Stimmung und Selbstständigkeit zusammen im Blick behalten.',
      ]),
    ],
    gesundheit: [
      item('Vorsorge, Zahnarzt und Impfungen steuern', [
        'Alle Gesundheitstermine verlässlich planen und vorbereiten.',
      ]),
      item('Beschwerden und Krankheitsverlauf beobachten', [
        'Erkennen, wann etwas harmlos ist und wann mehr nötig wird.',
      ]),
      item('Medikamente und Hausapotheke im Griff behalten', [
        'Verfügbarkeit, Dosierung und Nachkauf zuverlässig organisieren.',
      ]),
      item('Sport, Bewegung und Belastung mitdenken', [
        'Achten, wie belastbar das Kind ist und was körperlich gerade passt.',
      ]),
      item('Schlaf, Erholung und Energie im Blick behalten', [
        'Wahrnehmen, wenn Müdigkeit oder Überlastung ein Thema wird.',
      ]),
      item('Wiederkehrende Auffälligkeiten verfolgen', [
        'Kopfschmerzen, Bauchweh, Haut, Verdauung oder Konzentrationsprobleme ernsthaft nachhalten.',
      ]),
      item('Arztbesuche organisatorisch vorbereiten', [
        'Unterlagen, Zeiten, Fragen und Begleitung sauber klären.',
      ]),
      item('Gesunde Routinen stärken', [
        'Zähne, Bewegung, Trinken, Schlaf und Erholung im Alltag mitdenken.',
      ]),
      item('Wetter- und Saisonthemen absichern', [
        'Sonne, Kälte, Zecken, Sport oder Schwimmen passend gesundheitlich mitdenken.',
      ]),
      item('Gesamtüberblick über Gesundheit halten', [
        'Alle laufenden Themen, Beobachtungen und Termine zuverlässig zusammenhalten.',
      ]),
    ],
    babyalltag_pflege: [
      item('Mahlzeiten und Schulversorgung steuern', [
        'Frühstück, Brotdose, Snacks und Trinken für Schule und Freizeit im Blick behalten.',
      ]),
      item('Kleidung für Schule, Sport und Wetter organisieren', [
        'Passende Sachen für Alltag und Termine rechtzeitig bereithalten.',
      ]),
      item('Hygiene und Körperpflege begleiten', [
        'Duschen, Zähne, Haare, Nägel und gepflegte Routinen im Blick behalten.',
      ]),
      item('Morgen- und Abendroutine stabil halten', [
        'Losgehen, Heimkommen, Hausaufgaben und Schlafenszeit verlässlich strukturieren.',
      ]),
      item('Selbstständigkeit im Alltag fördern', [
        'Tasche packen, Sachen mitnehmen, Verantwortlichkeiten übernehmen und Verantwortung schrittweise übergeben.',
      ]),
      item('Sport- und Hobbyausstattung mitdenken', [
        'Sportsachen, Instrument, Schwimmsachen oder Material rechtzeitig bereithalten.',
      ]),
      item('Wechsel und Übergänge im Tagesablauf begleiten', [
        'Zwischen Schule, Freizeit, Zuhause und Terminen gute Abläufe sicherstellen.',
      ]),
      item('Kleidung und Schuhe rechtzeitig erneuern', [
        'Zu klein, kaputt oder unpassend gewordene Dinge früh erkennen.',
      ]),
      item('Schulsachen im Alltag funktionsfähig halten', [
        'Federmappe, Hefte, Hausaufgabenmaterial und Taschenlogik im Blick behalten.',
      ]),
      item('Gesamtüberblick über tägliche Bedürfnisse halten', [
        'Essen, Kleidung, Pflege, Schule und Selbstständigkeit als Paket steuern.',
      ]),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Schulmaterial rechtzeitig ergänzen', [
        'Hefte, Stifte, Bastelsachen und Verbrauchsmaterial im Blick behalten.',
      ]),
      item('Kleidung, Unterwäsche und Sportsachen verfügbar halten', [
        'Sauber, passend und einsatzbereit organisieren.',
      ]),
      item('Brotdose, Trinkflasche und Alltagsmaterial pflegen', [
        'Reinigen, auffüllen und ersetzen, wenn etwas fehlt oder kaputt ist.',
      ]),
      item('Hobby- und Sportbedarf im Griff haben', [
        'Ausrüstung, Kleidung oder Zubehör rechtzeitig beschaffen.',
      ]),
      item('Saisonkleidung und Außensachen vorbereiten', [
        'Regenjacke, Badesachen, Wintersachen oder Hallenschuhe im Blick behalten.',
      ]),
      item('Snacks und Lebensmittel für Schulwoche planen', [
        'So einkaufen, dass morgens und nachmittags alles da ist.',
      ]),
      item('Verlorene oder defekte Dinge ersetzen', [
        'Schulsachen, Kleidung oder Sportmaterial rechtzeitig neu organisieren.',
      ]),
      item('Verbrauchsmaterial für Lernen und Kreatives sichern', [
        'Kleber, Papier, Farben oder sonstige Dinge nachkaufen, bevor sie fehlen.',
      ]),
      item('Wochenenden, Ferien und besondere Tage vorbereiten', [
        'Vorräte und Bedarf für Ausnahmen rechtzeitig mitdenken.',
      ]),
      item('Gesamtüberblick über kindbezogene Vorräte halten', [
        'Wissen, was da ist, was fehlt und was bald wieder gebraucht wird.',
      ]),
    ],
  },
  '10_plus': {
    betreuung_entwicklung: [
      item('Schule, Belastung und Erholung balancieren', [
        'Wahrnehmen, wie Anforderungen, Schlaf und Freizeit zusammenpassen und wo Entlastung nötig ist.',
      ]),
      item('Selbstständigkeit gezielt übergeben', [
        'Verantwortung Schritt für Schritt abgeben, aber wichtige Themen weiter im Blick behalten.',
      ]),
      item('Prüfungs- und Leistungsphasen begleiten', [
        'Rechtzeitig erkennen, wann mehr Struktur, Ruhe oder Unterstützung nötig ist.',
      ]),
      item('Zukunfts- und Orientierungsthemen mitdenken', [
        'Schule, Praktika, Interessen und erste Weichenstellungen passend begleiten.',
      ]),
      item('Medien, Handy und digitale Routinen im Blick behalten', [
        'Regeln und Balance zwischen Eigenverantwortung und Rahmung immer wieder anpassen.',
      ]),
      item('Psychische Belastung früh wahrnehmen', [
        'Stimmung, Rückzug, Druck oder Überforderung ernst nehmen und nicht übersehen.',
      ]),
      item('Freundschaften, Konflikte und soziale Themen begleiten', [
        'Wissen, was ungefähr läuft und wo Gespräch oder Halt nötig ist.',
      ]),
      item('Freiräume und Grenzen passend austarieren', [
        'Nicht zu eng, nicht zu offen. Regeln und Vertrauen passend weiterentwickeln.',
      ]),
      item('Alltagsroutinen an das Jugendalter anpassen', [
        'Schlaf, Lernen, Wochenrhythmus und Eigenorganisation realistisch neu denken.',
      ]),
      item('Gesamtüberblick über Entwicklung und Begleitung halten', [
        'Eigenständigkeit, Schule, Stimmung und Anforderungen zusammen im Blick behalten.',
      ]),
    ],
    gesundheit: [
      item('Vorsorge, Zahnarzt und Impfungen steuern', [
        'Auch im Jugendalter wichtige Gesundheitstermine verlässlich im Blick behalten.',
      ]),
      item('Beschwerden und Warnzeichen ernsthaft beobachten', [
        'Körperliche und psychische Auffälligkeiten früh erkennen und einordnen.',
      ]),
      item('Medikamente und gesundheitliche Selbstverantwortung begleiten', [
        'Nachhalten, was da ist, wie es genommen wird und wo noch Unterstützung nötig ist.',
      ]),
      item('Schlaf, Erschöpfung und Stress im Blick behalten', [
        'Erkennen, wenn Belastung zu hoch wird oder Routinen kippen.',
      ]),
      item('Bewegung, Ernährung und Regeneration mitdenken', [
        'Gesunde Grundroutinen nicht aus dem Blick verlieren.',
      ]),
      item('Arzttermine und Abklärungen organisieren', [
        'Fragen, Termine, Unterlagen und passende Begleitung bei Bedarf steuern.',
      ]),
      item('Gesundheitsunterlagen und Nachweise griffbereit halten', [
        'Impfstatus, Atteste, Versicherungsdaten oder Bescheinigungen ordentlich organisieren.',
      ]),
      item('Wiederkehrende Beschwerden nachhalten', [
        'Kopfschmerzen, Bauchweh, Haut, Stimmung oder Erschöpfung ernsthaft verfolgen.',
      ]),
      item('Schutz- und Risikothemen mitdenken', [
        'Sonne, Sport, Verletzung, Erholung und altersgerechte Gesundheitsthemen im Blick behalten.',
      ]),
      item('Gesamtüberblick über Gesundheit halten', [
        'Wissen, was ansteht, was beobachtet wird und wo gehandelt werden muss.',
      ]),
    ],
    babyalltag_pflege: [
      item('Essen, Trinken und Tagesstruktur im Blick behalten', [
        'Auch bei mehr Eigenständigkeit wahrnehmen, wenn Grundroutinen wegrutschen.',
      ]),
      item('Schlafrhythmus und Morgenstart stabilisieren', [
        'Wochenalltag, Schule und Erholung so mitdenken, dass es nicht kippt.',
      ]),
      item('Kleidung, Ausrüstung und besondere Anlässe organisieren', [
        'Alltag, Schule, Sport, Events oder Praktika passend vorbereiten.',
      ]),
      item('Hygiene und Grundpflege im Blick behalten', [
        'Nicht kontrollierend, aber aufmerksam begleiten, wo Routinen wegbrechen.',
      ]),
      item('Schulalltag und Eigenorganisation unterstützen', [
        'Material, Unterlagen, Lernphasen und Termine bei Bedarf mitstrukturieren.',
      ]),
      item('Prüfungsphasen alltagstauglich absichern', [
        'Ruhe, Essen, Zeitfenster und Belastungssteuerung mitdenken.',
      ]),
      item('Zimmer, Wäsche und eigene Verantwortung begleiten', [
        'Mehr Verantwortung übergeben, aber Engpässe oder Chaos nicht ignorieren.',
      ]),
      item('Mobilität und Unterwegs-Bedarf organisieren', [
        'Wege, Sport, Ausflüge oder Reisen praktisch mitdenken.',
      ]),
      item('Selbstständigkeit in Alltagsschritten ausbauen', [
        'Eigene Termine, Dinge packen, Prioritäten setzen und Verantwortung schrittweise stärken.',
      ]),
      item('Gesamtüberblick über tägliche Bedürfnisse halten', [
        'Wo läuft es selbstständig, wo braucht es noch Struktur oder Erinnerung.',
      ]),
    ],
    haushalt_einkaeufe_vorraete: [
      item('Kleidung und Saisonbedarf rechtzeitig erneuern', [
        'Alltag, Sport, Schule und Wetter passend ausstatten.',
      ]),
      item('Schul- und Lernmaterial verfügbar halten', [
        'Hefte, Technik, Zubehör und Verbrauchssachen rechtzeitig ergänzen.',
      ]),
      item('Sport-, Hobby- und Freizeitausrüstung im Blick behalten', [
        'Fehlendes, Unpassendes oder Defektes früh erkennen und ersetzen.',
      ]),
      item('Snacks, Schulverpflegung und Alltagsbedarf planen', [
        'So einkaufen, dass im Alltag genug da ist.',
      ]),
      item('Wäsche und alltagstaugliche Verfügbarkeit sichern', [
        'Saubere Kleidung, Sportzeug und besondere Sachen rechtzeitig bereithalten.',
      ]),
      item('Technische Alltagsdinge mitdenken', [
        'Ladekabel, Rechnerzubehör, Taschenrechner oder schulrelevante Kleinteile nicht aus dem Blick verlieren.',
      ]),
      item('Prüfungs-, Reise- oder Praktikumsbedarf vorbereiten', [
        'Unterlagen, Kleidung, Material und Besonderheiten rechtzeitig beschaffen.',
      ]),
      item('Verlorene oder kaputte Dinge ersetzen', [
        'Schulsachen, Schlüsselgegenstände oder Ausrüstung zügig neu organisieren.',
      ]),
      item('Vorräte für stressige Wochen sichern', [
        'In Prüfungszeiten oder dichten Wochen genug Alltagsmaterial im Haus haben.',
      ]),
      item('Gesamtüberblick über jugendbezogene Vorräte halten', [
        'Wissen, was da ist, was fehlt und was bald wieder gebraucht wird.',
      ]),
    ],
  },
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
