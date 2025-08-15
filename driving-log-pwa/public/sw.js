// Service Worker for Driving Log PWA
// This implements the core functionality for offline support

const CACHE_VERSION = '1.0.2';
const CACHE_NAMES = {
  SHELL: `driving-log-shell-v${CACHE_VERSION}`,
  RUNTIME: `driving-log-runtime-v${CACHE_VERSION}`,
  DATA: `driving-log-data-v${CACHE_VERSION}`,
};

// Files to precache (app shell)
const PRECACHE_FILES = [
  '/manifest.json',
  '/offline.html',
  '/test/pwa-test.html',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/apple-touch-icon.svg',
  '/icons/favicon.svg',
];

// Install event - precache app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.SHELL)
      .then((cache) => {
        console.log('Precaching app shell');
        return cache.addAll(PRECACHE_FILES);
      })
      .then(() => {
        // Force activate this service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Precache failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('driving-log-') && 
                !Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // HTML documents - Cache First with fallback
    event.respondWith(handleDocumentRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'image' || 
             request.destination === 'style' || 
             request.destination === 'script') {
    // Static assets - Cache First
    event.respondWith(handleAssetRequest(request));
  } else {
    // Other requests - Stale While Revalidate
    event.respondWith(handleOtherRequest(request));
  }
});

// Handle document requests (HTML pages)
async function handleDocumentRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.RUNTIME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, return offline page
    console.log('Serving offline page for:', request.url);
    return caches.match('/offline.html');
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.DATA);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request:', request.url);
    
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE, queue for background sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await queueRequestForSync(request);
      return new Response(JSON.stringify({ 
        queued: true, 
        message: 'Request queued for sync when online' 
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Network unavailable and no cached response' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static asset requests
async function handleAssetRequest(request) {
  // Cache first strategy
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.SHELL);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch asset:', request.url);
    throw error;
  }
}

// Handle other requests
async function handleOtherRequest(request) {
  // Stale while revalidate strategy
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(CACHE_NAMES.RUNTIME);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('Network failed for:', request.url);
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise || new Response('Service Unavailable', { status: 503 });
}

// Queue request for background sync
async function queueRequestForSync(request) {
  try {
    // Store request data for sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: {},
      body: null,
      timestamp: Date.now(),
    };

    // Copy headers
    for (const [key, value] of request.headers.entries()) {
      requestData.headers[key] = value;
    }

    // Copy body if present
    if (request.body) {
      requestData.body = await request.text();
    }

    // Store in IndexedDB (simplified with self message for now)
    self.postMessage({
      type: 'QUEUE_SYNC_REQUEST',
      data: requestData,
    });

    console.log('Queued request for sync:', requestData);
  } catch (error) {
    console.error('Failed to queue request for sync:', error);
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'driving-log-sync') {
    event.waitUntil(processSyncQueue());
  }
});

// Process queued sync requests
async function processSyncQueue() {
  try {
    console.log('Processing sync queue...');
    
    // This would typically read from IndexedDB
    // For now, just log that sync is happening
    console.log('Sync queue processed');
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('Sync queue processing failed:', error);
  }
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
    case 'CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Get cache status
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {
      version: CACHE_VERSION,
      caches: cacheNames.filter(name => name.startsWith('driving-log-')),
      timestamp: Date.now(),
    };
    
    return status;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return { error: error.message };
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync event:', event.tag);
  
  if (event.tag === 'driving-log-periodic-sync') {
    event.waitUntil(performPeriodicSync());
  }
});

// Perform periodic sync
async function performPeriodicSync() {
  try {
    console.log('Performing periodic sync...');
    
    // Check for updates
    const updateAvailable = await checkForUpdates();
    
    if (updateAvailable) {
      // Notify clients about available update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          timestamp: Date.now(),
        });
      });
    }
    
    console.log('Periodic sync completed');
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Check for application updates
async function checkForUpdates() {
  try {
    // Simple update check - compare cache version with server
    const response = await fetch('/api/version');
    if (response.ok) {
      const { version } = await response.json();
      return version !== CACHE_VERSION;
    }
  } catch (error) {
    console.log('Update check failed:', error);
  }
  
  return false;
}

console.log('Service Worker loaded, version:', CACHE_VERSION);