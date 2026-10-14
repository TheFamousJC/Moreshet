import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [server, serviceWorker, map, publicContent] = await Promise.all([
  readFile('server/publicContent.ts', 'utf8'),
  readFile('public/sw.js', 'utf8'),
  readFile('src/components/LiveWalkMap.tsx', 'utf8'),
  readFile('src/lib/publicContent.ts', 'utf8'),
]);

assert.match(server, /\/api\/public\/media\/\$\{encodeURIComponent\(mediaId\)\}/, 'Published images must use a stable same-origin URL.');
assert.match(server, /\.eq\('validation_status', 'approved'\)\.is\('deleted_at', null\)/, 'Only approved, active media may be served.');
assert.match(server, /\.eq\('hero_media_id', mediaId\)\.eq\('status', 'published'\)/, 'Media must belong to published content.');
assert.match(server, /admin\.storage\.from\(media\.storage_bucket\)\.download\(media\.object_path\)/, 'The server must read the verified private object.');

const publicMediaBranch = serviceWorker.indexOf("url.pathname.startsWith('/api/public/media/')");
const genericApiExclusion = serviceWorker.indexOf("url.pathname.startsWith('/api/')");
assert.ok(publicMediaBranch >= 0 && genericApiExclusion > publicMediaBranch, 'Public media must be handled before the generic API exclusion.');
assert.match(serviceWorker, /PUBLIC_MEDIA_CACHE = 'moreshet-public-media-v1'/);
assert.match(serviceWorker, /url\.pathname === '\/cms'/, 'CMS responses must remain excluded from offline storage.');

assert.match(publicContent, /localStorage\.setItem\(`\$\{CACHE_PREFIX\}/, 'Published text and stop details must remain locally cached.');
assert.match(map, /window\.addEventListener\('offline', handleOffline\)/);
assert.match(map, /tileLayerRef\.current\.remove\(\)/, 'Network tile layers must be removed offline.');
assert.match(map, /Offline route — saved stops and route remain available/);
assert.match(map, /offlineRouteLabel\[selectedLanguage\]/, 'The offline route status must be localized.');

console.log('Offline tour text, approved public-image caching, private API exclusion and route fallback verified.');
