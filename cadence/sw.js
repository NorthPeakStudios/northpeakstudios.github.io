// Cadence service worker (Northpeak). Offline app shell; account/sync calls go straight to the network.
// auto-update: a new version installs fresh files (cache: 'reload'), takes over at once (skipWaiting + clients.claim), and np-update.js reloads when safe.
const V = 'cadence-v2';
const SHELL = ["./", "index.html", "style.css?v=2", "manifest.webmanifest", "js/theory.js?v=2", "js/audio.js?v=2", "js/ui.js?v=2", "js/content1.js?v=2", "js/content2.js?v=2", "js/quiz.js?v=2", "js/app.js?v=2", "js/tools.js?v=2", "js/vl.js?v=2", "js/analysis.js?v=2", "js/graph.js?v=2", "js/account.js?v=2", "js/cloud.js?v=2", "js/cloud-boot.js?v=2", "np-update.js?v=1", "nozoom.js", "pwa.js", "vpshort.js", "np-email.js?v=1", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cadence-') && k !== V && k !== 'cadence-ext').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin) { // piano samples + music font: cache-first so ear training works offline after the first load
    if (/tonejs\.github\.io\/audio\/salamander|fonts\.(googleapis|gstatic)\.com/.test(u.href)) e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open('cadence-ext').then(c => c.put(e.request, cp)); } return res; })));
    return;
  }
  if (!u.pathname.startsWith('/cadence/')) return;
  if (u.searchParams.has('npu')) return; // np-update.js's fresh look at the page
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); } return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })));
});
