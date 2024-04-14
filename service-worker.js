const CACHE_NAME = 'ttrpg-sound-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  // Add URLs for your audio assets
  '/sounds/background/explore.mp3',
  '/sounds/background/combat.mp3',
  '/sounds/background/victory.mp3',
  // ... more sound files
  '/sounds/ambiance/rain.mp3',
  // ... more ambiance files
  '/sounds/effects/spell.mp3',
  // ... more effects files
  // Also include other assets like images, icons etc.
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  // Remove old caches
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
