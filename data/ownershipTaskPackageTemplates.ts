import type { LocalizedText, LocalizedTextList } from '@/types/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';

export interface OwnershipTemplateSeedItem {
  title: LocalizedText;
  details: LocalizedTextList;
}

const sameAllLocales = (value: string): LocalizedText => ({ de: value, en: value, nl: value });

function item(title: string, details: string[]): OwnershipTemplateSeedItem {
  return {
    title: sameAllLocales(title),
    details: { de: details, en: [], nl: [] },
  };
}

export const ownershipTaskPackageSeedByAgeGroup: Partial<Record<AgeGroup, Record<QuizCategory, OwnershipTemplateSeedItem[]>>> = {
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
};
