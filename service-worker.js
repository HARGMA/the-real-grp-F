/**
 * Service Worker for Kayel App
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'kayel-v1.0.0';
const RUNTIME_CACHE = 'kayel-runtime';

// Files to cache immediately on install
const STATIC_ASSETS = [
    '',
    'index.html',
    'choix.html',
    'ajout.html',
    'creer_groupe.html',
    'marq_absence.html',
    'absent.html',
    'sup-elv.html',
    'sup-grp.html',
    'style.css',
    'js/db.js',
    'js/app.js',
    'farachat.jpeg',
    'manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('🔧 Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Found in cache
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Don't cache if not a success response
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Clone the response (can only be consumed once)
                        const responseToCache = networkResponse.clone();
                        
                        // Cache for runtime
                        caches.open(RUNTIME_CACHE)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('❌ Fetch failed:', error);
                        
                        // If offline and requesting HTML, show offline page
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

// Message event - handle commands from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

// Background sync (when online again)
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'sync-data') {
        event.waitUntil(
            // Add sync logic here if needed
            Promise.resolve()
        );
    }
});

console.log('✅ Service Worker loaded');
