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
            return cache.addAll(urlsToCache); // Cache all specified files
        })
    );
});

// Handle fetch events to serve cached content or fetch from network
self.addEventListener('fetch', (event) => {
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
                throw new Error('Network response not okay'); // Handle failed fetch
            });
        })
    );
});
// Handle activation by cleaning up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName); // Delete old caches
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