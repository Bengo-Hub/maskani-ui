/* eslint-disable no-restricted-globals */
// Media cache (images from our API /media and /_next/image): see sw-media.js.
importScripts('/sw-media.js');
//
// Hand-written offline-first service worker for the Maskani PWA (fleet pattern: a committed
// static worker, registered by the shared OfflineBar; no build step ever writes this file).
//
//   - Navigations: network-first raced against a short timeout, falling back to the cached
//     document, so a reload on weak data or offline still boots the app shell. The gate tablet
//     relies on this to keep verifying passes from its IndexedDB cache during an outage.
//   - /_next/static and assets: cache-first (content-hashed).
//   - /api and cross-origin: network-only. Data is never cached here; the gate keeps its own
//     encrypted pass cache in IndexedDB.
//   - sync 'maskani-gate-sync': wakes open clients to flush the queued gate events.

const VERSION = 'maskani-sw-v1';
const DOC_CACHE = `${VERSION}-documents`;
const ASSET_CACHE = `${VERSION}-assets`;
const NAV_TIMEOUT_MS = 3500;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== MEDIA_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/splash/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DOC_CACHE);
        const cachedDoc = async () => {
          const exact = await cache.match(request, { ignoreSearch: true });
          if (exact) return exact;
          const any = (await cache.keys())[0];
          return any ? cache.match(any) : undefined;
        };
        const networkFetch = (async () => {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200 && fresh.type === 'basic') cache.put(request, fresh.clone());
          return fresh;
        })();
        try {
          const hasCached = !!(await cache.match(request, { ignoreSearch: true })) || (await cache.keys()).length > 0;
          if (!hasCached) return await networkFetch;
          const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), NAV_TIMEOUT_MS));
          const winner = await Promise.race([networkFetch.catch(() => 'error'), timeout]);
          if (winner !== 'timeout' && winner !== 'error') return winner;
          networkFetch.catch(() => {});
          const doc = await cachedDoc();
          if (doc) return doc;
          return await networkFetch;
        } catch {
          const doc = await cachedDoc();
          if (doc) return doc;
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;padding:2rem;color:#4E1240">You are offline. Maskani will open again when the connection returns.</body>',
            { headers: { 'Content-Type': 'text/html' }, status: 200 },
          );
        }
      })(),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
});

function wakeClientsToSync() {
  return self.clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => clients.forEach((c) => c.postMessage({ type: 'MASKANI_GATE_SYNC' })));
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'maskani-gate-sync') event.waitUntil(wakeClientsToSync());
});

// Web push (notifications-api): a host ring or a visitor arrival. The payload is
// {notification: {title, body}, data: {url, ...}}; a ring stays on screen until answered.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  const n = payload.notification || {};
  const data = payload.data || {};
  const ring = data.ring === 'true' || /walk-ins\//.test(data.url || '');
  event.waitUntil(self.registration.showNotification(n.title || 'Maskani', {
    body: n.body || '',
    data,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.url || 'maskani',
    renotify: true,
    requireInteraction: ring,
    vibrate: ring ? [300, 150, 300, 150, 300] : undefined,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  const target = new URL(url, self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
        if ('navigate' in c) await c.navigate(target);
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
