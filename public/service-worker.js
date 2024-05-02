// service-worker.js - Service Worker script
const CACHE_NAME = 'site-cache-v1'; // Unique cache name with version
const urlsToCache = [
    '/', // Root
    '/index.html', // Main HTML
    '/styles.css', // CSS file
    '/ambianceSounds.js', // JavaScript files
    '/backgroundMusic.js',
    '/credits.js',
    '/googleLogin.js',
    '/localDirectory.js',
    '/modalCredits.js',
    '/modalWindow.js',
    '/offline.html', // Fallback page
    '/site.webmanifest', // Web app manifest
    '/soundBar.js',
    '/soundboard.js',
];



// Install the Service Worker and cache the specified files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // Force the waiting service worker to become active
});

self.addEventListener('fetch', (event) => {
    // Use a network-first strategy for Google Identity Services
    if (event.request.url.includes('https://accounts.google.com/gsi/client')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
    } else {
        // Skip caching for MP3 files
        if (event.request.url.endsWith('.mp3')) {
            console.log('Skipping cache for MP3 file:', event.request.url);
            event.respondWith(fetch(event.request));
            return;
        }

        // Handle range requests specifically for audio or video streaming
        if (event.request.headers.has('range')) {
            console.log('Handling range request for:', event.request.url);
            event.respondWith(fetch(event.request));
            return;
        }

        // Use a cache-first strategy for other requests
        event.respondWith(
            caches.match(event.request)
            .then(response => {
                return response || fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    // Cache the response if it's not an MP3 file
                    let responseToCache = response.clone();
                    caches.open('CACHE_NAME')
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
            })
        );
    }
});
// Handle activation by cleaning up old caches
self.addEventListener('activate', (event) => {
    const currentCaches = [CACHE_NAME]; // List of current cache names
    event.waitUntil(
        clients.claim(), // Claims all clients immediately
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!currentCaches.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
    );
});