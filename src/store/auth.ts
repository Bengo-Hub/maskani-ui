'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';
import { meApi } from '@/lib/api/register';
import type { MaskaniMe } from '@/lib/api/types';
import {
  buildAuthorizeUrl, buildLogoutUrl, exchangeCodeForTokens, revokeServerSession, type TokenPair,
} from '@/lib/auth/api';
import { consumeState, consumeVerifier, generateCodeChallenge, generateCodeVerifier, generateState, storeState, storeVerifier } from '@/lib/auth/pkce';
import { cookieMode } from '@/lib/auth/session-mode';
import { scrubStoredSession } from '@bengo-hub/shared-ui-lib/auth';

export type SessionKind = 'staff' | 'portal';

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  kind: SessionKind;
  tenantSlug: string;
}

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/** Who is signed in, without any token: what the cookie session persists in place of `session`. */
export interface SignedIn {
  kind: SessionKind;
  tenantSlug: string;
}

interface AuthState {
  session: Session | null;
  /** Cookie session only: the kind and tenant of the sign-in, kept across reloads. */
  signedIn: SignedIn | null;
  me: MaskaniMe | null;
  status: Status;
  setSession: (s: Session | null) => void;
  /** Stores a token pair from SSO or a phone code and loads the maskani profile. */
  signIn: (slug: string, pair: TokenPair, kind: SessionKind) => Promise<MaskaniMe>;
  /** Restores a persisted session on load; false means the visitor must sign in. */
  restore: (slug: string) => Promise<boolean>;
  refreshMe: (slug: string) => Promise<void>;
  startSSO: (slug: string, returnTo?: string, silent?: boolean) => Promise<void>;
  completeSSO: (slug: string, code: string, state: string | null) => Promise<MaskaniMe>;
  logout: (slug: string) => Promise<void>;
  clearLocal: () => void;
}

/** The persisted store key; also names the cross-tab refresh lock and the storage watcher. */
export const AUTH_STORAGE_KEY = 'maskani-auth';

// Cookie session (fleet plan G11): tokens an earlier build stored are dropped before the store
// loads; from here on only the profile and who signed in are persisted.
if (cookieMode()) scrubStoredSession(AUTH_STORAGE_KEY);

/** Cookie session: once the browser is back online, gets the token a reload offline could not. */
function refreshWhenOnline() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void import('@/lib/auth/cookie-session').then(({ getCookieSession }) => getCookieSession().refresh());
  }, { once: true });
}

function applyToClient(session: Session | null, me: MaskaniMe | null) {
  apiClient.setAccessToken(session?.accessToken ?? null);
  apiClient.setTenantInfo(me?.tenant_id ?? null, me?.tenant_slug ?? session?.tenantSlug ?? null);
}

