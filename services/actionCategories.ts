import { categoryLabelMap } from '@/services/resultCalculator';
import type { QuizCategory, SplitClarity } from '@/types/quiz';

export type ActionCategoryReasonCode =
  | 'shared_burden'
  | 'burden_only_one_side'
  | 'high_score'
  | 'dual_high_score'
  | 'score_gap'
  | 'strong_score_match'
  | 'low_clarity'
  | 'clarity_gap';

export type ActionCategoryPriority = 'high' | 'medium' | 'low';

export interface ActionCategoryRecommendationInput {
  initiatorScores: Record<QuizCategory, number>;
  partnerScores: Record<QuizCategory, number>;
  initiatorBurdenCategories?: QuizCategory[];
  partnerBurdenCategories?: QuizCategory[];
  initiatorClarity?: SplitClarity | null | string;
  partnerClarity?: SplitClarity | null | string;
}

export interface ActionCategoryRecommendationOutput {
  suggestedActionCategories: QuizCategory[];
  optionalActionCategories: QuizCategory[];
  actionCategoryReasons: Partial<Record<QuizCategory, ActionCategoryReasonCode[]>>;
  actionCategoryPriority: Partial<Record<QuizCategory, ActionCategoryPriority>>;
  actionCategorySummaryText: string;
}

export const actionCategoryTaskCatalog: Record<QuizCategory, string[]> = {
  betreuung_entwicklung: [
    'Entwicklungsstand im Blick behalten und passende nächste Schritte anstoßen',
    'Kita oder Betreuungsthemen beobachten, organisieren und nachhalten',
    'Spiel-, Lern- und Förderideen passend zum Alter auswählen und vorbereiten',
    'Eingewöhnung, Übergänge und neue Betreuungssituationen planen und begleiten',
    'Besondere Themen oder Auffälligkeiten wahrnehmen und bei Bedarf abklären',
    'Austausch mit Betreuungspersonen aktiv führen und offene Punkte verfolgen',
    'Routinen für Schlafen, Essen, Spielen oder Medien bewusst weiterentwickeln',
    'Wichtige Anschaffungen für Entwicklung und Alltag rechtzeitig erkennen und organisieren',
    'Besondere Termine rund um Entwicklung oder Förderung koordinieren',
    'Unterlagen, Infos und Entscheidungen rund um Betreuung und Entwicklung gebündelt im Blick behalten',
  ],
  gesundheit: [
    'Arzttermine, Vorsorgen und Impfungen im Blick behalten und organisieren',
    'Akute Krankheitssituationen einschätzen und die nächsten Schritte koordinieren',
    'Medikamente, Hausapotheke und wichtige Gesundheitsprodukte vorrätig halten',
    'Symptome, Besonderheiten oder wiederkehrende Themen beobachten und dokumentieren',
    'Rückfragen an Arzt, Apotheke oder andere Stellen klären und nachhalten',
    'Gesundheitsunterlagen, Impfpass und wichtige Dokumente aktuell halten',
    'Pflege- und Genesungsphasen im Alltag organisieren',
    'Prävention und Gesundheitsthemen im Alltag mitdenken und vorbereiten',
    'Ernährungs- oder gesundheitsspezifische Anforderungen mitorganisieren',
    'Gesundheitliche Notfälle oder dringende Situationen gedanklich mit absichern',
  ],
  babyalltag_pflege: [
    'Windeln, Feuchttücher und Pflegeprodukte rechtzeitig im Blick behalten und nachkaufen',
    'Kleidung, Größenwechsel und alltagsrelevante Babyartikel vorausschauend organisieren',
    'Schlafroutine, Schlafumgebung und passende Anpassungen im Blick behalten',
    'Füttern, Stillen, Fläschchen oder Beikost im Alltag vorbereiten und koordinieren',
    'Tasche für unterwegs, Wechselkleidung und wichtige Babysachen mitdenken und packen',
    'Baden, Pflegeroutine und tägliche Versorgung zuverlässig organisieren',
    'Kinderwagen, Trage, Autositz und andere Alltagshelfer einsatzbereit halten',
    'Besondere Situationen wie Zahnen, Wachstumsschübe oder unruhige Phasen mitorganisieren',
    'Nachschub und Ordnung bei typischen Babythemen aktiv steuern',
    'Alltagsabläufe rund ums Baby vorausschauend planen und anpassen',
  ],
  haushalt_einkaeufe_vorraete: [
    'Lebensmittelbedarf mitdenken, Einkauf planen und Nachschub sichern',
    'Haushaltsprodukte rechtzeitig erkennen, einkaufen und auffüllen',
    'Mahlzeiten grob vorausplanen und fehlende Dinge organisieren',
    'Wäschefluss im Blick behalten und Engpässe vermeiden',
    'Grundordnung in wichtigen Bereichen steuern und nachhalten',
    'Müll, Leergut, Verbrauchsmaterial und wiederkehrende Haushaltsthemen organisieren',
    'Saisonale oder besondere Haushaltsbedarfe rechtzeitig vorbereiten',
    'Lieferungen, Besorgungen und spontane Lücken im Alltag auffangen',
    'Vorräte prüfen, sortieren und rechtzeitig erneuern',
    'Haushaltsaufgaben sinnvoll bündeln und im Alltag anschieben',
  ],
  termine_planung_absprachen: [
    'Familienkalender im Blick behalten und aktuell halten',
    'Termine abstimmen, vorbereiten und nachhalten',
    'Absprachen zwischen beiden aktiv klären und offene Punkte verfolgen',
    'Wiederkehrende Organisationspunkte frühzeitig erkennen und planen',
    'Besondere Wochen, Engpässe oder Ausnahmen im Voraus mitdenken',
    'Externe Betreuung, Hilfe oder Unterstützung koordinieren',
    'To-dos, Fristen und wichtige Erinnerungen verlässlich im Blick behalten',
    'Urlaube, Feiertage oder besondere Anlässe rechtzeitig vorbereiten',
    'Wer macht was bis wann klar festlegen und nachhalten',
    'Informationen aus verschiedenen Themen bündeln und daraus nächste Schritte ableiten',
  ],
};

