// Web push for residents: a host ring or a visitor arrival pops up on their phone and opens the
// walk-in answer page. Push is configured centrally in notifications-api; the app asks it at
// runtime for the platform's Web Push key (kinds=webpush, so no Firebase SDK is shipped) and
// registers the browser's subscription for the signed-in user.
import { apiClient } from '@/lib/api/client';
import { NOTIFICATIONS_API_URL } from '@/lib/config';

let keyPromise: Promise<string | null> | null = null;

function vapidKey(slug: string): Promise<string | null> {
  if (!keyPromise) {
    keyPromise = fetch(`${NOTIFICATIONS_API_URL}/api/v1/push/web-config?kinds=webpush&tenant=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => (b?.enabled && b.kind === 'webpush' && typeof b.vapid_public_key === 'string' ? b.vapid_public_key : null))
      .catch(() => null);
  }
  return keyPromise;
}

/** base64url VAPID key to the bytes PushManager.subscribe expects. */
function keyBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushCapable(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iPhone and iPad allow web push only to a site added to the Home Screen and opened from there. */
export function needsHomeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export type PushState = 'on' | 'off' | 'blocked' | 'install' | 'unsupported';

/**
 * 'on' when this device is subscribed, 'off' when it can be, 'blocked' when the site's
 * notifications are refused, 'install' on an iPhone not yet opened from the Home Screen.
 */
export async function pushState(slug: string): Promise<PushState> {
  if (needsHomeScreen()) return 'install';
  if (!pushCapable() || !(await vapidKey(slug))) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? 'on' : 'off';
}

let refreshed = false;

/**
 * Re-sends this device's subscription for the signed-in user once per page load when alerts are
 * already allowed. The server upserts by subscription, so this repairs a registration that never
 * reached it or belonged to another account on the same phone, without asking again.
 */
export async function refreshPush(slug: string): Promise<void> {
  if (refreshed || !pushCapable() || Notification.permission !== 'granted') return;
  refreshed = true;
  await enablePush(slug);
}

/**
 * Asks for permission (call from a tap), subscribes through the app's service worker and registers
 * the subscription with notifications-api for the signed-in user. Returns true when registered.
 */
export async function enablePush(slug: string): Promise<boolean> {
  const key = await vapidKey(slug);
  const bearer = apiClient.getAccessToken();
  if (!pushCapable() || !key || !bearer) return false;
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return false;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const res = await fetch(`${NOTIFICATIONS_API_URL}/api/v1/push/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ token: JSON.stringify(sub.toJSON()), platform: 'web', provider: 'webpush' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
