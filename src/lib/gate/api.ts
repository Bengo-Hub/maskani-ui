import { apiClient } from '@/lib/api/client';
import type { InsidePerson, VisitorPass } from '@/lib/api/types';
import type { GateDeviceCreds } from './device';
import type { CachedPass } from './queue';

/** Gate tablet API (`/api/v1/gate/*`), authenticated by the device key. */

/** A returning visitor from the property's visitor register. */
export interface VisitorMatch {
  id: string;
  name: string;
  phone?: string;
  vehicle_plate?: string;
  id_number_hint?: string;
  visits: number;
  last_visit_at?: string;
  last_host_unit_id?: string;
  last_unit_code?: string;
  banned: boolean;
  notes?: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  pass?: VisitorPass;
  unit_code?: string;
  block?: string;
  host_name?: string;
  visitor?: VisitorMatch;
}

/** guard_decides: the guard lets walk-ins in and the host is told; ask_host: wait for the host or override. */
export type WalkInPolicy = 'guard_decides' | 'ask_host';

export interface SyncResponse {
  device: { id: string; name: string; gate_name: string; property_id: string };
  cache: {
    server_time: string;
    passes: CachedPass[] | null;
    badges: { id: string; badge_number: string; name: string; role?: string; vendor_id: string; has_pin: boolean }[] | null;
    walk_in_policy?: WalkInPolicy;
  };
}

export interface SignOnResult {
  guard: { id: string; name: string; badge: string };
  signed_on_at: string;
}

export type WalkInDecision = 'pending' | 'approved' | 'declined' | 'timeout' | 'none';

export interface WalkInState {
  id: string;
  decision: WalkInDecision;
  decided_at?: string;
  decided_by?: 'host' | 'guard' | '';
  rings?: number;
}

/** Someone let in who has not been recorded leaving (the console's type). */
export type { InsidePerson } from '@/lib/api/types';

const g = (d: GateDeviceCreds) => ({
  verify: (body: { code?: string; qr?: string }) => apiClient.device<VerifyResult>('post', '/api/v1/gate/verify', d.deviceKey, body),
  sync: () => apiClient.device<SyncResponse>('get', '/api/v1/gate/sync', d.deviceKey),
  signOn: (badge: string, pin: string) => apiClient.device<SignOnResult>('post', '/api/v1/gate/sign-on', d.deviceKey, { badge, pin }),
  units: () => apiClient.device<{ data: { id: string; code: string }[] }>('get', '/api/v1/gate/units', d.deviceKey),
  /** {id} is the server id or the tablet's own client event id. */
  walkIn: (id: string) => apiClient.device<WalkInState>('get', `/api/v1/gate/walk-ins/${encodeURIComponent(id)}`, d.deviceKey),
  resolveWalkIn: (id: string, admit: boolean, note?: string) =>
    apiClient.device<WalkInState>('post', `/api/v1/gate/walk-ins/${encodeURIComponent(id)}/resolve`, d.deviceKey, { admit, note }),
  ringHost: (id: string) => apiClient.device<WalkInState>('post', `/api/v1/gate/walk-ins/${encodeURIComponent(id)}/ring`, d.deviceKey),
  inside: () => apiClient.device<{ data: InsidePerson[] | null }>('get', '/api/v1/gate/inside', d.deviceKey),
  visitors: (q: string) =>
    apiClient.device<{ data: VisitorMatch[] | null }>('get', `/api/v1/gate/visitors?q=${encodeURIComponent(q)}`, d.deviceKey),
  incident: (body: { category: string; severity: string; title: string; description?: string; unit_id?: string; occurred_at?: string }) =>
    apiClient.device('post', '/api/v1/gate/incidents', d.deviceKey, body),
});

export const gateDeviceApi = g;
