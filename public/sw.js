/**
 * FleetMaster Pro — Service Worker
 * Stratégie : Network-first pour les API, Cache-first pour les assets statiques
 * Version : incrémentée à chaque déploiement (change le CACHE_NAME pour forcer le refresh)
 */

const CACHE_VERSION = 'v1';
const CACHE_STATIC  = `fleetmaster-static-${CACHE_VERSION}`;
const CACHE_PAGES   = `fleetmaster-pages-${CACHE_VERSION}`;

// Assets mis en cache au premier chargement (shell de l'app)
const STATIC_PRECACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Active immédiatement sans attendre que les anciens clients ferment
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(STATIC_PRECACHE)
    )
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  // Prend le contrôle des pages existantes immédiatement
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge les anciens caches (différentes version)
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('fleetmaster-') && ![CACHE_STATIC, CACHE_PAGES].includes(key))
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET, les extensions Chrome, les hot-reload Next.js
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/static/development')
  ) {
    return;
  }

  // ── Appels API : Network-first, fallback cache (1h max) ──────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHE_PAGES, { maxAge: 60 * 60 }));
    return;
  }

  // ── Assets statiques Next.js (_next/static) : Cache-first permanent ──────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Icônes et images PWA : Cache-first long ───────────────────────────────
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Pages HTML : Network-first, pas de cache (données fraîches) ──────────
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, CACHE_PAGES, { maxAge: 0 }));
    return;
  }

  // ── Tout le reste : Network avec fallback cache ──────────────────────────
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'FleetMaster', body: event.data.text() };
  }

  const title   = payload.title  || 'FleetMaster Pro';
  const options = {
    body:  payload.body    || '',
    icon:  payload.icon    || '/icons/icon-192x192.png',
    badge: payload.badge   || '/icons/icon-96x96.png',
    tag:   payload.tag     || 'fleetmaster-default',
    data:  payload.data    || {},
    vibrate: [200, 100, 200],
    requireInteraction: payload.priority === 'critical',
    actions: payload.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si une fenêtre FleetMaster est déjà ouverte, la focus
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Sinon, ouvrir un nouvel onglet
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// ─── Stratégies ───────────────────────────────────────────────────────────────

/**
 * Cache-first : renvoie depuis le cache si disponible, sinon réseau + mise en cache
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ressource indisponible hors-ligne', { status: 503 });
  }
}

/**
 * Network-first : essaie le réseau, tombe sur le cache si échec
 * maxAge = 0 → ne met pas en cache (données dynamiques)
 */
async function networkFirst(request, cacheName, { maxAge = 0 } = {}) {
  try {
    const response = await fetch(request);
    if (response.ok && maxAge > 0) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ||
      new Response(JSON.stringify({ error: 'Hors-ligne', offline: true }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
}
