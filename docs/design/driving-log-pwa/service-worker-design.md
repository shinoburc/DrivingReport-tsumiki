# Service Worker 設計

## 概要

運転日報PWAの完全オフライン動作を実現するためのService Worker設計です。キャッシュ戦略、バックグラウンド処理、プッシュ通知などの機能を定義します。

## 基本構成

### Service Worker の責務
1. **アプリケーションシェルのキャッシュ**
2. **オフライン時のリクエスト処理**
3. **キャッシュの更新管理**
4. **バックグラウンドデータ同期**（将来拡張）
5. **アプリケーションの更新通知**

## キャッシュ戦略

### キャッシュ名定義
```javascript
const CACHE_NAMES = {
  APP_SHELL: 'driving-log-shell-v1',
  STATIC_ASSETS: 'driving-log-static-v1',
  DYNAMIC_CONTENT: 'driving-log-dynamic-v1'
};

const CACHE_VERSION = '1.0.0';
```

### 1. App Shell キャッシュ（Cache First）
アプリケーションの基本構造を構成するファイル

**対象ファイル**:
```javascript
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/controllers/DrivingLogController.js',
  '/js/services/GPSService.js',
  '/js/services/StorageService.js',
  '/js/services/CSVService.js',
  '/js/models/DrivingLog.js',
  '/js/models/Location.js',
  '/js/utils/helpers.js',
  '/manifest.json'
];
```

**戦略**: Cache First
- キャッシュから即座に応答
- ネットワークが利用可能な場合はバックグラウンドで更新

### 2. 静的アセット（Stale While Revalidate）
画像、フォント、アイコンなど

**対象パターン**:
```javascript
const STATIC_ASSET_PATTERNS = [
  /\/assets\/icons\//,
  /\/assets\/images\//,
  /\/assets\/fonts\//,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:woff|woff2|ttf|eot)$/
];
```

**戦略**: Stale While Revalidate
- キャッシュから即座に応答
- 同時にネットワークから最新版を取得してキャッシュ更新

### 3. 動的コンテンツ（Network First）
将来的なAPI呼び出しなど

**戦略**: Network First
- まずネットワークを試行
- 失敗時はキャッシュから応答

## Service Worker ライフサイクル

### インストール時の処理
```javascript
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // App Shellをプリキャッシュ
      caches.open(CACHE_NAMES.APP_SHELL)
        .then(cache => cache.addAll(APP_SHELL_FILES)),
      
      // 設定の初期化
      initializeSettings(),
      
      // 即座にアクティベート
      self.skipWaiting()
    ])
  );
});
```

### アクティベート時の処理
```javascript
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // 古いキャッシュの削除
      cleanupOldCaches(),
      
      // 全てのクライアントを制御下に
      self.clients.claim()
    ])
  );
});
```

## リクエスト処理

### Fetch イベントハンドラー
```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // HTMLリクエスト（App Shell）
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }
  
  // 静的アセット
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
  
  // その他のリクエスト
  event.respondWith(handleDefaultRequest(request));
});
```

### ハンドラー実装

#### App Shell リクエスト処理
```javascript
async function handleDocumentRequest(request) {
  try {
    // キャッシュから取得
    const cache = await caches.open(CACHE_NAMES.APP_SHELL);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      // バックグラウンドで更新チェック
      updateAppShellInBackground();
      return cachedResponse;
    }
    
    // キャッシュにない場合はネットワークから
    const networkResponse = await fetch(request);
    cache.put('/', networkResponse.clone());
    return networkResponse;
    
  } catch (error) {
    // オフライン時の対応
    return new Response(
      '<h1>オフラインです</h1><p>インターネット接続を確認してください。</p>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
```

#### 静的アセット リクエスト処理
```javascript
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC_ASSETS);
  
  // Stale While Revalidate戦略
  const cachedResponse = await cache.match(request);
  
  const networkFetch = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cachedResponse);
  
  return cachedResponse || networkFetch;
}
```

## バックグラウンド同期

### 同期イベント処理
```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-data-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  // 将来的な機能：データの同期処理
  console.log('Background sync performed');
}
```

## プッシュ通知

### プッシュイベント処理
```javascript
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'データが更新されました',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'driving-log-update',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: '確認',
        icon: '/assets/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/assets/icons/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('運転日報PWA', options)
  );
});
```

### 通知クリック処理
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
```

## キャッシュ管理

### キャッシュ更新戦略
```javascript
async function updateAppShellInBackground() {
  try {
    const cache = await caches.open(CACHE_NAMES.APP_SHELL);
    
    // 重要なファイルを個別に更新
    const criticalFiles = ['/index.html', '/js/app.js', '/css/main.css'];
    
    for (const file of criticalFiles) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          await cache.put(file, response);
        }
      } catch (error) {
        console.warn(`Failed to update ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Background update failed:', error);
  }
}
```

### 古いキャッシュの削除
```javascript
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHE_NAMES);
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (!currentCaches.includes(cacheName)) {
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}
```

## エラーハンドリング

### ネットワークエラー対応
```javascript
async function handleNetworkError(request) {
  // HTMLリクエストの場合
  if (request.destination === 'document') {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>オフライン - 運転日報PWA</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>オフラインモード</h1>
          <p>現在インターネットに接続されていませんが、基本機能は引き続き利用できます。</p>
          <button onclick="location.reload()">再接続を試す</button>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // その他のリクエストの場合
  return new Response(
    JSON.stringify({ error: 'ネットワークエラー', offline: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

## デバッグ支援

### 開発時のログ機能
```javascript
function debugLog(message, data = null) {
  if (self.location.hostname === 'localhost') {
    console.log(`[SW] ${message}`, data);
  }
}

// キャッシュ状態の監視
async function logCacheStatus() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    debugLog(`Cache ${cacheName}: ${keys.length} items`);
  }
}
```

## パフォーマンス最適化

### 効率的なキャッシュ戦略
1. **重要度に応じたキャッシュ優先度**
2. **サイズ制限の実装**（古いエントリの自動削除）
3. **プリロードの最適化**
4. **不要なキャッシュの定期クリーンアップ**

### メモリ使用量の最適化
```javascript
// キャッシュサイズの制限
const MAX_CACHE_SIZE = 50; // 50MB

async function enforceQuotaPolicy() {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  
  if (percentUsed > 80) {
    await cleanupOldCaches();
    await removeOldEntries();
  }
}
```