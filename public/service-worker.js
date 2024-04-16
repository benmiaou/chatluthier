const CACHE_NAME = 'chat-luthier-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/client.js'
  // Add URLs for your audio assets

  // ... more sound files

  // ... more ambiance files

  // ... more effects files
  // Also include other assets like images, icons etc.
];

// Function to fetch all files in a directory recursively
async function fetchDirectoryFiles(directory) {
  const response = await fetch(`http://127.0.0.1:3000/list-sounds/${directory}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch directory: ${directory}`);
  }
  const data = await response.json();
  return data.map(file => `/${directory}/${file}`);
}

// Add URLs for all files in the assets directory
const assetsToCache = ['ambiance','background','exploration','images','soundboard' ]; // Add other directories if needed
Promise.all(assetsToCache.map(fetchDirectoryFiles))
  .then(results => {
    const files = results.flat();
    urlsToCache.push(...files);
    console.log('Files to cache:', urlsToCache);
  })
  .catch(error => console.error('Error fetching directory files:', error));

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
