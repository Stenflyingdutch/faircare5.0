import type { LocalizedText } from '@/types/i18n';

export type TextBlockGroup =
  | 'navigation'
  | 'auth'
  | 'dashboard'
  | 'quiz'
  | 'results'
  | 'tasks'
  | 'review'
  | 'settings'
  | 'admin'
  | 'onboarding'
  | 'emails'
  | 'system';

export interface TextBlockDefinition {
  key: string;
  group: TextBlockGroup;
  label: string;
  description: string;
  text: LocalizedText;
}

export const defaultTextBlocks: TextBlockDefinition[] = [
  {
    key: 'quiz.filter.title',
    group: 'quiz',
    label: 'Quiz-Filter Titel',
    description: 'Titel auf der Einstiegsseite vor dem Quiz.',
    text: { de: 'Vor dem Quiz', en: 'Before the quiz', nl: 'Voor de quiz' },
  },
  {
    key: 'quiz.filter.step',
    group: 'quiz',
    label: 'Quiz-Filter Schrittanzeige',
    description: 'Schrittanzeige mit Variablen {current} und {total}.',
    text: { de: 'Schritt {current} von {total}', en: 'Step {current} of {total}', nl: 'Stap {current} van {total}' },
  },
  {
    key: 'quiz.filter.childCount',
    group: 'quiz',
    label: 'Frage Kinderanzahl',
    description: 'Filterfrage zur Anzahl der Kinder.',
    text: { de: 'Wie viele Kinder habt ihr?', en: 'How many children do you have?', nl: 'Hoeveel kinderen hebben jullie?' },
  },
  {
    key: 'quiz.filter.ageGroup',
    group: 'quiz',
    label: 'Frage Altersgruppe',
    description: 'Filterfrage zur Altersgruppe des jüngsten Kindes.',
    text: { de: 'Wie alt ist das jüngste Kind?', en: 'How old is your youngest child?', nl: 'Hoe oud is jullie jongste kind?' },
  },
  {
    key: 'quiz.filter.childcare',
    group: 'quiz',
    label: 'Frage Betreuung',
    description: 'Filterfrage zu externer Betreuung.',
    text: {
      de: 'Welche externe Betreuung nutzt ihr aktuell? (Mehrfachauswahl)',
      en: 'Which external childcare are you currently using? (multiple choice)',
      nl: 'Welke externe opvang gebruiken jullie momenteel? (meerdere keuzes)',
    },
  },
  {
    key: 'quiz.filter.split',
    group: 'quiz',
    label: 'Frage Aufteilung',
    description: 'Filterfrage zur Klarheit der Aufgabenverteilung.',
    text: { de: 'Wie klar ist eure Aufteilung heute?', en: 'How clear is your current division?', nl: 'Hoe duidelijk is jullie huidige verdeling?' },
  },
  {
    key: 'common.back',
    group: 'navigation',
    label: 'Zurück-Button',
    description: 'Standardtext für Zurück-Navigation.',
    text: { de: 'Zurück', en: 'Back', nl: 'Terug' },
  },
  {
    key: 'common.next',
    group: 'navigation',
    label: 'Weiter-Button',
    description: 'Standardtext für Weiter-Navigation.',
    text: { de: 'Weiter', en: 'Next', nl: 'Volgende' },
  },
  {
    key: 'quiz.preparing',
    group: 'quiz',
    label: 'Quiz wird vorbereitet',
    description: 'Statusmeldung beim Erstellen der Session.',
    text: { de: 'Quiz wird vorbereitet …', en: 'Preparing quiz …', nl: 'Quiz wordt voorbereid …' },
  },
  {
    key: 'quiz.error.selectFirst',
    group: 'system',
    label: 'Fehler unvollständige Auswahl',
    description: 'Fehlermeldung bei unvollständigen Antworten im Filter.',
    text: { de: 'Bitte triff zuerst eine Auswahl.', en: 'Please select an option first.', nl: 'Maak eerst een keuze.' },
  },
  {
    key: 'quiz.error.ageUnsupported',
    group: 'system',
    label: 'Fehler Altersgruppe',
    description: 'Fehlermeldung bei aktuell nicht unterstützt Altersgruppe.',
    text: {
      de: 'Aktuell wird nur die Altersgruppe 0–1 Jahre unterstützt.',
      en: 'Currently only age group 0–1 years is supported.',
      nl: 'Momenteel wordt alleen de leeftijdsgroep 0–1 jaar ondersteund.',
    },
  },
  {
    key: 'admin.title',
    group: 'admin',
    label: 'Admin Titel',
    description: 'Titel des Admin-Einstiegs.',
    text: { de: 'Admin-Bereich', en: 'Admin Area', nl: 'Beheeromgeving' },
  },
  {
    key: 'admin.subtitle',
    group: 'admin',
    label: 'Admin Untertitel',
    description: 'Beschreibung auf der Admin-Startseite.',
    text: {
      de: 'Hier werden Inhalte gepflegt und strukturiert verwaltet.',
      en: 'Content is maintained and managed in a structured way here.',
      nl: 'Hier wordt inhoud gestructureerd beheerd en onderhouden.',
    },
  },
];

export const defaultTextBlockMap = Object.fromEntries(defaultTextBlocks.map((entry) => [entry.key, entry.text]));
