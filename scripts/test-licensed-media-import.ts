import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('scripts/build-pilot-cms-import.ts'), '--media-only'], { stdio: 'pipe' });

const outputFile = path.resolve('.tmp/pilot-media-import.json');
const payload = JSON.parse(fs.readFileSync(outputFile, 'utf8')) as {
  cities: unknown[];
  sites: unknown[];
  licensedMedia: Array<{
    stopRef: string;
    cityName: string;
    stopName: string;
    imageUrl: string;
    originalFilename: string;
    rights: {
      rightsStatus: string;
      creatorName: string;
      sourceUrl: string;
      licenseName: string;
      licenseUrl: string;
      attributionText: string;
    };
  }>;
};

assert.deepEqual(payload.cities, [], 'Media-only import must not create duplicate cities.');
assert.deepEqual(payload.sites, [], 'Media-only import must not create duplicate stops.');
assert.equal(payload.licensedMedia.length, 45, 'Nine cleared five-stop tours must produce 45 media records.');

const stopRefs = new Set<string>();
for (const media of payload.licensedMedia) {
  assert.ok(media.stopRef && !stopRefs.has(media.stopRef), `Stop media reference must be unique: ${media.stopRef}`);
  stopRefs.add(media.stopRef);
  assert.ok(media.cityName && media.stopName && media.originalFilename);
  const imageUrl = new URL(media.imageUrl);
  const sourceUrl = new URL(media.rights.sourceUrl);
  assert.equal(imageUrl.protocol, 'https:');
  assert.equal(imageUrl.hostname, 'commons.wikimedia.org');
  assert.ok(imageUrl.pathname.toLowerCase().startsWith('/wiki/special:redirect/file/'));
  assert.equal(sourceUrl.protocol, 'https:');
  assert.equal(sourceUrl.hostname, 'commons.wikimedia.org');
  assert.ok(sourceUrl.pathname.toLowerCase().startsWith('/wiki/file:'));
  assert.ok(['public_domain', 'cc_by', 'cc_by_sa'].includes(media.rights.rightsStatus));
  assert.notEqual(media.rights.rightsStatus, 'permission_required');
  assert.ok(media.rights.creatorName && media.rights.licenseName && media.rights.licenseUrl && media.rights.attributionText);
}

console.log('Licensed media import validated: 45 unique Commons photographs, rights records, and no duplicate content rows.');
