import type {
  QuestionTemplate,
  ResultTemplate,
  TaskCatalogItem,
  TemplateCategory,
  TemplateDocument,
  WeeklyCheckinTemplate,
} from '@/types/domain';

import { getTemplates } from '@/services/firestore.service';

export async function loadTemplatesByCategory<T>(category: TemplateCategory) {
  const templates = await getTemplates();
  return templates.filter((template) => template.category === category) as TemplateDocument<T>[];
}

export async function loadQuestionTemplates() {
  return loadTemplatesByCategory<QuestionTemplate[]>('quizQuestions');
}

export async function loadResultTemplates() {
  return loadTemplatesByCategory<ResultTemplate[]>('resultTexts');
}

export async function loadTaskCatalogTemplates() {
  return loadTemplatesByCategory<TaskCatalogItem[]>('taskCatalog');
}

export async function loadWeeklyCheckinTemplates() {
  return loadTemplatesByCategory<WeeklyCheckinTemplate[]>('weeklyCheckin');
}
