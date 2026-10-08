import { apiClient } from '@/lib/api/client';
import type { VisitorPass } from '@/lib/api/types';
import type { GateDeviceCreds } from './device';
import type { CachedPass } from './queue';

/** Gate tablet API (`/api/v1/gate/*`), authenticated by the device key. */

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  pass?: VisitorPass;
  unit_code?: string;
}

export interface SyncResponse {
  device: { id: string; name: string; gate_name: string; property_id: string };
  cache: {
    server_time: string;
    passes: CachedPass[] | null;
    badges: { id: string; badge_number: string; name: string; role?: string; vendor_id: string; has_pin: boolean }[] | null;
  };
}

export interface SignOnResult {
  guard: { id: string; name: string; badge: string };
  signed_on_at: string;
}

const g = (d: GateDeviceCreds) => ({
  verify: (body: { code?: string; qr?: string }) => apiClient.device<VerifyResult>('post', '/api/v1/gate/verify', d.deviceKey, body),
  sync: () => apiClient.device<SyncResponse>('get', '/api/v1/gate/sync', d.deviceKey),
  signOn: (badge: string, pin: string) => apiClient.device<SignOnResult>('post', '/api/v1/gate/sign-on', d.deviceKey, { badge, pin }),
  units: () => apiClient.device<{ data: { id: string; code: string }[] }>('get', '/api/v1/gate/units', d.deviceKey),
  walkIn: (clientEventId: string) =>
    apiClient.device<{ id: string; decision: 'pending' | 'approved' | 'declined' | 'timeout' | 'none'; decided_at?: string }>(
      'get', `/api/v1/gate/walk-ins/${encodeURIComponent(clientEventId)}`, d.deviceKey),
  incident: (body: { category: string; severity: string; title: string; description?: string; unit_id?: string; occurred_at?: string }) =>
    apiClient.device('post', '/api/v1/gate/incidents', d.deviceKey, body),
});

export const gateDeviceApi = g;
