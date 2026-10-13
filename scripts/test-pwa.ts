import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const readText = (relativePath: string) => readFile(path.join(root, relativePath), 'utf8');

const pngDimensions = async (relativePath: string) => {
  const data = await readFile(path.join(root, relativePath));
  assert.equal(data.subarray(1, 4).toString('ascii'), 'PNG', `${relativePath} must be a PNG file`);
  assert.equal(data.subarray(12, 16).toString('ascii'), 'IHDR', `${relativePath} must contain a PNG IHDR header`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
};

const manifest = JSON.parse(await readText('public/manifest.webmanifest')) as {
  name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
};

assert.equal(manifest.name, 'Tudela Global Jewish Heritage Tours');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone');

const icons = manifest.icons ?? [];
const hasIcon = (src: string, sizes: string, purpose: string) => icons.some((icon) => (
  icon.src === src && icon.sizes === sizes && icon.type === 'image/png' && icon.purpose === purpose
));

assert.ok(hasIcon('/tudela-global-logo.png', '512x512', 'any'), 'Manifest must use the regular Tudela Global logo');
assert.ok(hasIcon('/tudela-global-logo.png', '512x512', 'maskable'), 'Manifest must use the regular Tudela Global logo for maskable installation');

assert.deepEqual(await pngDimensions('public/tudela-global-logo.png'), { width: 512, height: 512 });

const indexHtml = await readText('index.html');
assert.match(indexHtml, /rel="manifest" href="\/manifest\.webmanifest"/);
assert.match(indexHtml, /rel="icon" href="\/tudela-global-logo\.png"/);
assert.match(indexHtml, /rel="apple-touch-icon" href="\/tudela-global-logo\.png"/);

const serviceWorker = await readText('public/sw.js');
assert.match(serviceWorker, /CACHE_NAME = 'tudela-global-v4'/);
assert.match(serviceWorker, /PUBLIC_MEDIA_CACHE = 'tudela-global-public-media-v1'/);
assert.ok(serviceWorker.includes('/tudela-global-logo.png'), 'Service-worker shell must cache the regular Tudela Global logo');
assert.ok(serviceWorker.includes("url.pathname.startsWith('/api/')"), 'Service worker must exclude API responses from caching');
assert.ok(serviceWorker.includes("url.pathname.startsWith('/api/public/media/')"), 'Service worker must cache only the stable public-media API route');
assert.ok(serviceWorker.includes("url.pathname === '/cms'"), 'Service worker must exclude the CMS from caching');

const app = await readText('src/App.tsx');
const splash = await readText('src/components/VisitorSplashScreen.tsx');
assert.match(app, /showVisitorSplash[\s\S]*2200[\s\S]*<VisitorSplashScreen/, 'Visitor entry must display and dismiss the branded splash screen.');
assert.match(splash, /tudela-global-logo\.png[\s\S]*Tudela Global/, 'Splash screen must display the regular Tudela Global logo.');

console.log('PWA manifest, raster icons, Apple touch icon and cache exclusions verified.');
