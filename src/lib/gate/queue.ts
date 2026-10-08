import Dexie, { type Table } from 'dexie';
import { apiClient } from '@/lib/api/client';
import type { GateEventKind } from '@/lib/api/types';
import { anyDevice, type GateDeviceCreds } from './device';
import { open, seal, type Sealed } from './crypto';

/** One gate entry as the API takes it (`POST /api/v1/gate/events`). */
export interface GateEventInput {
  client_event_id: string;
  kind: GateEventKind;
  pass_id?: string;
  visitor_name?: string;
  visitor_phone?: string;
  host_unit_id?: string;
  vehicle_plate?: string;
  id_sighted?: boolean;
  occurred_at: string;
  offline?: boolean;
  guard_personnel_id?: string;
  notes?: string;
}

export interface CachedPass {
  id: string;
  code_hash: string;
  qr_hash: string;
  visitor_name: string;
  unit_id?: string;
  valid_from: string;
  valid_to: string;
  recurrence?: Record<string, unknown>;
  max_entries: number;
  entries_used: number;
}

interface QueueRow { id: string; created_at: number; sealed: Sealed }
interface CacheRow { key: string; synced_at: number; sealed: Sealed }

class GateDB extends Dexie {
  queue!: Table<QueueRow, string>;
  cache!: Table<CacheRow, string>;
  constructor() {
    super('maskani-gate');
    this.version(1).stores({ queue: 'id, created_at', cache: 'key' });
  }
}

let db: GateDB | null = null;
function gateDb(): GateDB | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!db) db = new GateDB();
  return db;
}

export async function enqueueEvent(device: GateDeviceCreds, event: GateEventInput): Promise<void> {
  const d = gateDb();
  if (!d) return;
  await d.queue.put({ id: event.client_event_id, created_at: Date.now(), sealed: await seal(device.deviceKey, event) });
}

export async function getPendingGateCount(): Promise<number> {
  try {
    return (await gateDb()?.queue.count()) ?? 0;
  } catch {
    return 0;
  }
}

let flushing: Promise<number> | null = null;

/**
 * Sends queued entries oldest first in batches of 100. The server deduplicates on
 * client_event_id, so a retry after a dropped response is safe. Returns how many were sent.
 */
export function flushGateQueue(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const d = gateDb();
    const device = anyDevice();
    if (!d || !device) return 0;
    let sent = 0;
    for (;;) {
      const rows = await d.queue.orderBy('created_at').limit(100).toArray();
      if (!rows.length) break;
      const events = await Promise.all(rows.map((r) => open<GateEventInput>(device.deviceKey, r.sealed)));
      await apiClient.device('post', '/api/v1/gate/events', device.deviceKey, { events });
      await d.queue.bulkDelete(rows.map((r) => r.id));
      sent += rows.length;
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export async function saveCache(device: GateDeviceCreds, passes: CachedPass[]): Promise<void> {
  const d = gateDb();
  if (!d) return;
  await d.cache.put({ key: `passes:${device.deviceId}`, synced_at: Date.now(), sealed: await seal(device.deviceKey, passes) });
}

export async function loadCache(device: GateDeviceCreds): Promise<{ passes: CachedPass[]; syncedAt: number | null }> {
  const d = gateDb();
  const row = d ? await d.cache.get(`passes:${device.deviceId}`) : undefined;
  if (!row) return { passes: [], syncedAt: null };
  try {
    return { passes: await open<CachedPass[]>(device.deviceKey, row.sealed), syncedAt: row.synced_at };
  } catch {
    return { passes: [], syncedAt: null };
  }
}

export async function clearGateData(): Promise<void> {
  const d = gateDb();
  if (!d) return;
  await Promise.all([d.queue.clear(), d.cache.clear()]);
}
