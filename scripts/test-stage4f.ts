import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectImageMime, loadRuntimeConfig, MAX_MEDIA_BYTES, productionConfigurationIssues } from '../server/production.js';

assert.equal(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
assert.equal(detectImageMime(Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), 'image/png');
assert.equal(detectImageMime(Uint8Array.from([...Buffer.from('RIFF'),0,0,0,0,...Buffer.from('WEBP')])), 'image/webp');
assert.equal(detectImageMime(Uint8Array.from(Buffer.from('GIF89a'))), 'image/gif');
assert.equal(detectImageMime(Uint8Array.from(Buffer.from('<script>alert(1)</script>'))), null);
assert.equal(MAX_MEDIA_BYTES, 8 * 1024 * 1024);

const valid = {
  NODE_ENV: 'production', APP_URL: 'https://tudelaglobal.com',
  SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key-long-enough', SUPABASE_SECRET_KEY: 'secret-key-different-and-long',
  HERZL_MODE: 'simulator',
};
assert.deepEqual(productionConfigurationIssues(valid), []);
assert.ok(productionConfigurationIssues({ ...valid, APP_URL: 'http://localhost:3000' }).some((issue) => issue.includes('APP_URL')));
assert.ok(productionConfigurationIssues({ ...valid, SUPABASE_SECRET_KEY: valid.VITE_SUPABASE_PUBLISHABLE_KEY }).some((issue) => issue.includes('must not equal')));
assert.ok(productionConfigurationIssues({ ...valid, HERZL_MODE: 'live', HERZL_PROVIDER: 'openai' }).some((issue) => issue.includes('OPENAI_API_KEY')));
assert.ok(productionConfigurationIssues({ ...valid, HERZL_MODE: 'live', HERZL_PROVIDER: 'gemini' }).some((issue) => issue.includes('GEMINI_API_KEY')));
assert.ok(productionConfigurationIssues({ ...valid, HERZL_PROVIDER: 'unknown' }).some((issue) => issue.includes('HERZL_PROVIDER')));
const safeFallback = loadRuntimeConfig({ ...valid, HERZL_MODE: 'live', HERZL_PROVIDER: 'openai' });
assert.equal(safeFallback.herzlLiveRequested, true);
assert.equal(safeFallback.herzlMode, 'simulator');
assert.equal(safeFallback.configurationWarnings.length, 1);
const configuredLive = loadRuntimeConfig({ ...valid, HERZL_MODE: 'live', HERZL_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' });
assert.equal(configuredLive.herzlMode, 'live');
assert.deepEqual(configuredLive.configurationWarnings, []);

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as { display: string; start_url: string; icons: unknown[] };
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.ok(manifest.icons.length > 0);
const serviceWorker = readFileSync('public/sw.js', 'utf8');
assert.ok(serviceWorker.includes("url.pathname.startsWith('/api/')"));
assert.ok(serviceWorker.includes("url.pathname === '/cms'"));

console.log('Stage 4F production configuration, image-signature and PWA policy tests PASS.');
