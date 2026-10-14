const BASE = new URL('.', self.location.href).pathname;
const PREFIX = 'moreshet-' + encodeURIComponent(BASE) + '-';
const CACHE_NAME = PREFIX + 'frontend-v2';
const PUBLIC_MEDIA_CACHE = PREFIX + 'public-media-v1';
const APP_SHELL = ['','manifest.webmanifest','moreshet-icon.png','ask-benjamin-sage.png'].map(file => BASE + file);
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE_NAME&&key!==PUBLIC_MEDIA_CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch', event => {
 const request=event.request;const url=new URL(request.url);
 if(request.method==='GET'&&url.origin===self.location.origin&&url.pathname.startsWith(BASE+'api/public/media/')){event.respondWith(caches.open(PUBLIC_MEDIA_CACHE).then(cache=>cache.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}))));return;}
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE)||url.pathname.includes('/api/')||url.pathname.includes('/cms'))return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match(BASE)));return;}
 event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}))));
});

