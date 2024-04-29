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
    '/service-worker.js', // Service Worker script
    '/site.webmanifest', // Web app manifest
    '/soundBar.js',
    '/soundboard.js',
];

// List of MP3 files to cache
const mp3Files = [
    '/sounds/sound1.mp3',
    '/sounds/sound2.mp3',
    '/sounds/sound3.mp3',
];


// Install the Service Worker and cache the specified files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache.concat(mp3Files));
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
    event.waitUntil(
        clients.claim(), // Takes control of all open clients immediately
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.action === 'cacheAllMp3') {
        event.waitUntil(
            fetch('/mp3-list').then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to fetch MP3 list');
                }
                return response.json();
            }).then((mp3Files) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    return Promise.all(
                        mp3Files.map((file) => {
                            return fetch(file).then((fetchedResponse) => {
                                if (fetchedResponse.ok) {
                                    cache.put(file, fetchedResponse.clone());
                                }
                                return fetchedResponse;
                            });
                        })
                    );
                });
            })
        );
    }
});