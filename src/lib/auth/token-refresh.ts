import { useAuthStore } from '@/store/auth';
import { AuthHttpError, refreshTokens } from '@/lib/auth/api';

/**
 * `token`: a fresh access token. `rejected`: auth-api refused the refresh token (sign out).
 * `transient`: network or server failure; keep the session and let the caller fail softly, so a
 * weak connection never signs anyone out.
 */
export type RefreshResult = { token: string } | { rejected: true } | { transient: true };

let inFlight: Promise<RefreshResult> | null = null;

/** Refreshes once for all concurrent callers. */
export function refreshAccessToken(): Promise<RefreshResult> {
  const session = useAuthStore.getState().session;
  if (!session?.refreshToken) return Promise.resolve({ rejected: true });
  if (inFlight) return inFlight;
  inFlight = doRefresh(session.refreshToken).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(current: string): Promise<RefreshResult> {
  try {
    const data = await refreshTokens(current);
    const prev = useAuthStore.getState().session;
    if (!prev) return { rejected: true };
    useAuthStore.getState().setSession({
      ...prev,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || current,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    });
    return { token: data.access_token };
  } catch (err) {
    if (err instanceof AuthHttpError && err.status >= 400 && err.status < 500) return { rejected: true };
    return { transient: true };
  }
}
