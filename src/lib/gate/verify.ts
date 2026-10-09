import { isNetworkError } from '@/lib/api/errors';
import { gateDeviceApi, type VerifyResult, type VisitorMatch } from './api';
import { deviceHash } from './crypto';
import type { GateDeviceCreds } from './device';
import type { CachedPass } from './queue';

export interface GateVerdict {
  valid: boolean;
  reason?: string;
  passId?: string;
  visitorName?: string;
  unitCode?: string;
  unitId?: string;
  block?: string;
  hostName?: string;
  passType?: string;
  vehiclePlate?: string;
  entriesLeft?: number;
  visitor?: VisitorMatch;
  validTo?: string;
  offline: boolean;
}

function fromServer(r: VerifyResult): GateVerdict {
  const p = r.pass;
  return {
    valid: r.valid,
    reason: r.reason,
    passId: p?.id,
    visitorName: p?.visitor_name,
    unitCode: r.unit_code,
    unitId: p?.unit_id ?? undefined,
    block: r.block,
    hostName: r.host_name,
    passType: p?.pass_type,
    vehiclePlate: p?.vehicle_plate,
    entriesLeft: p?.max_entries ? Math.max(0, p.max_entries - (p.entries_used ?? 0)) : undefined,
    visitor: r.visitor,
    validTo: p?.valid_to,
    offline: false,
  };
}

/** Checks a code or QR against the device-salted cache (no plain codes are ever stored). */
export async function verifyOffline(device: GateDeviceCreds, passes: CachedPass[], input: { code?: string; qr?: string }): Promise<GateVerdict> {
  const value = (input.code ?? input.qr ?? '').trim();
  if (!value) return { valid: false, reason: 'Enter a code', offline: true };
  const h = await deviceHash(device.deviceId, value);
  const p = passes.find((x) => (input.qr ? x.qr_hash === h : x.code_hash === h));
  if (!p) return { valid: false, reason: 'No such pass in the offline list', offline: true };
  const now = Date.now();
  if (now < new Date(p.valid_from).getTime()) return { valid: false, reason: 'Not valid yet', visitorName: p.visitor_name, offline: true };
  if (now > new Date(p.valid_to).getTime()) return { valid: false, reason: 'Expired', visitorName: p.visitor_name, offline: true };
  if (p.max_entries > 0 && p.entries_used >= p.max_entries) return { valid: false, reason: 'Already used', visitorName: p.visitor_name, offline: true };
  return { valid: true, passId: p.id, visitorName: p.visitor_name, unitId: p.unit_id, validTo: p.valid_to, offline: true };
}

/**
 * Online first; falls back to the cache only when the network fails (a real "not valid" answer
 * from the server is final and never retried offline).
 */
export async function verifyPass(device: GateDeviceCreds, passes: CachedPass[], input: { code?: string; qr?: string }): Promise<GateVerdict> {
  try {
    return fromServer(await gateDeviceApi(device).verify(input));
  } catch (e) {
    if (isNetworkError(e)) return verifyOffline(device, passes, input);
    throw e;
  }
}
