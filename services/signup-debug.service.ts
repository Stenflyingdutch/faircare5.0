import { auth, firebaseProjectId } from '@/lib/firebase';

type SignupLogContext = {
  step: string;
  path: string;
  inviteContextPresent?: boolean;
  uid?: string | null;
  extra?: Record<string, unknown>;
};

function buildSignupLogPayload(context: SignupLogContext) {
  const currentUser = auth.currentUser;

  return {
    step: context.step,
    path: context.path,
    projectId: firebaseProjectId ?? null,
    hasAuthCurrentUser: Boolean(currentUser),
    uid: context.uid ?? currentUser?.uid ?? null,
    hasInviteContext: Boolean(context.inviteContextPresent),
    ...context.extra,
  };
}

export function logSignupInfo(event: string, context: SignupLogContext) {
  console.info(event, buildSignupLogPayload(context));
}

export function logSignupError(event: string, error: unknown, context: SignupLogContext) {
  const errorObject = error as {
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string } | unknown;
    failedStep?: string;
    collection?: string;
    queryName?: string;
    targetRoute?: string;
  };
  const causeObject = errorObject?.cause as { code?: string; message?: string } | undefined;

  console.error(event, {
    ...buildSignupLogPayload(context),
    failedStep: errorObject?.failedStep ?? null,
    collection: errorObject?.collection ?? null,
    queryName: errorObject?.queryName ?? null,
    targetRoute: errorObject?.targetRoute ?? null,
    errorCode: (error as { code?: string })?.code ?? null,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorCause: causeObject ?? null,
    errorCauseCode: causeObject?.code ?? null,
    errorCauseMessage: causeObject?.message ?? null,
  });
}
