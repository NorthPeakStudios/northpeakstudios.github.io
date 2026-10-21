// liminal service worker — offline app shell. no network calls of its own (sync goes straight to the network; it never touches this cache).
const V = 'liminal-v17';
const SHELL = ['./', 'index.html', 'app.css?v=14', 'manifest.webmanifest', 'js/app.js?v=13', 'js/audio.js', 'js/cloud.js?v=13', 'js/color.js', 'js/db.js', 'js/paint.js?v=12', 'js/poet.js', 'js/prompts.js',
  'fonts/instrument-serif-normal.woff2', 'fonts/instrument-serif-italic.woff2', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg', 'icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('liminal-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // network-first for the page so updates land; cache-first for everything else
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});
