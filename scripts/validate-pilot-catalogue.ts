import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

type Stop = { title: string; interest: string };
type ImageRightsStatus = 'cc0' | 'public_domain' | 'cc_by' | 'cc_by_sa' | 'permission_required';
type Tour = {
  slug: string;
  city: string;
  country: string;
  title: string;
  researchStatus: string;
  primarySources: string[];
  stops: Stop[];
  publicationBlocker?: string;
  detailFile?: string;
};

const file = path.resolve('content/pilot-catalogue/tour-batch-01.json');
const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as {
  schemaVersion: number;
  status: string;
  language: string;
  publicationPolicy: string;
  mediaPolicy: string;
  tours: Tour[];
};

assert.equal(payload.schemaVersion, 1);
assert.equal(payload.language, 'en');
assert.equal(payload.publicationPolicy, 'cms_review_required');
assert.equal(payload.mediaPolicy, 'approved_reusable_license_or_permission_gate_before_publication');
assert.equal(payload.tours.length, 11, 'The expanded pilot batch must contain exactly eleven tours.');

const slugs = new Set<string>();
const supportedCategories = new Set(['synagogue', 'historic_sites', 'museum', 'memorial', 'cemetery']);
for (const tour of payload.tours) {
  assert.ok(tour.slug && !slugs.has(tour.slug), `Tour slug must be unique: ${tour.slug}`);
  slugs.add(tour.slug);
  assert.ok(tour.city && tour.country && tour.title);
  assert.ok(tour.primarySources.length > 0, `${tour.city} needs at least one research source.`);
  assert.ok(tour.stops.length <= 5, `${tour.city} exceeds the five-stop pilot limit.`);
  assert.ok(tour.stops.length === 5 || tour.researchStatus.startsWith('needs_'), `${tour.city} must have five stops or an explicit research blocker.`);
  for (const stop of tour.stops) {
    assert.ok(stop.title.trim().length > 0);
    assert.ok(/jew|synagogue|congregation|shoah|holocaust|pogrom|refuge|sephard|ashken|yiddish|romaniote|temple|israel|prayer|cemetery|community|immigrant|nazi/i.test(stop.interest), `${tour.city} / ${stop.title} lacks an explicit Jewish-interest statement.`);
  }
  if (tour.researchStatus.startsWith('blocked_')) assert.ok(tour.publicationBlocker);
  if (tour.researchStatus === 'research_complete_cms_draft_pending') {
    assert.ok(tour.detailFile, `${tour.city} needs a detailed draft file.`);
    const detail = JSON.parse(fs.readFileSync(path.resolve(tour.detailFile), 'utf8')) as {
      tourSlug: string;
      status: string;
      language: string;
      publicationReadiness?: string;
      publicationBlockers?: string[];
      stops: Array<{
        position: number;
        slug: string;
        title: string;
        category: string;
        address: string;
        lat: number;
        lng: number;
        shortDescription: string;
        fullDescription: string;
        transcript: string;
        sources: string[];
        image: {
          fileName: string;
          imageUrl: string;
          sourceUrl: string;
          creator: string;
          rightsStatus: ImageRightsStatus;
          licenseName: string;
          licenseUrl: string;
          attributionText: string;
        };
      }>;
    };
    assert.equal(detail.tourSlug, tour.slug, `${tour.city} detail slug must match its manifest slug.`);
    assert.equal(detail.status, 'research_complete_cms_draft_pending');
    assert.equal(detail.language, payload.language);
    assert.equal(detail.stops.length, 5);
    assert.deepEqual(detail.stops.map(stop => stop.position), [1, 2, 3, 4, 5]);
    assert.deepEqual(detail.stops.map(stop => stop.title), tour.stops.map(stop => stop.title), `${tour.city} manifest and detailed route must use the same stop names and order.`);
    const stopSlugs = new Set<string>();
    let requiresMediaPermission = false;
    for (const stop of detail.stops) {
      assert.ok(stop.slug && !stopSlugs.has(stop.slug), `${tour.city} stop slugs must be unique.`);
      stopSlugs.add(stop.slug);
      assert.ok(stop.title.trim().length > 0);
      assert.ok(supportedCategories.has(stop.category), `${tour.city} / ${stop.title} uses unsupported category ${stop.category}.`);
      assert.ok(stop.address.trim().length > 0);
      assert.ok(Number.isFinite(stop.lat) && stop.lat >= -90 && stop.lat <= 90);
      assert.ok(Number.isFinite(stop.lng) && stop.lng >= -180 && stop.lng <= 180);
      assert.ok(stop.shortDescription.length >= 50, `Short description is too short at ${tour.city} / ${stop.title}.`);
      assert.ok(stop.fullDescription.length >= 150, `Full description is too short at ${tour.city} / ${stop.title}.`);
      assert.ok(stop.transcript.length >= 500, `Detailed narration is too short at position ${stop.position}.`);
      assert.ok(stop.sources.length >= 1);
      assert.ok(stop.image.fileName && stop.image.imageUrl && stop.image.sourceUrl && stop.image.creator);
      assert.ok(stop.image.licenseName && stop.image.licenseUrl && stop.image.attributionText);
      assert.ok(['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'permission_required'].includes(stop.image.rightsStatus));
      if (stop.image.rightsStatus === 'permission_required') requiresMediaPermission = true;
    }
    if (requiresMediaPermission) {
      assert.equal(detail.publicationReadiness, 'editorial_complete_media_clearance_pending', `${tour.city} must expose its media-clearance publication gate.`);
      assert.ok(detail.publicationBlockers?.length, `${tour.city} needs an explicit media-clearance blocker.`);
    }
  }
}

console.log('Pilot catalogue scope validated: 11 Jewish-interest tours, five-stop limits, sources and review gates.');
