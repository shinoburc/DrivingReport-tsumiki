// Service Worker for 運転日報PWA
const CACHE_VERSION = '1.0.0';
const CACHE_NAMES = {
  APP_SHELL: `driving-log-shell-v${CACHE_VERSION}`,
  STATIC_ASSETS: `driving-log-static-v${CACHE_VERSION}`,
  DYNAMIC_CONTENT: `driving-log-dynamic-v${CACHE_VERSION}`
};

// App Shell files to cache
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/mobile.css',
  '/js/app.js'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.APP_SHELL)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              
              // Determine which cache to use
              const cacheName = request.url.includes('/api/') 
                ? CACHE_NAMES.DYNAMIC_CONTENT 
                : CACHE_NAMES.STATIC_ASSETS;
              
              caches.open(cacheName)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            
            return networkResponse;
          });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Message event - handle updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync placeholder (for future implementation)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-driving-logs') {
    console.log('[Service Worker] Background sync triggered');
    // Future: Implement data synchronization
  }
});