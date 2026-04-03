import { questionTemplates } from '@/data/questionTemplates';
import type { AgeGroup, ChildcareTag, QuestionTemplate } from '@/types/quiz';

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
  return [...items].sort((a, b) => {
    const ha = hashSeed(`${seedBase}:${a.id}`);
    const hb = hashSeed(`${seedBase}:${b.id}`);
    return hb - ha;
  });
}

function matchesChildcare(template: QuestionTemplate, childcareTags: ChildcareTag[]) {
  if (template.requiredChildcareTags && !template.requiredChildcareTags.some((tag) => childcareTags.includes(tag))) {
    return false;
  }

  if (template.excludedChildcareTags && template.excludedChildcareTags.some((tag) => childcareTags.includes(tag))) {
    return false;
  }

  return true;
}

export function generateQuestionSet(params: {
  ageGroup: AgeGroup;
  childcareTags: ChildcareTag[];
  tempSessionId: string;
}) {
  const { ageGroup, childcareTags, tempSessionId } = params;
  const ageFiltered = questionTemplates.filter((template) => template.ageGroups.includes(ageGroup));
  const eligible = ageFiltered.filter((template) => matchesChildcare(template, childcareTags));

  const core = seededSort(
    eligible.filter((template) => template.isCore).sort((a, b) => b.priority - a.priority),
    `${tempSessionId}:core`,
  );

  const optional = seededSort(
    eligible.filter((template) => !template.isCore).sort((a, b) => b.priority - a.priority),
    `${tempSessionId}:optional`,
  );

  const selected: QuestionTemplate[] = [];
  for (const item of core) {
    if (selected.length >= QUIZ_SIZE) break;
    selected.push(item);
  }

  for (const item of optional) {
    if (selected.length >= QUIZ_SIZE) break;
    if (!selected.find((s) => s.id === item.id)) {
      selected.push(item);
    }
  }

  return selected.slice(0, QUIZ_SIZE);
}
