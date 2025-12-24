
const CACHE_NAME = 'flixmax-cache-v3-pwabuilder';

// Assets that constitute the "App Shell"
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Cache External Critical Libs to ensure UI loads offline
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 1. IGNORE Non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 2. IGNORE Streaming Data & API Calls (Do not cache these)
  if (url.pathname.includes('player_api.php') || 
      url.pathname.endsWith('.m3u8') || 
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.mp4') ||
      url.pathname.endsWith('.mkv') ||
      url.href.includes('corsproxy.io') || 
      url.href.includes('allorigins.win') ||
      url.href.includes('firestore') ||
      url.href.includes('googleapis.com/v1')) { // Ignore Firestore API
    return;
  }

  // 3. Navigation Strategy (HTML) - Network First, fall back to Cache
  if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request)
          .catch(() => {
              return caches.match('./index.html');
          })
      );
      return;
  }

  // 4. Stale-While-Revalidate for Assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
            }
            
            // Cache valid responses (even opaque ones from CDNs)
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
            return networkResponse;
        }).catch(err => {
            // Network failed, nothing to do here, hope for cache
        });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
  );
});