const allCategories = Object.keys(actionCategoryTaskCatalog) as QuizCategory[];

function getPriorityScore(priority: ActionCategoryPriority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

export function mapReasonCodeToUiText(reasonCode: ActionCategoryReasonCode) {
  const lookup: Record<ActionCategoryReasonCode, string> = {
    shared_burden: 'Hier erlebt ihr beide Belastung.',
    burden_only_one_side: 'Hier liegt sichtbar mehr mentale Last bei einer Person.',
    high_score: 'Hier zeigt sich ein hoher Mental-Load-Wert.',
    dual_high_score: 'Hier zeigen sich bei euch beiden hohe Werte.',
    score_gap: 'Hier gehen eure Einschätzungen deutlich auseinander.',
    strong_score_match: 'Hier passen Belastung und Ergebnisse gut zusammen.',
    low_clarity: 'Hier wirken Zuständigkeiten noch nicht klar genug.',
    clarity_gap: 'Ihr erlebt die Klarheit der Aufteilung unterschiedlich.',
  };

  return lookup[reasonCode];
}

export function buildActionCategorySummaryText(suggestedActionCategories: QuizCategory[]) {
  if (!suggestedActionCategories.length) {
    return 'Fangt klein an und startet mit einem Bereich, den ihr als gut machbar erlebt.';
  }

  const labels = suggestedActionCategories.map((category) => categoryLabelMap[category]);
  if (labels.length === 1) {
    return `Startet am besten mit ${labels[0]}. Ein klar gebündeltes Aufgabenpaket kann dort schnell entlasten.`;
  }

  return `Startet klein mit ${labels[0]} und ${labels[1]}. Danach könnt ihr weitere Bereiche ergänzen.`;
}

export function recommendActionCategories(input: ActionCategoryRecommendationInput): ActionCategoryRecommendationOutput {
  const initiatorBurdens = new Set(input.initiatorBurdenCategories ?? []);
  const partnerBurdens = new Set(input.partnerBurdenCategories ?? []);

  const lowClarity = input.initiatorClarity === 'oft_unklar' || input.partnerClarity === 'oft_unklar';
  const clarityGap = Boolean(input.initiatorClarity && input.partnerClarity && input.initiatorClarity !== input.partnerClarity);

  const reasonsByCategory: Partial<Record<QuizCategory, ActionCategoryReasonCode[]>> = {};
  const priorityByCategory: Partial<Record<QuizCategory, ActionCategoryPriority>> = {};

  allCategories.forEach((category) => {
    const initiatorScore = input.initiatorScores[category] ?? 0;
    const partnerScore = input.partnerScores[category] ?? 0;
    const diff = Math.abs(initiatorScore - partnerScore);

    const sharedBurden = initiatorBurdens.has(category) && partnerBurdens.has(category);
    const burdenOnlyOneSide = initiatorBurdens.has(category) !== partnerBurdens.has(category);
    const highScore = initiatorScore >= 70 || partnerScore >= 70;
    const dualHighScore = initiatorScore >= 70 && partnerScore >= 70;
    const scoreGap = diff >= 20;
    const strongScoreMatch =
      (initiatorBurdens.has(category) && initiatorScore >= 70)
      || (partnerBurdens.has(category) && partnerScore >= 70);

    const reasons: ActionCategoryReasonCode[] = [];
    if (sharedBurden) reasons.push('shared_burden');
    if (burdenOnlyOneSide) reasons.push('burden_only_one_side');
    if (highScore) reasons.push('high_score');
    if (dualHighScore) reasons.push('dual_high_score');
    if (scoreGap) reasons.push('score_gap');
    if (strongScoreMatch) reasons.push('strong_score_match');
    if (lowClarity) reasons.push('low_clarity');
    if (clarityGap) reasons.push('clarity_gap');

    const highPriority =
      sharedBurden
      || dualHighScore
      || (strongScoreMatch && lowClarity)
      || (sharedBurden && lowClarity);

    const mediumPriority =
      (burdenOnlyOneSide && highScore)
      || scoreGap
      || strongScoreMatch;

    const priority: ActionCategoryPriority = highPriority ? 'high' : mediumPriority ? 'medium' : 'low';

    reasonsByCategory[category] = reasons;
    priorityByCategory[category] = priority;
  });

  const sorted = [...allCategories].sort((a, b) => {
    const pa = getPriorityScore(priorityByCategory[a] ?? 'low');
    const pb = getPriorityScore(priorityByCategory[b] ?? 'low');
    if (pb !== pa) return pb - pa;

    const ra = reasonsByCategory[a]?.length ?? 0;
    const rb = reasonsByCategory[b]?.length ?? 0;
    if (rb !== ra) return rb - ra;

    const aScore = (input.initiatorScores[a] ?? 0) + (input.partnerScores[a] ?? 0);
    const bScore = (input.initiatorScores[b] ?? 0) + (input.partnerScores[b] ?? 0);
    return bScore - aScore;
  });

  const highAndMedium = sorted.filter((category) => (priorityByCategory[category] ?? 'low') !== 'low');
  const suggestedActionCategories = (highAndMedium.length ? highAndMedium : sorted).slice(0, 2);
  const optionalActionCategories = sorted.filter((category) => !suggestedActionCategories.includes(category));

  return {
    suggestedActionCategories,
    optionalActionCategories,
    actionCategoryReasons: reasonsByCategory,
    actionCategoryPriority: priorityByCategory,
    actionCategorySummaryText: buildActionCategorySummaryText(suggestedActionCategories),
  };
}
