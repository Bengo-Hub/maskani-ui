/**
 * The tablet's registration, stored once by a manager on this device (per tenant slug). The key
 * authenticates every gate call; it is never shown again after registration.
 */
export interface GateDeviceCreds {
  deviceKey: string;
  deviceId: string;
  propertyId: string;
  name: string;
  gateName: string;
  tenantSlug: string;
}

const key = (slug: string) => `maskani-gate-device:${slug}`;

export function getDevice(slug: string): GateDeviceCreds | null {
  try {
    const raw = localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as GateDeviceCreds) : null;
  } catch {
    return null;
  }
}

export function saveDevice(creds: GateDeviceCreds) {
  localStorage.setItem(key(creds.tenantSlug), JSON.stringify(creds));
}

export function forgetDevice(slug: string) {
  localStorage.removeItem(key(slug));
}

/** The slug of whichever tenant this tablet is registered to (the queue flush needs it). */
export function anyDevice(): GateDeviceCreds | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('maskani-gate-device:')) {
        const raw = localStorage.getItem(k);
        if (raw) return JSON.parse(raw) as GateDeviceCreds;
      }
    }
  } catch { /* storage blocked */ }
  return null;
}
