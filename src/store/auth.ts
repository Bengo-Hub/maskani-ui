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

export type SessionKind = 'staff' | 'portal';

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  kind: SessionKind;
  tenantSlug: string;
}

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  session: Session | null;
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

const STORAGE_KEY = 'maskani-auth';

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
      me: null,
      status: 'idle',

      setSession: (s) => {
        set({ session: s });
        apiClient.setAccessToken(s?.accessToken ?? null);
      },

      signIn: async (slug, pair, kind) => {
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
        const kind = session?.kind ?? 'staff';
        await revokeServerSession(session?.accessToken);
        get().clearLocal();
        try { sessionStorage.clear(); } catch { /* storage may be blocked */ }
        if (kind === 'portal') {
          window.location.assign(`/${slug}/portal/sign-in`);
        } else {
          window.location.assign(buildLogoutUrl(`${window.location.origin}/${slug}`));
        }
      },

      clearLocal: () => {
        set({ session: null, me: null, status: 'unauthenticated' });
        applyToClient(null, null);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session, me: s.me }),
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

export function hasModule(me: MaskaniMe | null, module: string): boolean {
  if (!me) return false;
  return me.modules.includes(module);
}
