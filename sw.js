// Service Worker — Budżet PWA
// Strategia:
//   - static (HTML/CSS/JS/ikony) → cache-first (działa offline)
//   - dane (dane.json, dane-marta.json, Apps Script) → network-first (świeże gdy online, fallback z cache offline)
//   - bump CACHE_VERSION = wymusza refresh starych assetów

const CACHE_VERSION = 'v10';
const STATIC_CACHE = `budzet-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `budzet-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/core.js',
  './js/views.js',
  './js/modals.js',
  './js/app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
];

// Install — wstępne cache'owanie static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — czyść stare cache'e po bumpe CACHE_VERSION + force reload otwartych klientów
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Po claim wymuś reload wszystkich otwartych zakładek, żeby dostały nowy JS bez ręcznego refreshu
    const clientsList = await self.clients.matchAll({ type: 'window' });
    clientsList.forEach(c => { try { c.navigate(c.url); } catch (_) {} });
  })());
});

// Fetch — routing
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Tylko GET — POST/PUT do Apps Script idą bezpośrednio (bez cache)
  if (req.method !== 'GET') return;

  // Apps Script i dynamiczne dane → network-first
  const isData = url.hostname.includes('script.google.com')
              || url.pathname.endsWith('/dane.json')
              || url.pathname.endsWith('/dane-marta.json')
              || url.pathname.endsWith('/dane-edits.json');

  if (isData) {
    event.respondWith(networkFirst(req));
    return;
  }

  // CDN-y (ExcelJS, Google Fonts) → cache-first z runtime cache
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.')) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // Static assets → cache-first
  event.respondWith(cacheFirst(req, STATIC_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    return cached || Response.error();
  }
}
