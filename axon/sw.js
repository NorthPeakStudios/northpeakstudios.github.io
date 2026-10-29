/* Axon offline cache · Northpeak Studios */
var CACHE = 'axon-v1.19.0';
var SHELL = ['./', './index.html', './app.css?v=63', './md.js?v=50', './zip.js?v=50', './db.js?v=50', './graph.js?v=51', './sync.js?v=51', './np-email.js?v=3', './synlink.js?v=50', './app.js?v=70', './np-update.js?v=1', './nozoom.js', './pwa.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/icon-32.png', './icons/favicon.svg'];
self.addEventListener('install', function (e) {
  /* cache: 'reload' skips the browser's HTTP cache so a new version never stores an old page */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
/* np-update.js may ask a waiting worker to take over right away */
self.addEventListener('message', function (e) { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('axon-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;
  if (url.searchParams.has('npu')) return; /* np-update.js's fresh look at the page: straight to the network, never cached */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(url.origin + url.pathname, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); e.waitUntil(caches.open(CACHE).then(function (c) { return c.put('./index.html', copy); })); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) { return c.match('./index.html').then(function (r) { return r || c.match('./'); }); });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') { var copy = res.clone(); c.put(req, copy); }
        return res;
      }).catch(function () { return hit; });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    });
  }));
});
