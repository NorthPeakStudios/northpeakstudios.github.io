// Gambit service worker. Offline app shell including the Stockfish engine, so FEN/URL import and analysis work with no network.
// auto-update: a new version installs fresh files (cache: 'reload'), takes over at once (skipWaiting + clients.claim), and np-update.js reloads when safe.
const V = 'gambit-v1';
const SHELL = ["./", "index.html", "style.css?v=2", "manifest.webmanifest", "app.js?v=2", "board.js?v=2", "engine.js?v=2", "review.js?v=2", "vendor/chess.js?v=2", "vendor/pieces.js?v=2", "vendor/merida.js?v=2", "reader.js?v=2", "eco.json?v=2", "engine/stockfish-18-lite-single.js", "engine/stockfish-18-lite-single.wasm", "np-update.js?v=2", "nozoom.js", "pwa.js", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gambit-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (!u.pathname.startsWith('/gambit/')) return;
  if (u.searchParams.has('npu')) return; // np-update.js's fresh look at the page
  if (e.request.mode === 'navigate') { // ?fen= / ?pgn= links open offline from the cached page
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); } return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});
