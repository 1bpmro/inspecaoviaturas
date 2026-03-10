const CACHE_NAME = 'inspecao-viaturas-1bpm';

// Ajuste os caminhos para incluir o nome do repositório
const urlsToCache = [
  '/inspecaoviaturas/',
  '/inspecaoviaturas/index.html',
  '/inspecaoviaturas/manifest.json',
  '/inspecaoviaturas/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Usamos cache.addAll apenas para o que for ESSENCIAL
      // Se um arquivo falhar, ele não trava o resto
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.warn('Falha ao cachear:', url));
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
