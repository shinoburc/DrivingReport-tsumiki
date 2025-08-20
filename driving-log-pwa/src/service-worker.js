const CACHE_NAME = 'driving-log-pwa-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// キャッシュするファイル
const STATIC_FILES = [
  '/',
  '/index.html',
  '/js/app.js',
  '/css/app.css',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// Service Workerのインストール
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch(error => {
        console.error('Failed to cache static files:', error);
      })
  );
  self.skipWaiting();
});

// Service Workerのアクティベーション
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチイベントの処理
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュから見つかった場合はそれを返す
        if (response) {
          return response;
        }

        // ネットワークから取得を試行
        return fetch(event.request)
          .then(response => {
            // レスポンスが無効な場合は何もしない
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 動的キャッシュに保存
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // ネットワークエラーの場合、オフラインページを返す
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// バックグラウンド同期
self.addEventListener('sync', event => {
  if (event.tag === 'driving-log-sync') {
    event.waitUntil(
      syncDrivingLogs()
    );
  }
});

// プッシュ通知の処理
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'ドライビングログから通知があります',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('ドライビングログ', options)
  );
});

// 通知クリックの処理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// ドライビングログの同期処理
async function syncDrivingLogs() {
  try {
    // IndexedDBから未同期のデータを取得
    // サーバーへ送信
    console.log('Syncing driving logs...');
  } catch (error) {
    console.error('Failed to sync driving logs:', error);
  }
}