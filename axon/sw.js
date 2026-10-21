/* Axon offline cache · Northpeak Studios */
var CACHE = 'axon-v1.8.1';
var SHELL = ['./', './index.html', './app.css?v=49', './md.js?v=49', './zip.js?v=49', './db.js?v=49', './graph.js?v=49', './sync.js?v=49', './synlink.js?v=49', './app.js?v=49',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/icon-32.png', './icons/favicon.svg'];
self.addEventListener('install', function (e) {
  /* cache: 'reload' skips the browser's HTTP cache so a new version never stores an old page */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
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
