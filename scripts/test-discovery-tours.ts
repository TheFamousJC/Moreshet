import assert from 'node:assert/strict';
import { getTourSites, isSiteInTour } from '../src/lib/tourStops.js';
import { HeritageSite } from '../src/types.js';
import { LanguageCode, t } from '../src/data/translations.js';
import { demoPublicContent } from '../src/lib/publicContent.js';
import { cityMatchesDiscoverySearch, normalizeDiscoverySearch } from '../src/lib/discoverySearch.js';

const stop = (id: string, tourId: string, position: number, extraAssignments: HeritageSite['tourAssignments'] = []): HeritageSite => ({
  id,
  name: id,
  hebrewName: '',
  category: 'historic_site',
  cityId: 'test-city',
  cityName: 'Test City',
  lat: 0,
  lng: 0,
  address: '',
  shortDescription: '',
  fullDescription: '',
  audioDuration: 0,
  transcript: '',
  historicalPeriod: '',
  imageUrl: '',
  tags: [],
  keyFacts: [],
  tourId,
  tourOrder: position,
  tourAssignments: [{ tourId, position }, ...extraAssignments],
});

const sites = [
  stop('shared-stop', 'tour-a', 2, [{ tourId: 'tour-b', position: 1 }]),
  stop('tour-a-first', 'tour-a', 1),
  stop('tour-b-second', 'tour-b', 2),
];

assert.equal(isSiteInTour(sites[0], 'tour-a'), true);
assert.equal(isSiteInTour(sites[0], 'tour-b'), true);
assert.deepEqual(getTourSites(sites, 'tour-a').map((site) => site.id), ['tour-a-first', 'shared-stop']);
assert.deepEqual(getTourSites(sites, 'tour-b').map((site) => site.id), ['shared-stop', 'tour-b-second']);
assert.deepEqual(getTourSites(sites, 'missing-tour'), []);

const discoveryKeys = [
  'toursInCity', 'chooseTourPrompt', 'chooseTour', 'changeTour', 'tourStops',
  'minutes', 'kilometres', 'wheelchairAccessible', 'noToursAvailable',
];
const languages: LanguageCode[] = ['en', 'he', 'ru', 'fr', 'de', 'es'];
for (const language of languages) {
  for (const key of discoveryKeys) assert.notEqual(t(key, language), key, `${language} is missing ${key}`);
}

const demo = demoPublicContent('en');
const budapestTours = demo.tours.filter((tour) => tour.cityId === 'budapest');
assert.equal(budapestTours.length, 2);
assert.equal(demo.sites.filter((site) => site.cityId === 'budapest').every((site) => site.tourAssignments?.length === 2), true);

const searchCity = { ...demo.cities[0], name: 'Chișinău', country: 'Moldova', subtitle: 'Jewish memory route', description: 'Historic synagogues' };
assert.equal(cityMatchesDiscoverySearch(searchCity, 'Moldova'), true, 'A country name must find its city.');
assert.equal(cityMatchesDiscoverySearch(searchCity, 'chisinau'), true, 'Search must ignore accents and Romanian diacritics.');
assert.equal(cityMatchesDiscoverySearch(searchCity, 'memory'), true, 'Tour destination copy should remain searchable.');
assert.equal(cityMatchesDiscoverySearch(searchCity, 'Albania'), false);
assert.equal(cityMatchesDiscoverySearch({ ...searchCity, country: 'United States' }, 'USA'), true, 'Common country aliases must work.');
assert.equal(cityMatchesDiscoverySearch({ ...searchCity, country: 'United Kingdom' }, 'UK'), true, 'Common country abbreviations must work.');
assert.equal(normalizeDiscoverySearch('  Chișinău  '), 'chisinau');

console.log('Discovery multi-tour selection checks passed.');
