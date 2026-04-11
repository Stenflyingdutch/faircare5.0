export const DEFAULT_PASSWORD_RESET_SUCCESS_PATH = '/login?reset=success';

export type PasswordResetBaseUrlSource =
  | 'password_reset_base_url'
  | 'app_url'
  | 'app_base_url'
  | 'next_public_site_url'
  | 'next_public_app_url'
  | 'vercel_project_production_url'
  | 'vercel_url'
  | 'window_origin_local'
  | 'localhost_fallback';

export type PasswordResetBaseUrlRejectionReason =
  | 'invalid_url'
  | 'preview_domain_requires_opt_in';

export type PasswordResetBaseUrlResolution = {
  baseUrl: string;
  source: PasswordResetBaseUrlSource;
  hostname: string;
  isLocalhost: boolean;
  allowPreview: boolean;
  rejectedCandidate: {
    source: Exclude<PasswordResetBaseUrlSource, 'vercel_project_production_url' | 'vercel_url' | 'window_origin_local' | 'localhost_fallback'>;
    hostname: string;
    reason: PasswordResetBaseUrlRejectionReason;
  } | null;
};

export type FirebasePasswordResetLinkState = {
  mode: string | null;
  oobCode: string | null;
  continueUrl: string | null;
  languageCode: string | null;
  apiKey: string | null;
  handlerUrl: string;
  handlerHostname: string;
};

type BaseUrlCandidate = {
  source: Exclude<PasswordResetBaseUrlSource, 'vercel_project_production_url' | 'vercel_url' | 'window_origin_local' | 'localhost_fallback'>;
  rawValue: string | undefined;
};

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

function resolveHostnameFromBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return 'invalid';
  }
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isCustomDomain(hostname: string) {
  return !hostname.endsWith('.vercel.app');
}

function normalizeVercelProductionUrl(rawValue: string | undefined) {
  if (!rawValue?.trim()) return null;
  const normalized = normalizeBaseUrl(rawValue);
  const withProtocol = normalized.startsWith('http://') || normalized.startsWith('https://')
    ? normalized
    : `https://${normalized}`;
  return withProtocol;
}

function parseExplicitCandidate(candidate: BaseUrlCandidate) {
  if (!candidate.rawValue?.trim()) return null;

  const baseUrl = normalizeBaseUrl(candidate.rawValue);
  const hostname = resolveHostnameFromBaseUrl(baseUrl);
  if (hostname === 'invalid') {
    return {
      accepted: false as const,
      source: candidate.source,
      hostname,
      reason: 'invalid_url' as const,
    };
  }

  return {
    accepted: true as const,
    source: candidate.source,
    baseUrl,
    hostname,
    isLocalhost: isLocalHostname(hostname),
  };
}

export function buildAbsolutePasswordResetSuccessUrl(baseUrl: string) {
  return new URL(DEFAULT_PASSWORD_RESET_SUCCESS_PATH, `${normalizeBaseUrl(baseUrl)}/`).toString();
}

export function resolvePasswordResetCompletionPath(rawContinueUrl?: string | null) {
  if (!rawContinueUrl?.trim()) {
    return DEFAULT_PASSWORD_RESET_SUCCESS_PATH;
  }

  try {
    const parsed = new URL(rawContinueUrl, 'https://faircare.local');
    if (parsed.pathname !== '/login') {
      return DEFAULT_PASSWORD_RESET_SUCCESS_PATH;
    }

    const params = new URLSearchParams(parsed.search);
    params.set('reset', 'success');
    const search = params.toString();
    return search ? `/login?${search}` : DEFAULT_PASSWORD_RESET_SUCCESS_PATH;
  } catch {
    return DEFAULT_PASSWORD_RESET_SUCCESS_PATH;
  }
}

