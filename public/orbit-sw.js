const CACHE = 'orbit-shell-v3';
const PAGES = ['/', '/journal', '/journal/history', '/voice-notes', '/voice-notes/archive', '/companion', '/insights', '/sensors', '/timeline', '/settings', '/healthcare'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    for (const path of PAGES) { try { await cache.add(path); } catch {} }
    self.skipWaiting();
  }));
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_RESOURCES' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.all(event.data.urls.filter(url => new URL(url, self.location.origin).origin === self.location.origin).map(async url => {
      try { await cache.add(url); } catch {}
    }));
  }));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE);
    const match = await cache.match(event.request);
    if (match) return match;
    if (event.request.mode === 'navigate') { const shell = await cache.match('/'); if (shell) return shell; }
    return new Response('Not available offline', { status: 503 });
  }));
});