// Minimal Service Worker to enable "Add to Home Screen"
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('dj-copilot-store').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/index.tsx',
      '/icon.svg',
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});