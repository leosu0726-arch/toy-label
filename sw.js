// 版本號每次改版都要往上加，否則使用者不會取得新版
var VERSION = 'v10';
var CACHE = 'toy-label-' + VERSION;
var FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILES); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) { return caches.delete(k); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 讓網頁可以問「現在是哪一版」
self.addEventListener('message', function (e) {
  if (e.data === 'version' && e.source) {
    e.source.postMessage({ swVersion: VERSION });
  }
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }

  var isDoc = (e.request.mode === 'navigate') ||
              (e.request.destination === 'document');

  if (isDoc) {
    // 網頁本身：網路優先，確保永遠拿到最新版；離線時才用快取
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 圖示等靜態檔：快取優先，背景更新
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
