// Trace service worker (Northpeak). Offline app shell; account/sync and FDA calls go straight to the network.
// auto-update: a new version installs fresh files (cache: 'reload'), takes over at once (skipWaiting + clients.claim), and np-update.js reloads when safe.
const V = 'trace-v9';
const SHELL = ["./", "index.html", "style.css?v=9", "manifest.webmanifest", "js/store.js?v=9", "js/app.js?v=9", "js/fda.js?v=9", "js/insights.js?v=9", "js/graph.js?v=9", "js/tools.js?v=9", "js/xfer.js?v=9", "js/cmd.js?v=9", "js/account.js?v=9", "js/cloud.js?v=9", "js/cloud-boot.js?v=9", "np-update.js?v=9", "np-email.js?v=9", "nozoom.js", "pwa.js", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('trace-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/trace/')) return;
  if (u.searchParams.has('npu')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); } return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});
