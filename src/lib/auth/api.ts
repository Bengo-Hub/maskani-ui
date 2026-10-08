import { revokeServerSession as sharedRevokeServerSession } from '@bengo-hub/shared-ui-lib/auth';
import { AUTH_UI_URL, SSO_CLIENT_ID, SSO_URL } from '@/lib/config';

// Session bootstrap requests gate the full-screen splash, so they carry the same ceiling as the
// API client instead of a bare fetch that can hang forever on a dead network.
const AUTH_FETCH_TIMEOUT_MS = 15000;

export class AuthHttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function failFrom(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({} as Record<string, string>));
  throw new AuthHttpError(res.status, body.error_description || body.message || body.error || fallback, body.code || body.error);
}

export interface TokenPair {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function buildAuthorizeUrl(params: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
  tenant: string;
  silent?: boolean;
}): string {
  const url = new URL('/api/v1/authorize', SSO_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', SSO_CLIENT_ID);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', 'openid profile email offline_access');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('tenant', params.tenant);
  if (params.silent) url.searchParams.set('prompt', 'none');
  return url.toString();
}

/** Accounts login page after a full logout (SSO logout standard). */
export function buildLogoutUrl(returnTo: string): string {
  const url = new URL('/api/v1/auth/logout', SSO_URL);
  url.searchParams.set('post_logout_redirect_uri', `${AUTH_UI_URL}/login?return_to=${encodeURIComponent(returnTo)}`);
  return url.toString();
}

/** POST /auth/logout revokes every session and refresh token for the user, not just the cookie. */
export function revokeServerSession(accessToken?: string | null): Promise<void> {
  return sharedRevokeServerSession(SSO_URL, accessToken);
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<TokenPair> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: SSO_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  const res = await fetchWithTimeout(`${SSO_URL}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) return failFrom(res, 'Sign-in could not be completed.');
  return res.json();
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const res = await fetchWithTimeout(`${SSO_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, client_id: SSO_CLIENT_ID }),
  });
  if (!res.ok) return failFrom(res, 'Session refresh failed.');
  return res.json();
}

export type CodeChannel = 'auto' | 'whatsapp';

/**
 * Asks auth-api for a sign-in code. "auto" sends it to the member's email when there is one and to
 * WhatsApp otherwise; "whatsapp" forces WhatsApp. Never reveals whether the phone exists.
 */
export async function requestPhoneCode(tenantSlug: string, phone: string, channel: CodeChannel = 'auto'): Promise<{ sent: boolean; expires_in: number }> {
  const res = await fetchWithTimeout(`${SSO_URL}/api/v1/auth/phone/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_slug: tenantSlug, phone, ...(channel === 'whatsapp' ? { channel } : {}) }),
  });
  if (!res.ok) return failFrom(res, 'Could not send a code. Please try again.');
  return res.json();
}

export async function verifyPhoneCode(tenantSlug: string, phone: string, code: string): Promise<TokenPair> {
  const res = await fetchWithTimeout(`${SSO_URL}/api/v1/auth/phone/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_slug: tenantSlug, phone, code, client_id: SSO_CLIENT_ID }),
  });
  if (!res.ok) return failFrom(res, 'That code did not work.');
  return res.json();
}

/** Normalises a Kenyan number typed as 07..., 7..., 2547... or +2547... to E.164. */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `+254${digits}`;
  return digits;
}
