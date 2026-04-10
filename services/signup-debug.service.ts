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

const FALLBACK_NOW = () => Date.now();
const SIGNUP_PERF_SESSION_KEY = '__faircare_signup_perf_marks__';

function resolveNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now.bind(performance);
  }
  return FALLBACK_NOW;
}

export type SignupPerfMeasurement = {
  label: string;
  durationMs: number;
  meta?: Record<string, unknown>;
};

export class SignupPerfTracker {
  private readonly now = resolveNow();

  private readonly startedAt = this.now();

  private readonly marks = new Map<string, number>([['flow.start', this.startedAt]]);

  mark(label: string) {
    this.marks.set(label, this.now());
  }

  measure(startLabel: string, endLabel: string, label: string, meta?: Record<string, unknown>) {
    const start = this.marks.get(startLabel);
    const end = this.marks.get(endLabel);
    if (typeof start !== 'number' || typeof end !== 'number') return null;
    return { label, durationMs: Number((end - start).toFixed(1)), meta };
  }

  measureFromStart(endLabel: string, label: string, meta?: Record<string, unknown>) {
    const end = this.marks.get(endLabel);
    if (typeof end !== 'number') return null;
    return { label, durationMs: Number((end - this.startedAt).toFixed(1)), meta };
  }

  flush(uid?: string | null, extra?: Record<string, unknown>) {
    const measures: SignupPerfMeasurement[] = [];
    const track = (measurement: SignupPerfMeasurement | null) => {
      if (measurement) measures.push(measurement);
    };

    track(this.measure('flow.click', 'flow.submit.start', 'T1.click_to_submit_start'));
    track(this.measure('flow.submit.start', 'auth.create_user.success', 'T2.submit_start_to_auth_created'));
    track(this.measure('auth.create_user.success', 'user_profile.create.success', 'T3.auth_created_to_min_profile_written'));
    track(this.measure('user_profile.create.success', 'redirect.start', 'T4.profile_ready_to_redirect_start'));
    track(this.measure('redirect.start', 'target_page.shell.visible', 'T5.redirect_start_to_target_render'));
    track(this.measure('target_page.shell.visible', 'target_page.first_interaction', 'T6.target_render_to_first_interaction'));
    track(this.measure('flow.click', 'target_page.first_interaction', 'T7.total_click_to_first_useful_interaction'));

    logSignupInfo('signup.perf.summary', {
      step: 'SignupPerfTracker.flush',
      path: '/register',
      uid: uid ?? null,
      extra: {
        measures,
        ...(extra ?? {}),
      },
    });
  }
}

export function persistSignupPerfMark(label: string, atMs?: number) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  const now = atMs ?? resolveNow()();
  const raw = window.sessionStorage.getItem(SIGNUP_PERF_SESSION_KEY);
  const marks = raw ? JSON.parse(raw) as Record<string, number> : {};
  marks[label] = now;
  window.sessionStorage.setItem(SIGNUP_PERF_SESSION_KEY, JSON.stringify(marks));
}

export function readPersistedSignupPerfMarks() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  const raw = window.sessionStorage.getItem(SIGNUP_PERF_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return null;
  }
}

export function clearPersistedSignupPerfMarks() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  window.sessionStorage.removeItem(SIGNUP_PERF_SESSION_KEY);
}
