import assert from 'node:assert/strict';
import { distanceInMeters, parseNearbyPlaceRequest, searchGoogleNearbyJewishPlaces } from '../server/nearbyPlaces.js';

assert.deepEqual(parseNearbyPlaceRequest({ lat: 31.9, lng: 35.0, radiusMeters: 50_000, language: 'fr' }), {
  lat: 31.9, lng: 35, radiusMeters: 25_000, language: 'fr',
  interests: [],
});
assert.deepEqual(parseNearbyPlaceRequest({ lat: 31.9, lng: 35, interests: ['cemetery', 'invalid', 'cemetery'] }).interests, ['cemetery']);
assert.deepEqual(
  parseNearbyPlaceRequest({ lat: 31.9, lng: 35, interests: ['museum', 'kosher_food', 'community', 'education', 'archaeology', 'archives', 'culture'] }).interests,
  ['museum', 'kosher_food', 'community', 'education', 'archaeology', 'archives', 'culture'],
);
assert.throws(() => parseNearbyPlaceRequest({ lat: 100, lng: 35 }), /valid current location/i);
assert.ok(distanceInMeters(31.9, 35, 31.901, 35) > 100);

const originalFetch = globalThis.fetch;
let capturedRequest: { url: string; options?: RequestInit } | null = null;
globalThis.fetch = (async (input: string | URL | Request, options?: RequestInit) => {
  capturedRequest = { url: String(input), options };
  return new Response(JSON.stringify({
    places: [
      { id: 'nearby-1', displayName: { text: 'Historic Synagogue' }, formattedAddress: '1 Heritage Street', location: { latitude: 31.901, longitude: 35 }, primaryType: 'synagogue', googleMapsUri: 'https://maps.google.com/example', websiteUri: 'javascript:alert(1)', regularOpeningHours: { openNow: true } },
      { id: 'outside-radius', displayName: { text: 'Far Away Museum' }, formattedAddress: 'Far away', location: { latitude: 33, longitude: 35 }, primaryType: 'museum' },
      { id: '', displayName: { text: 'Malformed result' }, location: { latitude: 31.9, longitude: 35 } },
    ],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;

try {
  const places = await searchGoogleNearbyJewishPlaces({ lat: 31.9, lng: 35, radiusMeters: 10_000, language: 'en', interests: ['cemetery'] }, 'server-only-key');
  assert.equal(places.length, 1);
  assert.deepEqual({ id: places[0].id, source: places[0].source, verification: places[0].verificationStatus, openNow: places[0].openNow }, { id: 'nearby-1', source: 'google', verification: 'unverified', openNow: true });
  assert.equal(places[0].websiteUrl, undefined, 'Unsafe provider URLs must not reach visitor links.');
  assert.equal(capturedRequest?.url, 'https://places.googleapis.com/v1/places:searchText');
  assert.equal((capturedRequest?.options?.headers as Record<string, string>)['X-Goog-Api-Key'], 'server-only-key');
  assert.doesNotMatch((capturedRequest?.options?.headers as Record<string, string>)['X-Goog-FieldMask'], /photo/i);
  const requestBody = JSON.parse(String(capturedRequest?.options?.body));
  assert.match(requestBody.textQuery, /Jewish cemeteries/);
  assert.equal(requestBody.locationBias.circle.radius, 10_000);

  await searchGoogleNearbyJewishPlaces({ lat: 31.9, lng: 35, radiusMeters: 10_000, language: 'en', interests: [] }, 'server-only-key');
  const broadRequestBody = JSON.parse(String(capturedRequest?.options?.body));
  assert.match(broadRequestBody.textQuery, /Jewish museums/);
  assert.match(broadRequestBody.textQuery, /kosher restaurants/);
  assert.match(broadRequestBody.textQuery, /Chabad houses/);
  assert.match(broadRequestBody.textQuery, /archaeological sites/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Nearby places validation, privacy boundary, distance filter and Google request checks passed.');
