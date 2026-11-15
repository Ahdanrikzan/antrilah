/*
 * Antrilah service worker.
 * App shell is precached at build time (the Vite plugin injects the manifest),
 * assets are served cache-first, navigations network-first. No external hosts.
 */
const VERSION = 'antrilah-v1.0.0';
const CACHE = VERSION;
const SCOPE = self.registration.scope;
const PRECACHE_URLS = [/*__PRECACHE__*/];
const INDEX = new URL('index.html', SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => {
        const urls = PRECACHE_URLS.map((path) => new URL(path, SCOPE).href);
        if (!urls.includes(INDEX)) urls.push(INDEX);
        return cache.addAll(urls).catch(() => undefined);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('antrilah-') && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function stash(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return;
  const copy = response.clone();
  caches
    .open(CACHE)
    .then((cache) => cache.put(request, copy))
    .catch(() => undefined);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          stash(INDEX, response.clone());
          return response;
        })
        .catch(async () => (await caches.match(INDEX)) || (await caches.match(request)) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        stash(request, response.clone());
        return response;
      });
    }),
  );
});
