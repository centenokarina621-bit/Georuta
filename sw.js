const CACHE_NAME = 'georuta-granada-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './LOGO.png',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap'
];

// Instalar el Service Worker y almacenar en caché los activos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Almacenando en caché los activos de la aplicación');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones y servir desde la caché o red
self.addEventListener('fetch', (event) => {
  // Evitar interceptar peticiones de otros esquemas que no sean HTTP/HTTPS (por ejemplo, chrome-extension:// o file://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, realizar la petición a la red
      return fetch(event.request).then((response) => {
        // Verificar si la respuesta es válida antes de cachearla
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clonar la respuesta para almacenarla en caché y retornarla
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Solo cachear peticiones locales y de CDN conocidas
          if (event.request.url.includes('unpkg.com') || event.request.url.includes(self.location.origin)) {
            cache.put(event.request, responseToCache);
          }
        });

        return response;
      }).catch(() => {
        // Si falla la red (offline) e intentamos acceder a index.html, retornar lo que esté en caché
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
