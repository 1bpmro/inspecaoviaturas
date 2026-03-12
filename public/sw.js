const CACHE_NAME = 'inspecao-vtr-v1';

// Recursos críticos para o app abrir sem internet
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// Instalação: Salva o "esqueleto" do app
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

// Intercepta requisições
self.addEventListener('fetch', event => {
  // Ignora requisições para Cloudinary e Google Script (sempre rede)
  if (event.request.url.includes('cloudinary') || event.request.url.includes('script.google')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Retorna cache se houver, mas tenta atualizar em background
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