export function callbackUrl(slug: string): string {
  return `${window.location.origin}/${slug}/auth/callback`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      signedIn: null,
      me: null,
      status: 'idle',

      setSession: (s) => {
        set({ session: s });
        apiClient.setAccessToken(s?.accessToken ?? null);
      },

      signIn: async (slug, pair, kind) => {
        if (cookieMode() && pair.refresh_token) {
          // The refresh token goes into auth-api's HttpOnly cookie and is dropped here; the store
          // holds only the in-memory access token the cookie session hands back. A new sign-in
          // replaces whoever was stored, so it is not taken for a user switch.
          set({ signedIn: { kind, tenantSlug: slug }, session: null, me: null, status: 'loading' });
          const { getCookieSession } = await import('@/lib/auth/cookie-session');
          const started = await getCookieSession().start(pair.refresh_token);
          if (!('token' in started) || !get().session) {
            get().clearLocal();
            throw new Error('Sign-in failed. Please try again.');
          }
          const me = await meApi.me(slug);
          set({ me, status: 'authenticated' });
          applyToClient(get().session, me);
          return me;
        }
        const session: Session = {
          accessToken: pair.access_token,
          refreshToken: pair.refresh_token,
          expiresAt: Date.now() + (pair.expires_in || 3600) * 1000,
          kind,
          tenantSlug: slug,
        };
        set({ session, status: 'loading' });
        applyToClient(session, null);
        const me = await meApi.me(slug);
        set({ me, status: 'authenticated' });
        applyToClient(session, me);
        return me;
      },

      restore: async (slug) => {
        if (cookieMode()) {
          // No token is stored: a known sign-in for this tenant gets its first token through the
          // sso cookie (or keeps the one this tab already holds).
          const info = get().session ?? get().signedIn;
          if (!info || info.tenantSlug !== slug) {
            set({ status: 'unauthenticated' });
            return false;
          }
          applyToClient(get().session, get().me);
          if (!get().session) {
            const { getCookieSession } = await import('@/lib/auth/cookie-session');
            const renewed = await getCookieSession().refresh();
            if ('rejected' in renewed) {
              get().clearLocal();
              return false;
            }
            if ('transient' in renewed) {
              // Offline or weak wifi: paint from the persisted profile, as before, and get a token
              // once the browser is back online.
              refreshWhenOnline();
              set({ status: 'authenticated' });
              return true;
            }
          }
          if (get().me) {
            set({ status: 'authenticated' });
            void get().refreshMe(slug);
            return true;
          }
          set({ status: 'loading' });
          try {
            await get().refreshMe(slug);
            return get().status === 'authenticated';
          } catch {
            return false;
          }
        }
        const { session } = get();
        if (!session || session.tenantSlug !== slug) {
          set({ status: 'unauthenticated' });
          return false;
        }
        applyToClient(session, get().me);
        // Paint from the persisted profile at once; refresh it in the background.
        if (get().me) {
          set({ status: 'authenticated' });
          void get().refreshMe(slug);
          return true;
        }
        set({ status: 'loading' });
        try {
          await get().refreshMe(slug);
          return get().status === 'authenticated';
        } catch {
          return false;
        }
      },

      refreshMe: async (slug) => {
        try {
          const me = await meApi.me(slug);
          set({ me, status: 'authenticated' });
          applyToClient(get().session, me);
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          // A real 401/403 here means the token is no longer valid for this tenant.
          if (status === 401 || status === 403) {
            get().clearLocal();
            set({ status: 'unauthenticated' });
          } else if (!get().me) {
            // Offline with no cached profile: stay signed in but unresolved; screens retry.
            set({ status: 'authenticated' });
          }
        }
      },

      startSSO: async (slug, returnTo, silent) => {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        const state = generateState();
        storeVerifier(verifier);
        storeState(state);
        if (returnTo) sessionStorage.setItem('sso_return_to', returnTo);
        if (silent) sessionStorage.setItem('sso_silent_probe', '1');
        window.location.assign(buildAuthorizeUrl({ codeChallenge: challenge, state, redirectUri: callbackUrl(slug), tenant: slug, silent }));
      },

      completeSSO: async (slug, code, state) => {
        const expected = consumeState();
        const verifier = consumeVerifier();
        if (!verifier || (expected && state && expected !== state)) {
          throw new Error('This sign-in link has expired. Please sign in again.');
        }
        const pair = await exchangeCodeForTokens(code, verifier, callbackUrl(slug));
        return get().signIn(slug, pair, 'staff');
      },

      logout: async (slug) => {
        const { session } = get();
        const kind = session?.kind ?? get().signedIn?.kind ?? 'staff';
        if (cookieMode()) {
          // Revokes the session, clears the sso cookie and signs the other tabs out.
          const { getCookieSession } = await import('@/lib/auth/cookie-session');
          await getCookieSession().end();
        } else {
          await revokeServerSession(session?.accessToken);
        }
        get().clearLocal();
        try { sessionStorage.clear(); } catch { /* storage may be blocked */ }
        if (kind === 'portal') {
          window.location.assign(`/${slug}/portal/sign-in`);
        } else {
          window.location.assign(buildLogoutUrl(`${window.location.origin}/${slug}`));
        }
      },

      clearLocal: () => {
        set({ session: null, signedIn: null, me: null, status: 'unauthenticated' });
        applyToClient(null, null);
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // The cookie session persists the profile and who signed in; the access token stays in memory.
      partialize: (s) => (cookieMode()
        ? { me: s.me, signedIn: s.session ? { kind: s.session.kind, tenantSlug: s.session.tenantSlug } : s.signedIn }
        : { session: s.session, me: s.me }),
    },
  ),
);

/** Permission check against maskani /auth/me codes ("maskani.billing.view" or "billing.view"). */
export function hasPermission(me: MaskaniMe | null, code: string): boolean {
  if (!me) return false;
  if (me.bypass || me.is_platform_owner) return true;
  const full = code.startsWith('maskani.') ? code : `maskani.${code}`;
  return me.permissions.includes(full) || me.permissions.includes(code);
}

/**
 * Module check. With a property selected, that property's own set applies when its use case or
 * switches narrow the tenant's (like a POS outlet's use case); otherwise the tenant's set.
 */
export function hasModule(me: MaskaniMe | null, module: string, propertyId = ''): boolean {
  if (!me) return false;
  const own = propertyId ? me.property_modules?.[propertyId] : undefined;
  return (own ?? me.modules).includes(module);
}
