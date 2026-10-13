import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { PublicContentPayload } from '../src/lib/publicContent.js';

const startedAt = performance.now();
const cities = Array.from({ length: 50 }, (_, cityIndex) => ({
  id: `city-${cityIndex + 1}`, name: `City ${String(cityIndex + 1).padStart(2, '0')}`,
  country: 'Test Country', flagEmoji: '🏳️', subtitle: 'Pilot tour', description: 'Capacity fixture',
  centerLat: 31 + cityIndex / 100, centerLng: 34 + cityIndex / 100, status: 'published' as const,
}));
const tours = cities.map((city, cityIndex) => ({
  id: `tour-${cityIndex + 1}`, cityId: city.id, title: `${city.name} Heritage Tour`,
  subtitle: 'Five-stop pilot', overview: 'Capacity fixture', accessMode: 'free' as const, status: 'published' as const,
}));
const sites = tours.flatMap((tour, cityIndex) => Array.from({ length: 5 }, (_, stopIndex) => ({
  id: `${tour.id}-stop-${stopIndex + 1}`, name: `Stop ${stopIndex + 1}`, hebrewName: '', category: 'historic_sites' as const,
  cityId: tour.cityId, cityName: cities[cityIndex].name, lat: 31 + cityIndex / 100 + stopIndex / 1000,
  lng: 34 + cityIndex / 100 + stopIndex / 1000, address: 'Verified test address',
  shortDescription: 'Short description', fullDescription: 'Narrative', audioDuration: 120,
  transcript: 'Audio transcript', historicalPeriod: 'Test period', imageUrl: '', tags: ['historic_sites'],
  keyFacts: [], tourId: tour.id, tourOrder: stopIndex + 1, status: 'published' as const,
})));

const payload: PublicContentPayload = {
  schemaVersion: 1, language: 'en', generatedAt: new Date().toISOString(), cities, tours, sites,
};
assert.equal(payload.cities.length, 50);
assert.equal(payload.tours.length, 50);
assert.equal(payload.sites.length, 250);
for (const tour of payload.tours) {
  const tourStops = payload.sites.filter((site) => site.tourId === tour.id);
  assert.equal(tourStops.length, 5);
  assert.deepEqual(tourStops.map((site) => site.tourOrder), [1, 2, 3, 4, 5]);
}
const serializedBytes = Buffer.byteLength(JSON.stringify(payload));
assert.ok(serializedBytes < 2_000_000, `Pilot catalogue payload is unexpectedly large: ${serializedBytes} bytes`);
console.log(`Public catalogue capacity PASS: 50 tours, 250 stops, ${serializedBytes} bytes, ${(performance.now() - startedAt).toFixed(1)} ms`);
