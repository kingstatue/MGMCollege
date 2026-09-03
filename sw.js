const CACHE_PREFIX = 'mgm-absentee-informer';
const CACHE_NAME = 'mgm-absentee-informer-v81-update';
// Do NOT precache app.js / index / css — mobile was stuck on broken cached JS after updates.
// Network-first fetch handler still caches them after a successful live load.
const ASSETS_TO_CACHE = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

function isOwnCache(name) {
  return String(name || '').indexOf(CACHE_PREFIX) === 0;
}

function isOtherAppPath(pathname) {
  const p = String(pathname || '');
  return p.indexOf('/att_appAllstreams/') !== -1
    || p.indexOf('/aaaacrypt/') !== -1
    || p.indexOf('/MGMEC_absentee/') !== -1
    || p.indexOf('/mgmec/') !== -1;
}

// Install Event - Precache icons only and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Install', CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE).catch(() => undefined);
    })
  );
});

// Activate — purge ONLY this app's old caches (never touch BCA / Evening caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (isOwnCache(cache) && cache !== CACHE_NAME) {
            console.log('[PWA SW] Deleting old college cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Allow page bootstrap to force activate waiting worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - ALWAYS NETWORK FIRST for HTML, JS, CSS so app updates automatically when online
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Bypass cache for external APIs (Google Apps Script API)
  if (url.origin !== location.origin) return;

  // Never intercept sibling apps if co-hosted on the same origin
  if (isOtherAppPath(url.pathname)) return;

  // Always hit network for version.json (update detection must not use stale cache)
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('version.json')) return;

  const isCoreAsset = url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isCoreAsset) {
    // Network-First — never prefer stale JS (mobile freeze after broken deploy)
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-First for images/fonts
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
