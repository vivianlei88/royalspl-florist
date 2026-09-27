// RoyalSpl 後台管理 Service Worker
// v2：網絡優先策略（後台需要實時數據），只快取靜態資源，唔快取 API 請求
const CACHE_NAME = 'royalspl-admin-v2';
const STATIC_CACHE = [
  '/admin.html',
  '/admin-manifest.json',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/assets/pwa-192.png',
  '/assets/pwa-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(STATIC_CACHE);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('fetch', function(event) {
  const req = event.request;
  // 只處理 GET + 同源請求
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }
  // 唔快取 API / 數據請求（Supabase、Stripe 等跨域或帶查詢嘅數據接口）
  const url = new URL(req.url);
  if (req.url.indexOf('supabase.co') !== -1 ||
      req.url.indexOf('stripe.com') !== -1 ||
      url.pathname.indexOf('/api/') !== -1 ||
      url.pathname.indexOf('supabase') !== -1) {
    return;
  }

  // 網絡優先：後台要最新數據/檔案，失敗先 fallback 快取
  event.respondWith(
    fetch(req)
      .then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(req).then(function(cached) {
          if (cached) return cached;
          // 靜態檔離線 fallback
          if (url.pathname.indexOf('.html') !== -1) {
            return caches.match('/admin.html');
          }
          return Response.error();
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});
