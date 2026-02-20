/**
 * Service Worker for Kayel App
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'kayel-v1.0.1';
const RUNTIME_CACHE = 'kayel-runtime';

// Get the base path for GitHub Pages
const getBasePath = () => {
    const path = self.location.pathname;
    const parts = path.split('/').filter(p => p);
    // If deployed to username.github.io/repo-name, return '/repo-name/'
    // If deployed to custom domain, return '/'
    return parts.length > 0 && !path.endsWith('.js') ? `/${parts[0]}/` : '/';
};

const BASE_PATH = getBasePath();

// Files to cache immediately on install
const STATIC_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}choix.html`,
    `${BASE_PATH}ajout.html`,
    `${BASE_PATH}creer_groupe.html`,
    `${BASE_PATH}marq_absence.html`,
    `${BASE_PATH}sup-elv.html`,
    `${BASE_PATH}sup-grp.html`,
    `${BASE_PATH}style.css`,
    `${BASE_PATH}js/db.js`,
    `${BASE_PATH}js/app.js`,
    `${BASE_PATH}farachat.jpeg`,
    `${BASE_PATH}manifest.json`
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...');
    console.log('🔍 Base path:', BASE_PATH);
    console.log('📄 Caching:', STATIC_ASSETS);
    
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
                console.error('Failed assets:', STATIC_ASSETS);
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
    
    // Skip external requests
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('✅ Cache hit:', event.request.url);
                    return cachedResponse;
                }
                
                console.log('🌐 Network request:', event.request.url);
                
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
                        
                        // If offline and requesting HTML, show index page
                        if (event.request.headers.get('accept') && 
                            event.request.headers.get('accept').includes('text/html')) {
                            return caches.match(`${BASE_PATH}index.html`);
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
            Promise.resolve()
        );
    }
});

console.log('✅ Service Worker loaded');
console.log('📍 Origin:', self.location.origin);
console.log('📂 Base path:', BASE_PATH);
