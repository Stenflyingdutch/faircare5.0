export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type TemplateCategory =
  | 'quizQuestions'
  | 'resultTexts'
  | 'taskCatalog'
  | 'pageContent'
  | 'weeklyCheckin';

export interface TemplateDocument<TContent = Record<string, unknown>> {
  id: string;
  category: TemplateCategory;
  name: string;
  version: number;
  isActive: boolean;
  content: TContent;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionTemplate {
  id: string;
  prompt: string;
  category: string;
  order: number;
  scaleMin: number;
  scaleMax: number;
}

export interface ResultTemplate {
  id: string;
  title: string;
  summary: string;
  recommendationBlocks: string[];
}

export interface TaskCatalogItem {
  id: string;
  area: string;
  title: string;
  description: string;
  defaultWeight: number;
}

export interface WeeklyCheckinTemplate {
  id: string;
  title: string;
  prompts: string[];
  moodScaleEnabled: boolean;
}

export interface NewsletterSubscriber {
  id?: string;
  email: string;
  source: 'website';
  createdAt: string;
}

export const firestoreCollections = {
  users: 'users',
  families: 'families',
  invitations: 'invitations',
  quizResults: 'quizResults',
  jointResults: 'jointResults',
  mailLogs: 'mailLogs',
  templates: 'templates',
  questionPools: 'questionPools',
  quizSessions: 'quizSessions',
  quizAnswers: 'quizAnswers',
  results: 'results',
  userResults: 'userResults',
  couples: 'couples',
  taskAssignments: 'taskAssignments',
  actionBoards: 'actionBoards',
  actionBoardCards: 'actionBoardCards',
  weeklyCheckins: 'weeklyCheckins',
  newsletterSubscribers: 'newsletterSubscribers',
} as const;

export type FirestoreCollectionName =
  (typeof firestoreCollections)[keyof typeof firestoreCollections];
