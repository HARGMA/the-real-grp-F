/**
 * Service Worker for Kayel App - Version 2
 * Fixed for GitHub Pages offline caching
 */

const CACHE_NAME = 'kayel-v1.0.2';
const RUNTIME_CACHE = 'kayel-runtime';

// Get the correct base path from service worker location
const getBasePath = () => {
    const swPath = self.location.pathname;
    const basePath = swPath.substring(0, swPath.lastIndexOf('/') + 1);
    console.log('🔍 SW path:', swPath);
    console.log('📂 Base path:', basePath);
    return basePath;
};

const BASE_PATH = getBasePath();

// Files to cache
const STATIC_ASSETS = [
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
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}test-offline.html`
];

// Install - cache files one by one with detailed logging
self.addEventListener('install', (event) => {
    console.log('📦 Installing Service Worker...');
    console.log('📄 Will cache', STATIC_ASSETS.length, 'files');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ Cache opened');
                // Cache files one by one
                return Promise.all(
                    STATIC_ASSETS.map(url => {
                        return cache.add(url)
                            .then(() => console.log('✅ Cached:', url))
                            .catch((err) => console.error('❌ Failed:', url, err.message));
                    })
                );
            })
            .then(() => {
                console.log('✅ All files cached');
                return self.skipWaiting();
            })
            .catch((err) => console.error('❌ Install error:', err))
    );
});

// Activate
self.addEventListener('activate', (event) => {
    console.log('🔧 Activating...');
    event.waitUntil(
        caches.keys()
            .then((names) => {
                return Promise.all(
                    names.map((name) => {
                        if (name !== CACHE_NAME && name !== RUNTIME_CACHE) {
                            console.log('🗑️ Delete old cache:', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Activated');
                return self.clients.claim();
            })
    );
});

// Fetch
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;
    if (url.origin !== self.location.origin) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cached) => {
                if (cached) {
                    console.log('✅ Cache:', url.pathname);
                    return cached;
                }
                
                console.log('📡 Network:', url.pathname);
                return fetch(event.request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            const copy = response.clone();
                            caches.open(RUNTIME_CACHE).then((cache) => {
                                cache.put(event.request, copy);
                            });
                        }
                        return response;
                    })
                    .catch((err) => {
                        console.error('❌ Fetch failed:', url.pathname);
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match(`${BASE_PATH}index.html`);
                        }
                        throw err;
                    });
            })
    );
});

console.log('✅ SW loaded. Base:', BASE_PATH, 'Cache:', CACHE_NAME);
