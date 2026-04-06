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
    item('Wer wählt passende Spiel- und Lernimpulse aus', 'Welche Aktivitäten passen gerade zum Alter\nWas fördert das Kind sinnvoll\nWas bringt Abwechslung in den Alltag'),
    item('Wer sorgt dafür, dass regelmäßiger Kontakt zu anderen Kindern stattfindet', 'Treffen mit anderen Kindern im Kopf haben\nRegelmäßigkeit im Blick behalten\nGelegenheiten aktiv erkennen'),
    item('Wer sucht passende Kurse und Angebote aus', 'Überblick über Angebote behalten\nEinschätzen, was sinnvoll ist\nZeitpunkt für Teilnahme erkennen'),
    item('Wer organisiert Treffen mit anderen Eltern aktiv', 'Kontakte im Kopf behalten\nAnstoßen, dass Treffen stattfinden\nRegelmäßigkeit sichern'),
    item('Wer plant passende Aktivitäten im Alltag', 'Ideen für den Tag im Kopf haben\nAbwechslung sicherstellen\nAktivität passend zur Situation wählen'),
    item('Wer führt neue Aktivitäten ein. Bücher, Musik, Bewegung', 'Erkennen, wann etwas Neues sinnvoll ist\nNeue Impulse bewusst einbringen\nEntwicklung dadurch anstoßen'),
    item('Wer beobachtet Interessen und passt Aktivitäten daran an', 'Wahrnehmen, was das Kind interessiert\nAktivitäten entsprechend anpassen\nVeränderungen erkennen'),
    item('Wer verfolgt Entwicklungsschritte aktiv', 'Meilensteine im Blick behalten\nEntwicklung einschätzen\nFortschritte bewusst wahrnehmen'),
    item('Wer erkennt frühzeitig Entwicklungsbedarfe', 'Auffälligkeiten erkennen\nUnterstützungsbedarf einschätzen\nHandlungsbedarf ableiten'),
    item('Wer überprüft regelmäßig, ob vorhandenes Spielzeug noch zum Entwicklungsstand passt', 'Spielzeug regelmäßig hinterfragen\nPassung zum Alter prüfen\nBedarf für Veränderung erkennen'),
  ],
  gesundheit: [
    item('Wer behält Vorsorgeuntersuchungen im Blick', 'Nächste U-Untersuchung im Kopf haben\nTiming nicht verpassen\nReihenfolge verstehen'),
    item('Wer behält anstehende Impfungen im Blick', 'Impfstatus kennen\nNächste Schritte im Kopf haben\nZeitfenster berücksichtigen'),
    item('Wer entscheidet, wann ein Arztbesuch nötig ist', 'Symptome einschätzen\nAbwägen, ob Arzt nötig ist\nSicherheit herstellen'),
    item('Wer denkt rechtzeitig an anstehende Arzttermine', 'Termin nicht vergessen\nVorbereitung im Kopf haben\nAblauf antizipieren'),
    item('Wer hält die Hausapotheke einsatzbereit', 'Überblick über vorhandene Mittel\nFehlendes früh erkennen\nEinsatzfähigkeit sicherstellen'),
    item('Wer kennt typische Symptome und kann sie einordnen', 'Fieber, Husten etc. einschätzen\nNormal vs. kritisch unterscheiden\nRuhe oder Handeln ableiten'),
    item('Wer erkennt frühzeitig gesundheitliche Auffälligkeiten', 'Veränderungen wahrnehmen\nAbweichungen erkennen\nrechtzeitig reagieren'),
    item('Wer behält Krankheitsverläufe im Blick', 'Entwicklung einer Krankheit verfolgen\nBesserung oder Verschlechterung erkennen\nnächste Schritte ableiten'),
    item('Wer stellt sicher, dass Gesundheitsinformationen verfügbar sind', 'Wissen griffbereit im Kopf\nwichtige Infos kennen\nZugriff sicherstellen'),
    item('Wer organisiert Krankschreibungen, Atteste und medizinische Nachweise', 'Wissen, wann Nachweise nötig sind\nÜberblick über Anforderungen haben\nrechtzeitig daran denken'),
  ],
  babyalltag_pflege: [
    item('Wer behält den Überblick über tägliche Routinen', 'Tagesstruktur im Kopf haben\nWiederkehrendes koordinieren\nStabilität sichern'),
    item('Wer erkennt, wann Routinen angepasst werden müssen', 'Veränderungen im Verhalten erkennen\nBedarf zur Anpassung ableiten\nTiming einschätzen'),
    item('Wer behält Schlafverhalten und Veränderungen im Blick', 'Schlafmuster kennen\nAbweichungen erkennen\nAnpassungen ableiten'),
    item('Wer denkt an nächste Entwicklungsschritte im Alltag', 'Übergänge antizipieren\nnächste Phase im Kopf haben\nVorbereitung gedanklich leisten'),
    item('Wer sorgt dafür, dass im Alltag alles Notwendige verfügbar ist', 'Bedarf im Kopf behalten\nnichts Wichtiges vergessen\nAlltag reibungslos halten'),
    item('Wer erkennt frühzeitig neue Bedürfnisse des Babys', 'Signale wahrnehmen\nVeränderungen interpretieren\ndarauf reagieren'),
    item('Wer passt den Alltag an Entwicklungsschritte an', 'Alltag flexibel anpassen\nneue Anforderungen integrieren\nStruktur weiterentwickeln'),
    item('Wer behält Wechselkleidung und Bedarf im Blick', 'Größe und Menge im Kopf haben\nBedarf rechtzeitig erkennen\nEngpässe vermeiden'),
    item('Wer sorgt für Struktur im Alltag', 'Orientierung geben\nWiederkehr schaffen\nChaos vermeiden'),
    item('Wer denkt an anstehende Veränderungen im Alltag', 'Übergänge erkennen\nkommende Anpassungen im Kopf haben\nfrühzeitig vorbereiten'),
  ],
  haushalt_einkaeufe_vorraete: [
    item('Wer plant den Wocheneinkauf gedanklich', 'Bedarf im Kopf haben\nkommende Woche antizipieren\nnichts Wichtiges vergessen'),
    item('Wer erkennt frühzeitig, wann Einkäufe nötig werden', 'Vorräte einschätzen\nEngpässe erkennen\nrechtzeitig reagieren'),
    item('Wer behält Vorräte im Blick', 'Bestand kennen\nVerbrauch einschätzen\nÜberblick behalten'),
    item('Wer denkt rechtzeitig an wiederkehrende Besorgungen', 'Regelmäßiges im Kopf behalten\nTiming nicht verpassen\nRoutine sicherstellen'),
    item('Wer sorgt dafür, dass Babybedarf nie ausgeht', 'kritische Produkte im Blick haben\nrechtzeitig nachdenken\nVersorgung sichern'),
    item('Wer behält Haushaltsbedarf im Blick', 'Waschmittel, etc. im Kopf haben\nBedarf erkennen\nEngpässe vermeiden'),
    item('Wer erkennt, wann neue Anschaffungen nötig sind', 'Bedarf antizipieren\nNotwendigkeit einschätzen\nrechtzeitig handeln'),
    item('Wer plant größere Anschaffungen gedanklich', 'Bedarf früh erkennen\nOptionen durchdenken\nEntscheidung vorbereiten'),
    item('Wer behält das Haushaltsbudget im Blick', 'Ausgaben im Kopf haben\nGrenzen einschätzen\nPrioritäten setzen'),
    item('Wer erkennt frühzeitig Engpässe im Haushalt', 'Probleme antizipieren\nRisiken erkennen\nrechtzeitig gegensteuern'),
  ],
};
