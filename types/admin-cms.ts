import type { LocalizedText, Locale } from '@/types/i18n';
import type { AgeGroup } from '@/types/quiz';

export type PublishStatus = 'draft' | 'published' | 'archived';
export type ActivationStatus = 'active' | 'inactive';

export interface VersionSnapshot<T> {
  id: string;
  createdAt: string;
  createdBy: string;
  status: PublishStatus;
  note?: string;
  payload: T;
}

export interface QuestionAdminRecord {
  id: string;
  key: string;
  questionText: LocalizedText;
  helperText: LocalizedText;
  internalDescription: string;
  ageGroup: AgeGroup;
  category: string;
  sortOrder: number;
  activationStatus: ActivationStatus;
  publishStatus: PublishStatus;
  answerType: 'single_choice' | 'multiple_choice' | 'scale' | 'free_text';
  answerOptions: LocalizedText[];
  logicTags: string[];
  isRequired: boolean;
  usageReferences: string[];
  versions: VersionSnapshot<Omit<QuestionAdminRecord, 'versions'>>[];
}

export interface TaskCatalogRecord {
  id: string;
  key: string;
  title: LocalizedText;
  shortDescription: LocalizedText;
  details: LocalizedText;
  category: string;
  ageGroup: AgeGroup;
  sortOrder: number;
  activationStatus: ActivationStatus;
  publishStatus: PublishStatus;
  tags: string[];
  isRecommended: boolean;
  isSpecialCard: boolean;
  versions: VersionSnapshot<Omit<TaskCatalogRecord, 'versions'>>[];
}

export interface WebContentRecord {
  id: string;
  key: string;
  pageTitle: LocalizedText;
  slug: string;
  seoTitle?: LocalizedText;
  metaDescription?: LocalizedText;
  heroText: LocalizedText;
  introText: LocalizedText;
  ctaLabel: LocalizedText;
  ctaLink: string;
  faqEntries: Array<{ question: LocalizedText; answer: LocalizedText }>;
  publishStatus: PublishStatus;
  versions: VersionSnapshot<Omit<WebContentRecord, 'versions'>>[];
}

export interface SystemEmailTemplateRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  locale: Locale;
  subject: string;
  preheader: string;
  plainText: string;
  htmlText: string;
  allowedVariables: string[];
  fromName: string;
  fromAddress?: string;
  replyTo?: string;
  activationStatus: ActivationStatus;
  publishStatus: PublishStatus;
  versions: VersionSnapshot<Omit<SystemEmailTemplateRecord, 'versions'>>[];
}

export interface NewsletterRecord {
  id: string;
  key: string;
  internalName: string;
  campaignName: string;
  locale: Locale;
  subject: string;
  preheader: string;
  senderName: string;
  replyTo?: string;
  plainText: string;
  htmlText: string;
  segment: string;
  status: 'draft' | 'planned' | 'published' | 'archived';
  scheduledAt?: string;
  notes?: string;
  versions: VersionSnapshot<Omit<NewsletterRecord, 'versions'>>[];
}

export interface AdminAuditEntry {
  id: string;
  area: 'questions' | 'tasks' | 'content' | 'emails' | 'newsletters' | 'users' | 'system';
  action: string;
  actor: string;
  targetId: string;
  createdAt: string;
  summary: string;
}

export interface AdminCmsState {
  questions: QuestionAdminRecord[];
  taskCatalog: TaskCatalogRecord[];
  webContent: WebContentRecord[];
  systemEmails: SystemEmailTemplateRecord[];
  newsletters: NewsletterRecord[];
  auditLog: AdminAuditEntry[];
}

export type AdminRole = 'super_admin' | 'content_admin' | 'user_admin' | 'newsletter_admin';

export const adminRolePermissions: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  content_admin: ['dashboard:view', 'questions:edit', 'tasks:edit', 'content:edit', 'emails:edit', 'newsletters:edit', 'audit:view'],
  user_admin: ['dashboard:view', 'users:edit', 'audit:view'],
  newsletter_admin: ['dashboard:view', 'newsletters:edit', 'newsletter:test-send', 'audit:view'],
};
