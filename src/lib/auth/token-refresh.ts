import { createSessionRefresher, type RefreshOutcome } from '@bengo-hub/shared-ui-lib/auth';
import { AUTH_STORAGE_KEY, useAuthStore, type Session } from '@/store/auth';
import { refreshTokens } from '@/lib/auth/api';

/**
 * `token`: a fresh access token. `rejected`: auth-api refused the refresh token (sign out).
 * `transient`: network or server failure; keep the session and let the caller fail softly, so a
 * weak connection never signs anyone out.
 */
export type RefreshResult = RefreshOutcome;

/** The shared refresher needs a refresh token string; an empty one reads as signed out. */
type RefreshableSession = Session & { refreshToken: string };

/**
 * One refresh for every caller, built on the shared cross-tab-safe refresher
 * (@bengo-hub/shared-ui-lib/auth createSessionRefresher): it adopts a newer session another tab
 * saved before spending the refresh token, tabs take turns, and an enrolment-only answer counts
 * as signed out.
 */
const refreshSession = createSessionRefresher<RefreshableSession>({
  lockName: AUTH_STORAGE_KEY,
  getSession: () => {
    const s = useAuthStore.getState().session;
    return s ? { ...s, refreshToken: s.refreshToken ?? '' } : null;
  },
  reloadSession: () => useAuthStore.persist.rehydrate(),
  saveSession: (next) => useAuthStore.getState().setSession(next),
  refresh: refreshTokens,
});

/** Pass the access token the server just rejected when it is known. */
export function refreshAccessToken(failedToken?: string | null): Promise<RefreshResult> {
  return refreshSession(failedToken);
}
