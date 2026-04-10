import { resolveCategoryLabel } from '@/services/resultCalculator';
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

export function buildIndividualInsightsWithContext(
  categoryScores: Record<QuizCategory, number>,
  partnerScores?: Record<QuizCategory, number>,
) {
  const entries = Object.entries(categoryScores) as Array<[QuizCategory, number]>;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  const focus = sorted.slice(0, 2).map(([category, score]) => {
    let text = `Dieser Bereich liegt aktuell stabil bei dir.`;
    if (partnerScores) {
      const partnerScore = partnerScores[category] ?? 0;
      const diff = score - partnerScore;
      if (score >= insightThresholds.mediumLoad && partnerScore >= insightThresholds.mediumLoad && Math.abs(diff) < 10) {
        text = 'Dieser Bereich ist bei euch beiden spürbar präsent.';
      } else if (diff >= insightThresholds.notableDifference) {
        text = 'Hier trägst du spürbar mehr Verantwortung.';
      } else if (diff <= -insightThresholds.notableDifference) {
        text = 'Hier trägt dein Partner spürbar mehr Verantwortung.';
      } else {
        text = 'Dieser Bereich liegt bei euch in ähnlicher Größenordnung.';
      }
    } else if (score >= insightThresholds.highLoad) text = `Dieser Bereich liegt aktuell stark bei dir.`;
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
    const label = resolveCategoryLabel(entry.category);
    if (entry.level === 'high') return `Im Bereich ${label} könnte eine kleine Anpassung bereits entlasten.`;
    if (entry.level === 'medium') return `Für ${label} lohnt sich ein kurzes Abstimmungsgespräch.`;
    return `Bei ${label} seid ihr bereits nah beieinander – das ist eine gute Basis.`;
  });
}

export function buildPerceptionOutcome(comparisons: CategoryComparison[]) {
  const highCount = comparisons.filter((item) => item.level === 'high').length;
  const mediumCount = comparisons.filter((item) => item.level === 'medium').length;
  const avgDiff = comparisons.length
    ? Math.round(comparisons.reduce((sum, item) => sum + item.difference, 0) / comparisons.length)
    : 0;

  if (highCount === 0 && mediumCount <= 1 && avgDiff < insightThresholds.notableDifference) {
    return {
      type: 'sehr_aehnlich' as const,
      title: 'Sehr ähnliches Gesamtbild',
      text: 'Ihr habt ein ziemlich gemeinsames Bild der aktuellen Verteilung. Das ist eine gute Basis für ein sachliches Gespräch darüber, ob es sich für euch stimmig anfühlt.',
    };
  }
  if (highCount <= 1) {
    return {
      type: 'teilweise_aehnlich' as const,
      title: 'Ähnliches Bild mit einzelnen Unterschieden',
      text: 'Insgesamt wirkt eure Wahrnehmung ähnlich. In einzelnen Kategorien gibt es aber spürbare Unterschiede, die ihr gemeinsam klären könnt.',
    };
  }
  return {
    type: 'deutlich_unterschiedlich' as const,
    title: 'Deutlich unterschiedliches Gesamtbild',
    text: 'Eure Wahrnehmung unterscheidet sich aktuell deutlich. Das ist kein Fehler, sondern ein Hinweis darauf, wo ein Gespräch besonders hilfreich sein kann.',
  };
}

const clarityLabel: Record<string, string> = {
  eher_klar: 'eher klar',
  teils_spontan: 'teils klar, teils spontan',
  oft_unklar: 'oft unklar',
};

export function buildClarityConsistencyInsight(
  initiatorClarity?: string | null,
  partnerClarity?: string | null,
  averageDifference = 0,
) {
  if (!initiatorClarity && !partnerClarity) return null;
  const initiator = initiatorClarity ? clarityLabel[initiatorClarity] ?? initiatorClarity : 'keine Angabe';
  const partner = partnerClarity ? clarityLabel[partnerClarity] ?? partnerClarity : 'keine Angabe';

  if (averageDifference >= insightThresholds.strongDifference) {
    return `In der Startfrage beschreibt ihr die Aufteilung als „${initiator}“ bzw. „${partner}“. Die späteren Antworten zeigen deutliche Unterschiede – hier lohnt ein gemeinsamer Abgleich.`;
  }
  if (averageDifference < insightThresholds.notableDifference) {
    return `In der Startfrage beschreibt ihr die Aufteilung als „${initiator}“ bzw. „${partner}“. Das passt gut zu eurem insgesamt ähnlichen Antwortbild.`;
  }
  return `In der Startfrage beschreibt ihr die Aufteilung als „${initiator}“ bzw. „${partner}“. Die Antworten im Quiz weichen teilweise ab und geben gute Gesprächsanlässe.`;
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
    'Wenn beide in derselben Kategorie hoch liegen und die Differenz klein ist, wird dies als gemeinsamer Lastbereich formuliert.',
  ],
  blockLogic: {
    block1: 'Wahrnehmungsvergleich: ähnliche / teilweise ähnliche / deutlich unterschiedliche Sicht anhand Differenzlevel pro Kategorie.',
    block2: 'Mental-Load-Verteilung: pro Kategorie Gegenüberstellung beider Werte inkl. Differenz und optionaler Spannweite bei starker Abweichung.',
  },
  consistencyLogic: 'Zusatzprüfung: Startfrage zur Klarheit der Aufteilung wird mit durchschnittlicher Antwortdifferenz aus dem Quiz gespiegelt.',
};
