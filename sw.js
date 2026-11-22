const CACHE = 'munshiji-os-v8.3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(res => {
      if (e.request.method === 'GET') { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
