import type { QuizFilterInput, QuizQuestion } from '@/types/quiz';

const QUIZ_SIZE = 15;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function matchesChildcare(question: QuizQuestion, childcareTags: QuizFilterInput['childcareTags']) {
  if (question.requiredChildcareTag) {
    return childcareTags.includes(question.requiredChildcareTag);
  }

  const noChildcareSelected = childcareTags.includes('none');
  if (noChildcareSelected && question.category === 'betreuung_bildung') {
    return false;
  }

  return true;
}

export function generateQuizQuestions(questionPool: QuizQuestion[], filter: QuizFilterInput): QuizQuestion[] {
  const allowed = questionPool.filter((question) => matchesChildcare(question, filter.childcareTags));

  const core = shuffle(allowed.filter((question) => question.isCore));
  const nonCore = shuffle(allowed.filter((question) => !question.isCore));

  const selected: QuizQuestion[] = [];

  for (const question of core) {
    if (selected.length >= QUIZ_SIZE) break;
    selected.push(question);
  }

  for (const question of nonCore) {
    if (selected.length >= QUIZ_SIZE) break;
    if (!selected.some((entry) => entry.id === question.id)) {
      selected.push(question);
    }
  }

  return selected.slice(0, QUIZ_SIZE);
}
