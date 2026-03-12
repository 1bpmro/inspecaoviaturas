const CACHE_NAME = 'inspecao-vtr-v1';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.log('Aviso: Offline skip para', url));
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // --- CORREÇÃO TÁTICA ---
  // Se não for GET (ex: Login, Gravar Vistoria), não tenta fazer cache.
  // Isso impede o erro de 'Request method POST is unsupported'
  if (event.request.method !== 'GET') {
    return; 
  }

  // Ignora requisições para Cloudinary e Google Script
  if (event.request.url.includes('cloudinary') || event.request.url.includes('script.google')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => null);

      return response || fetchPromise;
    })
  );
});
