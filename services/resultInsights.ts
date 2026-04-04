import { categoryLabelMap } from '@/services/resultCalculator';
import type { QuizCategory } from '@/types/quiz';

/**
 * Zentrale Schwellenwerte für individuelle und gemeinsame Ergebnis-Einordnung.
 * Diese Werte werden sowohl in der UI-Auswertung als auch in der Admin-Doku verwendet.
 */
export const insightThresholds = {
  highLoad: 75,
  mediumLoad: 60,
  notableDifference: 20,
  strongDifference: 35,
  overloadIndexHigh: 70,
};

export interface IndividualInsight {
  category: QuizCategory;
  score: number;
  text: string;
}

export interface CategoryComparison {
  category: QuizCategory;
  own: number;
  partner: number;
  difference: number;
  level: 'low' | 'medium' | 'high';
  text: string;
}

export function buildIndividualInsights(categoryScores: Record<QuizCategory, number>) {
  const entries = Object.entries(categoryScores) as Array<[QuizCategory, number]>;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  const focus = sorted.slice(0, 2).map(([category, score]) => {
    let text = `Dieser Bereich liegt aktuell stabil bei dir.`;
    if (score >= insightThresholds.highLoad) text = `Dieser Bereich liegt aktuell stark bei dir.`;
    else if (score >= insightThresholds.mediumLoad) text = `Hier trägst du spürbar mehr Verantwortung.`;
    return { category, score, text } satisfies IndividualInsight;
  });

  const overloadIndex = Math.round(sorted.slice(0, 3).reduce((sum, [, score]) => sum + score, 0) / Math.max(1, Math.min(3, sorted.length)));
  const summary = overloadIndex >= insightThresholds.overloadIndexHigh
    ? 'Deine Gesamtlast wirkt aktuell erhöht. Kleine Entlastungsschritte könnten schnell helfen.'
    : 'Deine Verteilung wirkt in mehreren Bereichen tragfähig, einzelne Kategorien bleiben dennoch wichtig.';

  return {
    focus,
    overloadIndex,
    summary,
  };
}

export function buildCategoryComparisons(
  ownScores: Record<QuizCategory, number>,
  partnerScores: Record<QuizCategory, number>,
): CategoryComparison[] {
  const categories = Array.from(new Set([
    ...Object.keys(ownScores),
    ...Object.keys(partnerScores),
  ])) as QuizCategory[];

  return categories
    .map((category) => {
      const own = ownScores[category] ?? 0;
      const partner = partnerScores[category] ?? 0;
      const difference = Math.abs(own - partner);
      let level: CategoryComparison['level'] = 'low';
      let text = 'Hier wirkt eure Wahrnehmung ähnlich.';

      if (difference >= insightThresholds.strongDifference) {
        level = 'high';
        text = 'Hier zeigt sich eine deutliche Differenz zwischen euch.';
      } else if (difference >= insightThresholds.notableDifference) {
        level = 'medium';
        text = 'Hier scheint eure Wahrnehmung auseinanderzugehen.';
      }

      return { category, own, partner, difference, level, text };
    })
    .sort((a, b) => b.difference - a.difference);
}

export function buildJointRecommendations(comparisons: CategoryComparison[]) {
  const top = comparisons.slice(0, 3);
  if (!top.length) return [];

  return top.map((entry) => {
    const label = categoryLabelMap[entry.category];
    if (entry.level === 'high') return `Im Bereich ${label} könnte eine kleine Anpassung bereits entlasten.`;
    if (entry.level === 'medium') return `Für ${label} lohnt sich ein kurzes Abstimmungsgespräch.`;
    return `Bei ${label} seid ihr bereits nah beieinander – das ist eine gute Basis.`;
  });
}

export const resultLogicDocumentation = {
  dataBasis: [
    'Antworten pro Frage (Skala 0–100 über Antwort-Mapping).',
    'Aggregation pro Kategorie zu einem Kategoriescore.',
    'Gesamtscore als Mittelwert über Kategorien.',
  ],
  thresholds: insightThresholds,
  rules: [
    `Hohe individuelle Last ab >= ${insightThresholds.highLoad}.`,
    `Spürbare Last ab >= ${insightThresholds.mediumLoad}.`,
    `Auffällige Differenz ab >= ${insightThresholds.notableDifference}.`,
    `Starke Differenz ab >= ${insightThresholds.strongDifference}.`,
  ],
};
