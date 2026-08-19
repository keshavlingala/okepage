/* ============================================================================
   Service worker — makes Okepage work with no network at all.

   The app is a handful of static files, so the strategy is deliberately dumb:
   install precaches every one of them, and afterwards everything is served
   from the cache first. There is no build step and therefore no content
   hashing, so VERSION below is the cache buster — **bump it whenever you
   change a file in FILES**, otherwise browsers keep serving the old copy.

   Google Fonts is the one thing fetched from another origin. It is cached as
   it is used rather than up front, so a first visit that is already offline
   still works — the CSS falls back to system fonts.
   ========================================================================= */

const VERSION = '1';
const SHELL_CACHE = 'okepage-shell-v' + VERSION;
const FONT_CACHE = 'okepage-fonts-v1';
const CACHES = [SHELL_CACHE, FONT_CACHE];

/* Everything the app needs to start. Paths are relative so the worker also
   works when the site is served from a subdirectory. */
const FILES = [
  './',
  'index.html',
  'css/app.css',
  'js/i18n.js',
  'js/store.js',
  'js/layout.js',
  'js/offline.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

const isFont = url => FONT_ORIGINS.includes(url.origin);

/* ── Install ─────────────────────────────────────────────────────────────── */
/* `cache: 'reload'` skips the HTTP cache, so a new worker really does pick up
   the new files instead of re-caching whatever the browser had lying around. */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' })))
    )
  );
  /* No skipWaiting(): the running page decides when to switch over, so a
     reload never lands mid-print. js/offline.js sends 'skip-waiting'. */
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

/* ── Activate ────────────────────────────────────────────────────────────── */

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(name => name.startsWith('okepage-') && !CACHES.includes(name))
           .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

/* ── Fetch ───────────────────────────────────────────────────────────────── */

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Any navigation — including the SPA fallback for an unknown path — is the
     one page this app has. */
  if (request.mode === 'navigate') {
    event.respondWith(shell(event));
    return;
  }

  if (isFont(url)) {
    event.respondWith(cacheFirst(event, FONT_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event, SHELL_CACHE));
  }
});

/** The app shell, from cache when it is there, refreshed quietly in the back. */
async function shell(event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match('index.html');
  if (cached) {
    revalidate(event, cache, 'index.html');
    return cached;
  }
  return fetch(event.request);
}

/**
 * Serve from the cache, fall back to the network, and store what comes back.
 * A hit is also refreshed in the background, so the cache heals itself even
 * when VERSION was not bumped.
 */
async function cacheFirst(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  if (cached) {
    revalidate(event, cache);
    return cached;
  }

  try {
    const response = await fetch(event.request);
    await put(cache, event.request, response);
    return response;
  } catch (err) {
    /* Offline and never cached: let the browser show its own failure. */
    return Response.error();
  }
}

function revalidate(event, cache, key) {
  /* waitUntil keeps the worker alive long enough for the refresh to land. */
  event.waitUntil(
    fetch(event.request)
      .then(response => put(cache, key || event.request, response))
      .catch(() => { /* offline — the cached copy stays */ })
  );
}

async function put(cache, key, response) {
  /* status 0 is an opaque cross-origin response (the Google Fonts files);
     those are worth keeping even though they cannot be read. */
  if (!response || (response.status !== 0 && !response.ok)) return;
  try {
    await cache.put(key, response.clone());
  } catch (err) {
    /* Quota or an unstorable response — not worth failing the request over. */
  }
}
