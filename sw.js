var CACHE = 'consumos-v5';
var FILES = ['./', 'index.html', 'app.js', 'calc.js', 'firebase-config.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'jszip.min.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  /* Solo archivos propios y las librerías de Firebase; los datos van directos */
  if (u.origin !== location.origin && u.hostname !== 'www.gstatic.com' && u.hostname !== 'fonts.googleapis.com' && u.hostname !== 'fonts.gstatic.com') return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
    return r;
  }).catch(function () { return caches.match(e.request); }));
});
