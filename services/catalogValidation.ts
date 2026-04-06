import type { QuestionTemplate, QuizCatalog } from '@/types/quiz';

function isQuestionTemplate(value: unknown): value is QuestionTemplate {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<QuestionTemplate>;
  return Boolean(entry.id)
    && Boolean(entry.ageGroup)
    && Boolean(entry.categoryKey)
    && Boolean(entry.questionText)
    && typeof entry.sortOrder === 'number'
    && typeof entry.isActive === 'boolean';
}

export function ensureValidQuizCatalog(payload: unknown, fallback: QuizCatalog): QuizCatalog {
  if (!payload || typeof payload !== 'object') return fallback;
  const source = payload as Partial<QuizCatalog>;

  if (!Array.isArray(source.categories) || !Array.isArray(source.questions)) return fallback;

  const hasInvalidQuestion = source.questions.some((entry) => !isQuestionTemplate(entry));
  if (hasInvalidQuestion) return fallback;

  const validCategoryPairs = new Set(fallback.categories.map((entry) => `${entry.ageGroup}:${entry.key}`));
  const validCategoryKeys = new Set(fallback.categories.map((entry) => entry.key));

  const categories = source.categories.filter((entry) => (
    Boolean(entry?.key)
    && Boolean(entry?.ageGroup)
    && validCategoryPairs.has(`${entry.ageGroup}:${entry.key}`)
  ));

  const questions = source.questions.filter((entry) => validCategoryKeys.has(entry.categoryKey));

  if (!categories.length || !questions.length) return fallback;

  return {
    categories,
    questions,
  } as QuizCatalog;
}
