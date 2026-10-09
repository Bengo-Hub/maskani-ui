'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isNetworkError } from '@/lib/api/errors';
import { gateDeviceApi, type InsidePerson, type SignOnResult, type SyncResponse, type WalkInPolicy } from '@/lib/gate/api';
import { getDevice, type GateDeviceCreds } from '@/lib/gate/device';
import { enqueueEvent, flushGateQueue, getPendingGateCount, loadCache, saveCache, type CachedPass, type GateEventInput } from '@/lib/gate/queue';

const SYNC_MS = 5 * 60 * 1000;
const SHIFT_KEY = (slug: string) => `maskani-gate-shift:${slug}`;
const POLICY_KEY = (deviceId: string) => `maskani-gate-policy:${deviceId}`;

/** An inside row the tablet recorded offline: its event_id is the client event id. */
export type LocalInside = InsidePerson & { local?: boolean };

export type RecordGateEvent = (e: Omit<GateEventInput, 'client_event_id' | 'occurred_at' | 'guard_personnel_id'> & { client_event_id?: string }) => Promise<string>;

export interface Guard { id: string; name: string; badge: string; since: string }
type Badge = NonNullable<SyncResponse['cache']['badges']>[number];

/**
 * Everything the gate tablet needs: registration, guard on duty, the offline pass cache
 * (refreshed every 5 minutes while online), and the event queue (flushed when the network returns).
 */
export function useGate(slug: string) {
  const [device, setDevice] = useState<GateDeviceCreds | null>(null);
  const [ready, setReady] = useState(false);
  const [guard, setGuard] = useState<Guard | null>(null);
  const [passes, setPasses] = useState<CachedPass[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [walkInPolicy, setWalkInPolicy] = useState<WalkInPolicy>('guard_decides');
  // Entries recorded while the queue could not be sent: the server's inside list does not have
  // them yet, so an exit names them by their client id.
  const [localInside, setLocalInside] = useState<LocalInside[]>([]);
  const deviceRef = useRef<GateDeviceCreds | null>(null);

  const refreshPending = useCallback(async () => setPending(await getPendingGateCount()), []);

  const sync = useCallback(async () => {
    const d = deviceRef.current;
    if (!d) return;
    try {
      await flushGateQueue();
      const res = await gateDeviceApi(d).sync();
      const list = res.cache.passes ?? [];
      await saveCache(d, list);
      setPasses(list);
      setBadges(res.cache.badges ?? []);
      setSyncedAt(Date.now());
      setOnline(true);
      setLocalInside([]);
      const policy = res.cache.walk_in_policy ?? 'guard_decides';
      setWalkInPolicy(policy);
      try { localStorage.setItem(POLICY_KEY(d.deviceId), policy); } catch { /* storage blocked */ }
    } catch (e) {
      if (isNetworkError(e)) setOnline(false);
    } finally {
      void refreshPending();
    }
  }, [refreshPending]);

  // Load registration, shift and cache once.
  useEffect(() => {
    const d = getDevice(slug);
    deviceRef.current = d;
    setDevice(d);
    if (!d) { setReady(true); return; }
    try {
      const raw = localStorage.getItem(SHIFT_KEY(slug));
      if (raw) setGuard(JSON.parse(raw) as Guard);
      if (localStorage.getItem(POLICY_KEY(d.deviceId)) === 'ask_host') setWalkInPolicy('ask_host');
    } catch { /* storage blocked */ }
    void loadCache(d).then(({ passes: cached, syncedAt: at }) => {
      setPasses(cached);
      setSyncedAt(at);
      setReady(true);
      void sync();
    });
  }, [slug, sync]);

  // Periodic sync, reconnect flush, and the service worker's background-sync wake-up.
  useEffect(() => {
    if (!device) return;
    const timer = setInterval(() => void sync(), SYNC_MS);
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    const onMessage = (e: MessageEvent) => { if (e.data?.type === 'MASKANI_GATE_SYNC') void sync(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [device, sync]);

  const signOn = useCallback(async (badge: string, pin: string): Promise<SignOnResult> => {
    const d = deviceRef.current;
    if (!d) throw new Error('This tablet is not registered');
    const res = await gateDeviceApi(d).signOn(badge, pin);
    const g: Guard = { ...res.guard, since: res.signed_on_at };
    setGuard(g);
    try { localStorage.setItem(SHIFT_KEY(slug), JSON.stringify(g)); } catch { /* storage blocked */ }
    void sync();
    return res;
  }, [slug, sync]);

  const signOff = useCallback(() => {
    setGuard(null);
    try { localStorage.removeItem(SHIFT_KEY(slug)); } catch { /* storage blocked */ }
  }, [slug]);

  /** Records an entry, exit or denial: queued first, then sent; offline it waits in the queue. */
  const record: RecordGateEvent = useCallback(async (event) => {
    const d = deviceRef.current;
    if (!d) return '';
    const full: GateEventInput = {
      ...event,
      client_event_id: event.client_event_id ?? crypto.randomUUID(),
      occurred_at: new Date().toISOString(),
      guard_personnel_id: guard?.id,
      offline: !navigator.onLine || event.offline,
    };
    await enqueueEvent(d, full);
    if (full.kind === 'entry' && full.pass_id) {
      // Count the entry locally so a single-use pass cannot be reused while offline.
      setPasses((list) => list.map((p) => (p.id === full.pass_id ? { ...p, entries_used: p.entries_used + 1 } : p)));
    }
    try {
      await flushGateQueue();
      setOnline(true);
    } catch (e) {
      if (isNetworkError(e)) setOnline(false);
      if (full.kind === 'entry') {
        setLocalInside((list) => [{ event_id: full.client_event_id, visitor_name: full.visitor_name ?? 'Visitor',
          vehicle_plate: full.vehicle_plate, host_unit_id: full.host_unit_id, since: full.occurred_at,
          pass_id: full.pass_id, walk_in: !full.pass_id, local: true }, ...list]);
      }
      if (full.kind === 'exit' && full.entry_client_event_id) {
        setLocalInside((list) => list.filter((p) => p.event_id !== full.entry_client_event_id));
      }
    }
    void refreshPending();
    return full.client_event_id;
  }, [guard?.id, refreshPending]);

  return { device, ready, guard, passes, badges, syncedAt, online, pending, walkInPolicy, localInside, sync, signOn, signOff, record };
}
