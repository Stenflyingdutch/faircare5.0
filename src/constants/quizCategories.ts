export interface QuizCategoryConfig {
  id: string;
  label: string;
  description: string;
}

export const QUIZ_CATEGORIES: QuizCategoryConfig[] = [
  { id: 'planning', label: 'Planning', description: 'Task planning and anticipation load' },
  { id: 'execution', label: 'Execution', description: 'Day-to-day delivery burden' },
  { id: 'emotional', label: 'Emotional', description: 'Emotional labor and regulation' },
  { id: 'communication', label: 'Communication', description: 'Coordination and follow-through' },
];
