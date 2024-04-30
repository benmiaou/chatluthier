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

// Handle fetch events to serve cached content or fetch from network
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('https://accounts.google.com/gsi/client')) {
        // Use a network-first strategy for Google Identity Services
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request);
            })
        );
    } else {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response; // Return cached content if available
            }
            // Fetch from network and cache it
            return fetch(event.request).then((fetchedResponse) => {
                if (fetchedResponse.ok) {
                    const responseClone = fetchedResponse.clone(); // Clone before using
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone); // Cache the cloned response
                    });

                    return fetchedResponse; // Return the fetched response to the client
                }
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