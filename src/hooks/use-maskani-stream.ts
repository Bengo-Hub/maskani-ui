'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, tenantBase } from '@/lib/config';
import { keysForEvent } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

const EVENT_TYPES = [
  'billing_run.progress', 'payment.applied', 'work_order.updated', 'gate.event',
  'walk_in.requested', 'walk_in.decided', 'reading.saved', 'notice.status',
];

export interface StreamEvent {
  type: string;
  id?: string;
  property_id?: string;
  unit_id?: string;
}

type Listener = (e: StreamEvent) => void;
const listeners = new Set<Listener>();

/** Lets a screen react to a specific event (for example a walk-in request) beyond cache refresh. */
export function onStreamEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * One EventSource per signed-in session. Events are hints: each invalidates the matching queries
 * and the screens refetch. Reconnects with backoff (2 s up to 30 s) and refetches active queries
 * after a reconnect, since events sent while disconnected are not replayed.
 */
export function useMaskaniStream(slug: string) {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.session?.accessToken ?? '');
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const hasToken = token !== '';

  useEffect(() => {
    if (!slug || !hasToken || typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    let retry = 2000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let connectedOnce = false;

    const handle = (type: string) => (msg: MessageEvent) => {
      let data: StreamEvent = { type };
      try { data = { ...JSON.parse(msg.data), type }; } catch { /* hint without body */ }
      for (const key of keysForEvent(slug, type)) void qc.invalidateQueries({ queryKey: key });
      listeners.forEach((fn) => fn(data));
    };

    const connect = () => {
      if (closed) return;
      const url = `${API_URL}${tenantBase(slug)}/stream?token=${encodeURIComponent(tokenRef.current)}`;
      es = new EventSource(url);
      es.onopen = () => {
        retry = 2000;
        if (connectedOnce) void qc.invalidateQueries({ queryKey: [slug], refetchType: 'active' });
        connectedOnce = true;
      };
      for (const t of EVENT_TYPES) es.addEventListener(t, handle(t) as EventListener);
      es.onerror = () => {
        es?.close();
        es = null;
        if (closed) return;
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 30000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
    // Reconnect only when the tenant or signed-in state changes, not on each token refresh;
    // the ref hands the latest token to the next reconnect.
  }, [slug, hasToken, qc]);
}
