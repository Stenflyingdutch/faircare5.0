import { questionTemplates, quizCatalog } from '@/data/questionTemplates';
import type { AgeGroup, ChildcareTag, QuestionTemplate, QuizCatalog } from '@/types/quiz';

const QUESTIONS_PER_CATEGORY = 3;
const QUIZ_SIZE = 15;

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function seededSort(items: QuestionTemplate[], seedBase: string) {
  return [...items].sort((a, b) => hashSeed(`${seedBase}:${b.id}`) - hashSeed(`${seedBase}:${a.id}`));
}

function matchesChildcare(template: QuestionTemplate, childcareTags: ChildcareTag[]) {
  if (template.requiredChildcareTags && !template.requiredChildcareTags.some((tag) => childcareTags.includes(tag))) return false;
  if (template.excludedChildcareTags && template.excludedChildcareTags.some((tag) => childcareTags.includes(tag))) return false;
  return true;
}

export function generateQuestionSetFromCatalog(catalog: QuizCatalog, params: {
  ageGroup: AgeGroup;
  childcareTags: ChildcareTag[];
  tempSessionId: string;
}) {
  const { ageGroup, childcareTags, tempSessionId } = params;
  const categories = catalog.categories
    .filter((entry) => entry.ageGroup === ageGroup && entry.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => entry.key);

  const ageQuestions = catalog.questions.filter((template) => template.ageGroup === ageGroup && template.isActive);
  const selected: QuestionTemplate[] = [];

  for (const category of categories) {
    const inCategory = ageQuestions.filter((template) => template.categoryKey === category);
    const eligible = seededSort(inCategory.filter((template) => matchesChildcare(template, childcareTags)), `${tempSessionId}:${category}:eligible`);
    const fallback = seededSort(inCategory, `${tempSessionId}:${category}:fallback`);

    const pick: QuestionTemplate[] = [];
    for (const item of [...eligible, ...fallback]) {
      if (pick.length >= QUESTIONS_PER_CATEGORY) break;
      if (!pick.some((entry) => entry.id === item.id)) pick.push(item);
    }
    selected.push(...pick);
  }

  if (selected.length < QUIZ_SIZE) {
    const remaining = seededSort(ageQuestions, `${tempSessionId}:remaining`);
    for (const item of remaining) {
      if (selected.length >= QUIZ_SIZE) break;
      if (!selected.some((entry) => entry.id === item.id)) selected.push(item);
    }
  }

  return selected.slice(0, QUIZ_SIZE);
}

export function generateQuestionSet(params: {
  ageGroup: AgeGroup;
  childcareTags: ChildcareTag[];
  tempSessionId: string;
}) {
  return generateQuestionSetFromCatalog(quizCatalog, params);
}

export const questionCatalogFallback = {
  categories: quizCatalog.categories,
  questions: questionTemplates,
};
