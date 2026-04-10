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
  | 'system'
  | 'landing';

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
    text: { de: 'Mach sichtbar, was sonst untergeht.', en: 'Make visible what would otherwise go unnoticed.', nl: 'Maak zichtbaar wat anders onder de radar blijft.' },
  },
  {
    key: 'quiz.filter.step',
    group: 'quiz',
    label: 'Quiz-Filter Schrittanzeige',
    description: 'Schrittanzeige mit Variablen {current} und {total}.',
    text: { de: 'Schritt {current} von {total}', en: 'Step {current} of {total}', nl: 'Stap {current} van {total}' },
  },
  {
    key: 'quiz.filter.intro.title',
    group: 'quiz',
    label: 'Quiz-Filter Einführung Titel',
    description: 'Einladende Überschrift vor den Vorabfragen.',
    text: {
      de: 'Mach sichtbar, was sonst untergeht.',
      en: 'Make visible what would otherwise go unnoticed.',
      nl: 'Maak zichtbaar wat anders onder de radar blijft.',
    },
  },
  {
    key: 'quiz.filter.intro.text',
    group: 'quiz',
    label: 'Quiz-Filter Einführung Text',
    description: 'Kurze Erklärung vor den Vorabfragen.',
    text: {
      de: 'Beantwortet die nächsten Fragen aus eurer Sicht. So entsteht ein ehrlicher Startpunkt für ein gemeinsames Gespräch über Verantwortung und Verteilung.',
      en: 'Answer the next questions from your perspective. This creates an honest starting point for a shared conversation about responsibility and distribution.',
      nl: 'Beantwoord de volgende vragen vanuit jullie perspectief. Zo ontstaat een eerlijk startpunt voor een gezamenlijk gesprek over verantwoordelijkheid en verdeling.',
    },
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
    description: 'Filterfrage zur Klarheit der Verantwortlichkeiten.',
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
    description: 'Fehlermeldung, wenn für die ausgewählte Altersgruppe gerade keine Fragen geladen werden konnten.',
    text: {
      de: 'Für diese Altersgruppe konnten gerade keine passenden Fragen geladen werden.',
      en: 'No matching questions could be loaded for this age group right now.',
      nl: 'Voor deze leeftijdsgroep konden op dit moment geen passende vragen worden geladen.',
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
  // Landing page texts
  {
    key: 'landing.hero.headline',
    group: 'landing',
    label: 'Hero Headline',
    description: 'Hauptüberschrift im Hero-Bereich.',
    text: { de: 'Mental Load sichtbar machen. Gemeinsam besser verteilen.', en: 'Make mental load visible. Distribute together better.', nl: 'Mental Load zichtbaar maken. Samen beter verdelen.' },
  },
  {
    key: 'landing.hero.subline',
    group: 'landing',
    label: 'Hero Subline',
    description: 'Untertitel im Hero-Bereich.',
    text: { de: 'FairCare hilft euch, unsichtbare Verantwortung im Alltag greifbar zu machen. Mit Quiz, klaren Verantwortungsgebieten und Team-Check-ins.', en: 'FairCare helps you make invisible responsibility in everyday life tangible. With quiz, clear task areas and team check-ins.', nl: 'FairCare helpt jullie om onzichtbare verantwoordelijkheid in het dagelijks leven tastbaar te maken. Met quiz, duidelijke taakgebieden en team check-ins.' },
  },
  {
    key: 'landing.hero.cta_primary',
    group: 'landing',
    label: 'Hero Primary CTA',
    description: 'Primärer Call-to-Action im Hero.',
    text: { de: 'Quiz starten', en: 'Start quiz', nl: 'Quiz starten' },
  },
  {
    key: 'landing.hero.cta_secondary',
    group: 'landing',
    label: 'Hero Secondary CTA',
    description: 'Sekundärer Call-to-Action im Hero.',
    text: { de: 'Mehr erfahren', en: 'Learn more', nl: 'Meer weten' },
  },
  {
    key: 'landing.problem.point1.title',
    group: 'landing',
    label: 'Problem Point 1 Title',
    description: 'Titel des ersten Problem-Punkts.',
    text: { de: 'Sichtbar machen', en: 'Make visible', nl: 'Zichtbaar maken' },
  },
  {
    key: 'landing.problem.point1.text',
    group: 'landing',
    label: 'Problem Point 1 Text',
    description: 'Text des ersten Problem-Punkts.',
    text: { de: 'Das Quiz zeigt, wie Verantwortung heute verteilt ist', en: 'The quiz shows how responsibility is distributed today', nl: 'De quiz toont hoe verantwoordelijkheid vandaag verdeeld is' },
  },
  {
    key: 'landing.problem.point2.title',
    group: 'landing',
    label: 'Problem Point 2 Title',
    description: 'Titel des zweiten Problem-Punkts.',
    text: { de: 'Gemeinsam einordnen', en: 'Classify together', nl: 'Samen indelen' },
  },
  {
    key: 'landing.problem.point2.text',
    group: 'landing',
    label: 'Problem Point 2 Text',
    description: 'Text des zweiten Problem-Punkts.',
    text: { de: 'Ihr besprecht die Ergebnisse ohne Bewertung', en: 'You discuss the results without judgment', nl: 'Jullie bespreken de resultaten zonder oordeel' },
  },
  {
    key: 'landing.problem.point3.title',
    group: 'landing',
    label: 'Problem Point 3 Title',
    description: 'Titel des dritten Problem-Punkts.',
    text: { de: 'Fair verteilen', en: 'Distribute clearly', nl: 'Duidelijk verdelen' },
  },
  {
    key: 'landing.problem.point3.text',
    group: 'landing',
    label: 'Problem Point 3 Text',
    description: 'Text des dritten Problem-Punkts.',
    text: { de: 'Verantwortlichkeiten werden strukturiert und nachvollziehbar', en: 'Responsibilities are structured and traceable', nl: 'Verantwoordelijkheden worden gestructureerd en traceerbaar' },
  },
  {
    key: 'landing.differentiation.headline',
    group: 'landing',
    label: 'Differentiation Headline',
    description: 'Überschrift des Differentiation-Abschnitts.',
    text: { de: 'Keine To-do-App', en: 'No to-do app', nl: 'Geen to-do app' },
  },
  {
    key: 'landing.differentiation.text',
    group: 'landing',
    label: 'Differentiation Text',
    description: 'Haupttext des Differentiation-Abschnitts.',
    text: { de: 'FairCare zeigt nicht, was erledigt werden muss. FairCare zeigt, wer im Alltag mitdenkt, plant und organisiert.', en: 'FairCare is not about checking off responsibilities. It makes visible who thinks along, plans and organizes in everyday life.', nl: 'FairCare gaat niet om verantwoordelijkheden af te vinken. Het maakt zichtbaar wie in het dagelijks leven meedenkt, plant en organiseert.' },
  },
  {
    key: 'landing.differentiation.bullet1',
    group: 'landing',
    label: 'Differentiation Bullet 1',
    description: 'Erster Bullet im Differentiation-Abschnitt.',
    text: {
      de: 'Keine Schuldzuweisung: Die Auswertung ist ein Gesprächsstart, kein Urteil.',
      en: 'No blame: The evaluation is a conversation starter, not a verdict.',
      nl: 'Geen schuldvraag: de uitkomst is een gespreksstarter, geen oordeel.',
    },
  },
  {
    key: 'landing.differentiation.bullet2',
    group: 'landing',
    label: 'Differentiation Bullet 2',
    description: 'Zweiter Bullet im Differentiation-Abschnitt.',
    text: {
      de: 'Beide Perspektiven zählen: Ihr beantwortet Fragen aus eurer jeweils eigenen Sicht.',
      en: 'Both perspectives matter: each of you answers from your own point of view.',
      nl: 'Beide perspectieven tellen: ieder antwoordt vanuit het eigen perspectief.',
    },
  },
  {
    key: 'landing.differentiation.bullet3',
    group: 'landing',
    label: 'Differentiation Bullet 3',
    description: 'Dritter Bullet im Differentiation-Abschnitt.',
    text: {
      de: 'Konkrete nächste Schritte: Aus Ergebnissen werden alltagstaugliche Vereinbarungen.',
      en: 'Concrete next steps: turn insights into practical agreements.',
      nl: 'Concrete vervolgstappen: van inzichten naar werkbare afspraken.',
    },
  },
  {
    key: 'landing.differentiation.additional',
    group: 'landing',
    label: 'Differentiation Additional Text',
    description: 'Zusätzlicher Text im Differentiation-Abschnitt.',
    text: { de: 'FairCare bewertet nicht. FairCare schafft Klarheit.', en: 'FairCare does not judge. It creates transparency.', nl: 'FairCare beoordeelt niet. Het creëert transparantie.' },
  },
  {
    key: 'landing.process.title',
    group: 'landing',
    label: 'Process Section Title',
    description: 'Titel des Wie es funktioniert Abschnitts.',
    text: { de: 'Wie es funktioniert', en: 'How it works', nl: 'Hoe het werkt' },
  },
  {
    key: 'landing.process.step1.title',
    group: 'landing',
    label: 'Process Step 1 Title',
    description: 'Titel des ersten Prozess-Schritts.',
    text: { de: 'Load sichtbar', en: 'Load visible', nl: 'Load zichtbaar' },
  },
  {
    key: 'landing.process.step1.text',
    group: 'landing',
    label: 'Process Step 1 Text',
    description: 'Text des ersten Prozess-Schritts.',
    text: { de: 'Quiz macht Mental Load greifbar', en: 'Quiz makes mental load tangible', nl: 'Quiz maakt Mental Load tastbaar' },
  },
  {
    key: 'landing.process.step2.title',
    group: 'landing',
    label: 'Process Step 2 Title',
    description: 'Titel des zweiten Prozess-Schritts.',
    text: { de: 'Ergebnis besprechen', en: 'Discuss result', nl: 'Resultaat bespreken' },
  },
  {
    key: 'landing.process.step2.text',
    group: 'landing',
    label: 'Process Step 2 Text',
    description: 'Text des zweiten Prozess-Schritts.',
    text: { de: 'Gemeinsam reflektieren', en: 'Reflect together', nl: 'Samen reflecteren' },
  },
  {
    key: 'landing.process.step3.title',
    group: 'landing',
    label: 'Process Step 3 Title',
    description: 'Titel des dritten Prozess-Schritts.',
    text: { de: 'Verantwortungsbereiche zuordnen', en: 'Assign responsibilities', nl: 'Verantwoordelijkheidsgebieden toewijzen' },
  },
  {
    key: 'landing.process.step3.text',
    group: 'landing',
    label: 'Process Step 3 Text',
    description: 'Text des dritten Prozess-Schritts.',
    text: { de: 'Verantwortung klar definieren', en: 'Define responsibility clearly', nl: 'Verantwoordelijkheid duidelijk definiëren' },
  },
  {
    key: 'landing.process.step4.title',
    group: 'landing',
    label: 'Process Step 4 Title',
    description: 'Titel des vierten Prozess-Schritts.',
    text: { de: 'Check-ins nutzen', en: 'Use check-ins', nl: 'Check-ins gebruiken' },
  },
  {
    key: 'landing.process.step4.text',
    group: 'landing',
    label: 'Process Step 4 Text',
    description: 'Text des vierten Prozess-Schritts.',
    text: { de: 'Regelmäßig abstimmen', en: 'Align regularly', nl: 'Regelmatig afstemmen' },
  },
  {
    key: 'landing.links.mental_load.title',
    group: 'landing',
    label: 'Mental Load Link Title',
    description: 'Titel des Mental Load Links.',
    text: { de: 'Mental Load Hintergründe', en: 'Mental load backgrounds', nl: 'Mental Load achtergronden' },
  },
  {
    key: 'landing.links.mental_load.text',
    group: 'landing',
    label: 'Mental Load Link Text',
    description: 'Text des Mental Load Links.',
    text: { de: 'Erfahre mehr über unsichtbare Denk- und Planungsarbeit.', en: 'Learn more about invisible thinking and planning work.', nl: 'Leer meer over onzichtbaar denk- en planningswerk.' },
  },
  {
    key: 'landing.links.what_is_faircare.title',
    group: 'landing',
    label: 'What is FairCare Link Title',
    description: 'Titel des What is FairCare Links.',
    text: { de: 'Was ist FairCare', en: 'What is FairCare', nl: 'Wat is FairCare' },
  },
  {
    key: 'landing.links.what_is_faircare.text',
    group: 'landing',
    label: 'What is FairCare Link Text',
    description: 'Text des What is FairCare Links.',
    text: { de: 'Verstehe den Ansatz und die Ziele von FairCare.', en: 'Understand the approach and goals of FairCare.', nl: 'Begrijp de aanpak en doelen van FairCare.' },
  },
  {
    key: 'landing.links.about_us.title',
    group: 'landing',
    label: 'About Us Link Title',
    description: 'Titel des About Us Links.',
    text: { de: 'Über uns', en: 'About us', nl: 'Over ons' },
  },
  {
    key: 'landing.links.about_us.text',
    group: 'landing',
    label: 'About Us Link Text',
    description: 'Text des About Us Links.',
    text: { de: 'Lerne das Team und die Motivation hinter FairCare kennen.', en: 'Get to know the team and the motivation behind FairCare.', nl: 'Leer het team en de motivatie achter FairCare kennen.' },
  },
  {
    key: 'landing.links.mental_load.button',
    group: 'landing',
    label: 'Mental Load Link Button',
    description: 'Button-Text für Mental Load Link.',
    text: { de: 'Erfahren', en: 'Learn', nl: 'Ontdekken' },
  },
  {
    key: 'landing.links.what_is_faircare.button',
    group: 'landing',
    label: 'What is FairCare Link Button',
    description: 'Button-Text für What is FairCare Link.',
    text: { de: 'Verstehen', en: 'Understand', nl: 'Begrijpen' },
  },
  {
    key: 'landing.links.about_us.button',
    group: 'landing',
    label: 'About Us Link Button',
    description: 'Button-Text für About Us Link.',
    text: { de: 'Kennenlernen', en: 'Get to know', nl: 'Leren kennen' },
  },
  {
    key: 'landing.cta_final.text',
    group: 'landing',
    label: 'Final CTA Text',
    description: 'Text des finalen Call-to-Action.',
    text: { de: 'Macht sichtbar, was sonst untergeht.', en: 'Make visible what otherwise slips through.', nl: 'Maak zichtbaar wat anders door de vingers glipt.' },
  },
  {
    key: 'landing.cta_final.button',
    group: 'landing',
    label: 'Final CTA Button',
    description: 'Button-Text des finalen Call-to-Action.',
    text: { de: 'Jetzt Quiz starten', en: 'Start quiz now', nl: 'Start quiz nu' },
  },
];

export const defaultTextBlockMap = Object.fromEntries(defaultTextBlocks.map((entry) => [entry.key, entry.text]));
