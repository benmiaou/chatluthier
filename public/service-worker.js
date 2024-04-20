const CACHE_NAME = 'chat-luthier-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/soundBar.js',
  '/localDirectory.js',
  '/audioManager.js',
  '/offline.html',  
  'site.webmanifest'
];
const assetsToCache = ['ambiance', 'background/battle', 'background/exploration', 'images/icons', 'images/favicons', 'soundboard'];

// Function to fetch all files in a directory recursively
async function fetchDirectoryFiles(directory) {
  const encodedDirectory = encodeURIComponent(directory);
  const response = await fetch(`http://127.0.0.1:3000/list-files/${encodedDirectory}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch directory: ${directory} with status: ${response.status}`);
  }
  const data = await response.json();
  return data.map(file => `/${directory}/${file}`);
}

self.addEventListener('install', event => {
    console.log('Service Worker installing.');

    // Function to fetch and cache a single file
    async function cacheFile(cache, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
            }
            await cache.put(url, response);
        } catch (error) {
            console.error(`Caching ${url} failed:`, error);
            throw error; // Re-throw to ensure we can catch it in the outer block
        }
    }

    // Function to fetch all files in a directory recursively and cache them
    async function cacheDirectoryFiles(cache, directory) {
        const encodedDirectory = encodeURIComponent(directory);
        try {
            const response = await fetch(`http://127.0.0.1:3000/list-files/${encodedDirectory}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch directory: ${directory} with status: ${response.status}`);
            }
            const files = await response.json();
            const urls = files.map(file => `../assets/${directory}/${file}`);
            for (const url of urls) {
                await cacheFile(cache, url); // Cache each file individually
            }
        } catch (error) {
            console.error(`Error caching directory ${directory}:`, error);
        }
    }

    // Wait for all assets to be cached
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            // Start by caching static assets individually
            for (const url of urlsToCache) {
                await cacheFile(cache, url);
            }
            // Then cache assets from directories
            for (const directory of assetsToCache) {
                await cacheDirectoryFiles(cache, directory);
            }
        })()
    );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/list-sounds/')) {
      event.respondWith(
          fetch(event.request)
          .then(response => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                  return response;
              }

              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                  .then(cache => {
                      cache.put(event.request, responseToCache);
                  });

              return response;
          })
          .catch(() => {
              return caches.match(event.request)
                  .then(response => {
                      return response || new Response(JSON.stringify([]), {
                          headers: { 'Content-Type': 'application/json' }
                      });
                  });
          })
      );
  } else {
      // handle other fetches as previously
      event.respondWith(
          caches.match(event.request)
          .then(cachedResponse => {
              return cachedResponse || fetch(event.request);
          })
      );
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];  // CACHE_NAME should be the name of the current cache version.
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Activate event: old caches are cleared.');
      // Ensure the updated service worker takes control of all clients.
      return self.clients.claim();
    })
  );
});