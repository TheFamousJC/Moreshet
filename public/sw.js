const CACHE_NAME = 'tudela-global-v4';
const PUBLIC_MEDIA_CACHE = 'tudela-global-public-media-v1';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/tudela-global-logo.png',
  '/ask-benjamin-sage.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== PUBLIC_MEDIA_CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isPublicMedia = request.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith('/api/public/media/');
  if (isPublicMedia) {
    event.respondWith(caches.open(PUBLIC_MEDIA_CACHE).then((cache) => cache.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }))));
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/cms' || url.pathname.startsWith('/cms/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