export function resolvePasswordResetBaseUrl(options?: { browserOrigin?: string | null }): PasswordResetBaseUrlResolution {
  const allowPreview = process.env.PASSWORD_RESET_ALLOW_PREVIEW === 'true';
  const productionBaseUrl = normalizeVercelProductionUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const productionHostname = productionBaseUrl ? resolveHostnameFromBaseUrl(productionBaseUrl) : null;
  const explicitCandidates: BaseUrlCandidate[] = [
    { source: 'password_reset_base_url', rawValue: process.env.PASSWORD_RESET_BASE_URL },
    { source: 'app_url', rawValue: process.env.APP_URL },
    { source: 'app_base_url', rawValue: process.env.APP_BASE_URL },
    { source: 'next_public_site_url', rawValue: process.env.NEXT_PUBLIC_SITE_URL },
    { source: 'next_public_app_url', rawValue: process.env.NEXT_PUBLIC_APP_URL },
  ];

  let rejectedCandidate: PasswordResetBaseUrlResolution['rejectedCandidate'] = null;

  for (const candidate of explicitCandidates) {
    const parsed = parseExplicitCandidate(candidate);
    if (!parsed) continue;

    if (!parsed.accepted) {
      rejectedCandidate = {
        source: parsed.source,
        hostname: parsed.hostname,
        reason: parsed.reason,
      };
      continue;
    }

    if (parsed.isLocalhost || isCustomDomain(parsed.hostname) || allowPreview) {
      return {
        baseUrl: parsed.baseUrl,
        source: parsed.source,
        hostname: parsed.hostname,
        isLocalhost: parsed.isLocalhost,
        allowPreview,
        rejectedCandidate,
      };
    }

    if (productionHostname && parsed.hostname === productionHostname) {
      return {
        baseUrl: parsed.baseUrl,
        source: parsed.source,
        hostname: parsed.hostname,
        isLocalhost: false,
        allowPreview,
        rejectedCandidate,
      };
    }

    rejectedCandidate = {
      source: parsed.source,
      hostname: parsed.hostname,
      reason: 'preview_domain_requires_opt_in',
    };
  }

  if (productionBaseUrl) {
    return {
      baseUrl: productionBaseUrl,
      source: 'vercel_project_production_url',
      hostname: resolveHostnameFromBaseUrl(productionBaseUrl),
      isLocalhost: false,
      allowPreview,
      rejectedCandidate,
    };
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && allowPreview) {
    const baseUrl = `https://${normalizeBaseUrl(vercelUrl)}`;
    return {
      baseUrl,
      source: 'vercel_url',
      hostname: resolveHostnameFromBaseUrl(baseUrl),
      isLocalhost: false,
      allowPreview,
      rejectedCandidate,
    };
  }

  const browserOrigin = options?.browserOrigin
    ?? (typeof window !== 'undefined' ? window.location.origin : null);
  if (browserOrigin) {
    const baseUrl = normalizeBaseUrl(browserOrigin);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    if (isLocalHostname(hostname)) {
      return {
        baseUrl,
        source: 'window_origin_local',
        hostname,
        isLocalhost: true,
        allowPreview,
        rejectedCandidate,
      };
    }
  }

  return {
    baseUrl: 'http://localhost:3000',
    source: 'localhost_fallback',
    hostname: 'localhost',
    isLocalhost: true,
    allowPreview,
    rejectedCandidate,
  };
}

export function extractPasswordResetStateFromFirebaseLink(firebaseLink: string): FirebasePasswordResetLinkState {
  const parsed = new URL(firebaseLink);

  return {
    mode: parsed.searchParams.get('mode'),
    oobCode: parsed.searchParams.get('oobCode'),
    continueUrl: parsed.searchParams.get('continueUrl'),
    languageCode: parsed.searchParams.get('lang'),
    apiKey: parsed.searchParams.get('apiKey'),
    handlerUrl: parsed.toString(),
    handlerHostname: parsed.hostname.toLowerCase(),
  };
}

export function buildAppPasswordResetUrl(baseUrl: string, state: Pick<FirebasePasswordResetLinkState, 'mode' | 'oobCode' | 'continueUrl' | 'languageCode'>) {
  const resetUrl = new URL('/reset-password', `${normalizeBaseUrl(baseUrl)}/`);

  if (state.mode) resetUrl.searchParams.set('mode', state.mode);
  if (state.oobCode) resetUrl.searchParams.set('oobCode', state.oobCode);
  if (state.continueUrl) resetUrl.searchParams.set('continueUrl', state.continueUrl);
  if (state.languageCode) resetUrl.searchParams.set('lang', state.languageCode);

  return resetUrl.toString();
}
