// Trace service worker (Northpeak). Offline app shell; account/sync and FDA calls go straight to the network.
// auto-update: a new version installs fresh files (cache: 'reload'), takes over at once (skipWaiting + clients.claim), and np-update.js reloads when safe.
const V = 'trace-v11';
const SHELL = ["./", "index.html", "style.css?v=11", "manifest.webmanifest", "js/store.js?v=11", "js/app.js?v=11", "js/fda.js?v=11", "js/insights.js?v=11", "js/graph.js?v=11", "js/tools.js?v=11", "js/xfer.js?v=11", "js/cmd.js?v=11", "js/account.js?v=11", "js/cloud.js?v=11", "js/cloud-boot.js?v=11", "np-update.js?v=11", "np-email.js?v=11", "nozoom.js", "pwa.js", "icon-180.png", "icon-192.png", "icon-512.png"];
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
