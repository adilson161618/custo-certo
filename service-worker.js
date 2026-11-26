// ============================================================
// Custo Certo Service Worker (mesmo padrão do EntregaLog)
// index.html, version.json, manifest: NETWORK-FIRST (atualiza na hora)
// Demais arquivos: CACHE-FIRST (funciona sem internet)
// ============================================================

const SW_VERSION = '1.0.0';
const STATIC_CACHE = 'custocerto-static-v' + SW_VERSION;
const RUNTIME_CACHE = 'custocerto-runtime';
const CACHE_PREFIX = 'custocerto-';

const STATIC_ASSETS = [
  './index.html',
  './custocerto-icon-192.png',
  './custocerto-icon-512.png',
  './favicon-32.png'
];

const ALWAYS_FRESH = ['/version.json', '/index.html', '/manifest.json', '/service-worker.js'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return Promise.all(STATIC_ASSETS.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(CACHE_PREFIX) === 0 && k !== STATIC_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isAlwaysFresh(url) {
  return ALWAYS_FRESH.some(function (p) { return url.pathname.endsWith(p); });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isAlwaysFresh(url) || req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then(function (resp) {
        if (resp && resp.ok) { var copy = resp.clone(); caches.open(STATIC_CACHE).then(function (c) { c.put(req, copy); }); }
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (c) { return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok) { var copy = resp.clone(); caches.open(RUNTIME_CACHE).then(function (c) { c.put(req, copy); }); }
        return resp;
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
