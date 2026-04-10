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
    key: 'quiz.filter.start.title',
    group: 'quiz',
    label: 'Quiz-Start Titel',
    description: 'Hauptüberschrift auf der Quiz-Einstiegsseite.',
    text: { de: 'Quiz starten', en: 'Start quiz', nl: 'Quiz starten' },
  },
  {
    key: 'quiz.filter.start.subtitle',
    group: 'quiz',
    label: 'Quiz-Start Untertitel',
    description: 'Kurzer Einzeiler direkt unter der Überschrift.',
    text: {
      de: 'Anonym in etwa 3 Minuten zur Transparenz.',
      en: 'Anonymously to transparency in about 3 minutes.',
      nl: 'Anoniem in ongeveer 3 minuten naar transparantie.',
    },
  },
  {
    key: 'quiz.filter.start.focus.kicker',
    group: 'quiz',
    label: 'Quiz-Start Fokus Kicker',
    description: 'Kicker über dem Altersfokus-Block.',
    text: {
      de: 'Mental-Load-Fokus',
      en: 'Mental load focus',
      nl: 'Mental-load focus',
    },
  },
  {
    key: 'quiz.filter.start.focus.title',
    group: 'quiz',
    label: 'Quiz-Start Fokus Titel',
    description: 'Titel des Altersfokus-Blocks.',
    text: {
      de: 'Passende Perspektiven für jede Entwicklungsphase',
      en: 'Relevant perspectives for every development phase',
      nl: 'Passende perspectieven voor elke ontwikkelingsfase',
    },
  },
  {
    key: 'quiz.filter.start.focus.age.0_1',
    group: 'quiz',
    label: 'Quiz-Start Altersfokus 0-1',
    description: 'Bezeichnung für Altersfokus 0 bis 1 Jahre.',
    text: { de: 'Babys', en: 'Babies', nl: "Baby's" },
  },
  {
    key: 'quiz.filter.start.focus.age.1_3',
    group: 'quiz',
    label: 'Quiz-Start Altersfokus 1-3',
    description: 'Bezeichnung für Altersfokus 1 bis 3 Jahre.',
    text: { de: 'Kleinkinder', en: 'Toddlers', nl: 'Peuters' },
  },
  {
    key: 'quiz.filter.start.focus.age.3_6',
    group: 'quiz',
    label: 'Quiz-Start Altersfokus 3-6',
    description: 'Bezeichnung für Altersfokus 3 bis 6 Jahre.',
    text: { de: 'Kinder im Kita-Alter (3-6 Jahre)', en: 'Preschool children (3-6 years)', nl: 'Kinderen in de kleuterfase (3-6 jaar)' },
  },
  {
    key: 'quiz.filter.start.focus.age.6_12',
    group: 'quiz',
    label: 'Quiz-Start Altersfokus 6-12',
    description: 'Bezeichnung für Altersfokus 6 bis 12 Jahre.',
    text: { de: 'Schulkinder', en: 'School-age children', nl: 'Schoolkinderen' },
  },
  {
    key: 'quiz.filter.start.focus.age.12_18',
    group: 'quiz',
    label: 'Quiz-Start Altersfokus 12-18',
    description: 'Bezeichnung für Altersfokus 12 bis 18 Jahre.',
    text: { de: 'Jugendliche', en: 'Teenagers', nl: 'Jongeren' },
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
      de: 'Innerhalb von etwa 3 Minuten anonym zum ersten Ergebnis.',
      en: 'Reach your first result anonymously in about 3 minutes.',
      nl: 'Binnen ongeveer 3 minuten anoniem naar een eerste resultaat.',
    },
  },
  {
    key: 'quiz.filter.intro.text',
    group: 'quiz',
    label: 'Quiz-Filter Einführung Text',
    description: 'Kurze Erklärung vor den Vorabfragen.',
    text: {
      de: 'Danach entscheidest du, ob dein Partner das Quiz ebenfalls ausfüllt.',
      en: 'Afterwards, you decide whether your partner also completes the quiz.',
      nl: 'Daarna beslissen jullie of je partner de quiz ook invult.',
    },
  },
  {
    key: 'quiz.filter.intro.kicker',
    group: 'quiz',
    label: 'Quiz-Filter Einführung Kicker',
    description: 'Kurzer Einstieg oberhalb der Ablaufkarte.',
    text: {
      de: 'So läuft euer Start ab',
      en: 'How your start works',
      nl: 'Zo werkt jullie start',
    },
  },
  {
    key: 'quiz.filter.intro.step1',
    group: 'quiz',
    label: 'Quiz-Filter Einführung Schritt 1',
    description: 'Erster Ablaufschritt auf der Quiz-Einstiegsseite.',
    text: {
      de: 'Du bekommst zuerst allein eine kurze, anonyme Auswertung als klaren ersten Überblick.',
      en: 'You first get a short anonymous result on your own as a clear initial overview.',
      nl: 'Je krijgt eerst alleen een korte, anonieme uitkomst als helder eerste overzicht.',
    },
  },
  {
    key: 'quiz.filter.intro.step2',
    group: 'quiz',
    label: 'Quiz-Filter Einführung Schritt 2',
    description: 'Zweiter Ablaufschritt auf der Quiz-Einstiegsseite.',
    text: {
      de: 'Anschließend entscheidest du, ob dein Partner ebenfalls mitmacht, damit ihr die Ergebnisse gemeinsam transparent einordnen könnt.',
      en: 'Then you can decide if your partner should join too, so you can interpret the results together transparently.',
      nl: 'Daarna kunnen jullie beslissen of je partner ook meedoet, zodat jullie de resultaten samen transparant kunnen duiden.',
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
    text: { de: 'FairCare hilft euch, Verantwortung in der Erziehung im Alltag greifbar zu machen. Mit Quiz, klaren Verantwortungsgebieten und Team-Check-ins.', en: 'FairCare helps you make invisible responsibility in everyday life tangible. With quiz, clear task areas and team check-ins.', nl: 'FairCare helpt jullie om onzichtbare verantwoordelijkheid in het dagelijks leven tastbaar te maken. Met quiz, duidelijke taakgebieden en team check-ins.' },
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
    key: 'landing.hero.quick_result',
    group: 'landing',
    label: 'Hero Quick Result Hint',
    description: 'Kurzer Hinweis zwischen Hero-Text und primärem CTA.',
    text: {
      de: 'Innerhalb 3 Minuten anonym zum ersten Ergebnis.',
      en: 'Get your first anonymous result in about 3 minutes.',
      nl: 'Binnen 3 minuten anoniem naar een eerste resultaat.',
    },
  },
  {
    key: 'landing.quiz_focus.title',
    group: 'landing',
    label: 'Quiz Focus Title',
    description: 'Titel des Mental-Load-Fokusblocks unter dem Hero.',
    text: {
      de: 'FairCare fokussiert auf Mental Load in der Erziehung.',
      en: 'FairCare focuses on mental load in parenting.',
      nl: 'FairCare focust op mentale belasting in de opvoeding.',
    },
  },
  {
    key: 'landing.quiz_focus.text',
    group: 'landing',
    label: 'Quiz Focus Text',
    description: 'Haupttext des Mental-Load-Fokusblocks.',
    text: {
      de: 'Jede Altersgruppe bringt neue Verantwortungen mit sich.',
      en: 'Each age group brings new responsibilities.',
      nl: 'Elke leeftijdsgroep brengt nieuwe verantwoordelijkheden met zich mee.',
    },
  },
  {
    key: 'landing.quiz_focus.hint',
    group: 'landing',
    label: 'Quiz Focus Hint',
    description: 'Zusätzlicher Hinweistext im Mental-Load-Fokusblock.',
    text: {
      de: 'FairCare hilft euch, die sich je Altersklasse ständig ändernden Verantwortungen klar im Blick zu behalten.',
      en: 'FairCare helps you keep shared responsibilities in view at all times.',
      nl: 'FairCare helpt jullie om gezamenlijke verantwoordelijkheden steeds goed in beeld te houden.',
    },
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
    text: { de: 'Das Quiz zeigt, wie Verantwortung heute verteilt ist.', en: 'The quiz shows how responsibility is distributed today.', nl: 'De quiz laat zien hoe verantwoordelijkheid vandaag verdeeld is.' },
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
    text: { de: 'Eine offene Diskussion führen, was für Euch eine faire Verteilung bedeutet.', en: 'You discuss the results without judgment', nl: 'Jullie bespreken de resultaten zonder oordeel' },
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
    text: { de: '', en: '', nl: '' },
  },
  {
    key: 'landing.differentiation.text',
    group: 'landing',
    label: 'Differentiation Text',
    description: 'Haupttext des Differentiation-Abschnitts.',
    text: { de: '', en: '', nl: '' },
  },
  {
    key: 'landing.differentiation.bullet1',
    group: 'landing',
    label: 'Differentiation Bullet 1',
    description: 'Erster Bullet im Differentiation-Abschnitt.',
    text: { de: '', en: '', nl: '' },
  },
  {
    key: 'landing.differentiation.bullet2',
    group: 'landing',
    label: 'Differentiation Bullet 2',
    description: 'Zweiter Bullet im Differentiation-Abschnitt.',
    text: { de: '', en: '', nl: '' },
  },
  {
    key: 'landing.differentiation.bullet3',
    group: 'landing',
    label: 'Differentiation Bullet 3',
    description: 'Dritter Bullet im Differentiation-Abschnitt.',
    text: { de: '', en: '', nl: '' },
  },
  {
    key: 'landing.differentiation.additional',
    group: 'landing',
    label: 'Differentiation Additional Text',
    description: 'Zusätzlicher Text im Differentiation-Abschnitt.',
    text: { de: '', en: '', nl: '' },
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
