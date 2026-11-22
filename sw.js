const CACHE = 'munshiji-os-v6';
const ASSETS = ['./', './index.html', './styles.css', './brandConfig.js', './data.js', './engine.js', './parsers.js', './vault.js', './app.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
