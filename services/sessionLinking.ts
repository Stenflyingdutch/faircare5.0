import type { User } from 'firebase/auth';

import { buildDetailedReport } from '@/services/detailedReportBuilder';
import { fetchQuestionTemplates, persistQuizResult, persistQuizSession, persistUserResult } from '@/services/firestoreQuiz';
import { saveSessionToStorage } from '@/services/sessionStorage';
import type { TempQuizSession } from '@/types/quiz';

export async function linkAnonymousSessionToUser(user: User, session: TempQuizSession) {
  const templates = await fetchQuestionTemplates();
  const questions = templates.filter((template) => session.questionIds.includes(template.id));
  const report = buildDetailedReport(questions, session.answers);

  const linkedSession: TempQuizSession = {
    ...session,
    userId: user.uid,
    isAnonymousResultSaved: false,
  };

  saveSessionToStorage(linkedSession);
  await Promise.all([
    persistQuizSession(linkedSession),
    persistQuizResult(linkedSession, report, false),
    persistUserResult(user.uid, linkedSession, report),
  ]);
}

export async function saveAnonymousResult(session: TempQuizSession) {
  const templates = await fetchQuestionTemplates();
  const questions = templates.filter((template) => session.questionIds.includes(template.id));
  const report = buildDetailedReport(questions, session.answers);

  const updated = { ...session, isAnonymousResultSaved: true };
  saveSessionToStorage(updated);
  await Promise.all([persistQuizSession(updated), persistQuizResult(updated, report, true)]);
}
