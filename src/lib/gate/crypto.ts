/**
 * At-rest encryption for the gate cache and queue (visitor names and phones are personal data).
 * AES-GCM with a key derived from the device key by HKDF, so the data is unreadable without this
 * tablet's registration. Pass codes themselves are never stored, only device-salted hashes.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function deriveKey(deviceKey: string): Promise<CryptoKey> {
  let p = keyCache.get(deviceKey);
  if (!p) {
    p = (async () => {
      const base = await crypto.subtle.importKey('raw', enc.encode(deviceKey), 'HKDF', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('maskani-gate-cache-v1'), info: enc.encode('aes-gcm') },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    })();
    keyCache.set(deviceKey, p);
  }
  return p;
}

export interface Sealed { iv: string; data: string }

const toB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function seal(deviceKey: string, value: unknown): Promise<Sealed> {
  const key = await deriveKey(deviceKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv: toB64(iv), data: toB64(data) };
}

export async function open<T>(deviceKey: string, sealed: Sealed): Promise<T> {
  const key = await deriveKey(deviceKey);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.data));
  return JSON.parse(dec.decode(plain)) as T;
}

/** sha256(device_id + ":" + value) as hex, matching maskani-api's gate sync hashes. */
export async function deviceHash(deviceId: string, value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`${deviceId}:${value.trim()}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
