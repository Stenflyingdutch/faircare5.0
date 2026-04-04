import type { OwnershipAnswer, QuestionTemplate } from '@/types/quiz';

export interface PartnerLocalSession {
  invitationToken: string;
  invitationId: string;
  sessionId: string;
  familyId: string;
  questionSetId: string;
  questions: QuestionTemplate[];
  answers: Partial<Record<string, OwnershipAnswer>>;
  perceptionAnswer?: string;
  completedAt?: string;
}

const KEY = 'faircare_partner_session_v1';

export function savePartnerLocalSession(session: PartnerLocalSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadPartnerLocalSession() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PartnerLocalSession;
  } catch {
    return null;
  }
}

export function clearPartnerLocalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
