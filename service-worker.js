const CACHE_NAME = 'lernhelfer-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './mvp.css',
  './mvp.js',
  './WebP-button.html',
  './WebP-button.css',
  './Mathe_Seite.html',
  './Mathe-Sete.css',
  './Mathe.js',
  './task_IT.json',
  './task_math.json',
  './favicon.ico',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request)
      .then(cached => cached || fetch(evt.request))
  );
});
