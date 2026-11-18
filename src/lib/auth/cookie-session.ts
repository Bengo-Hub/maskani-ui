/**
 * The cookie session for maskani-ui (fleet plan G11; shared-ui-lib createCookieSession).
 *
 * The refresh token lives in auth-api's HttpOnly cookie on sso.codevertexafrica.com, out of reach
 * of page scripts. The access token lives in memory. The store's `session` stays the in-memory
 * mirror that every caller already reads (no refresh token, and the store never persists it in
 * this mode), so no component changes. Staff (SSO) and portal (phone code) sign-ins both come from
 * auth-api for this client, so both use it. The gate tablet signs its calls with its own device
 * key and does not depend on this session.
 */

import { createCookieSession, type CookieSession, type CookieSessionState } from '@bengo-hub/shared-ui-lib/auth';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, type Session } from '@/store/auth';

const SSO_BASE_URL = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexafrica.com';
const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || 'maskani-ui';

let current: CookieSession | null = null;

/**
 * Keeps the store and the API client in step with the cookie session, including a token or a
 * sign-out another tab shared. When a different person signs in elsewhere (one sso cookie serves
 * every app), this tab drops its profile and reloads as that person.
 */
function onChange(s: CookieSessionState | null) {
  const store = useAuthStore.getState();
  if (!s) {
    if (store.session || store.status === 'authenticated') store.clearLocal();
    else apiClient.setAccessToken(null);
    return;
  }
  const nextUserId = (s.payload.user as { id?: string } | undefined)?.id;
  if (store.me && nextUserId && nextUserId !== store.me.id) {
    store.clearLocal();
    window.location.reload();
    return;
  }
  // The kind and tenant come from the sign-in this tab knows (signedIn is set before start()). A
  // tab with no sign-in of its own does not take up another tab's token.
  const info = store.session ?? store.signedIn;
  if (!info) return;
  const session: Session = { accessToken: s.accessToken, expiresAt: s.expiresAt, kind: info.kind, tenantSlug: info.tenantSlug };
  store.setSession(session);
}

export function getCookieSession(): CookieSession {
  current ??= createCookieSession({ authBaseUrl: SSO_BASE_URL, clientId: SSO_CLIENT_ID, onChange });
  return current;
}
