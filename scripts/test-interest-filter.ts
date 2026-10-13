import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INTEREST_VALUES } from '../src/data/interests.js';
import { INTEREST_FILTER_TRANSLATIONS } from '../src/data/interestFilterTranslations.js';
import { matchesInterest, matchesSelectedInterests, parseStoredInterests } from '../src/lib/interestFilters.js';
import { CATEGORY_NAMES, LanguageCode } from '../src/data/translations.js';
import { HeritageSite } from '../src/types.js';

const site = (category: HeritageSite['category'], text = ''): HeritageSite => ({
  id: `${category}-${text}`,
  name: text,
  hebrewName: '',
  category,
  lat: 0,
  lng: 0,
  address: '',
  shortDescription: text,
  fullDescription: text,
  audioDuration: 0,
  transcript: text,
  historicalPeriod: '',
  imageUrl: '',
  tags: text ? [text] : [],
  keyFacts: [],
});

const synagogue = site('synagogue');
const historicBridge = site('bridge');
const ghettoMuseum = site('museum', 'Former wartime ghetto memorial');
const kosherRestaurant = site('juderia', 'A supervised kosher restaurant and bakery');
const communityCentre = site('juderia', 'Jewish community centre and Chabad house');

assert.equal(matchesSelectedInterests(synagogue, []), true, 'No interests must show all stops');
assert.equal(matchesSelectedInterests(synagogue, ['synagogue', 'cemetery']), true, 'Any selected interest should match');
assert.equal(matchesSelectedInterests(synagogue, ['cemetery', 'mikveh']), false, 'Unmatched selections should hide a stop');
assert.equal(matchesInterest(historicBridge, 'historic_sites'), true, 'Historic Sites must include historic bridges');
assert.equal(matchesInterest(ghettoMuseum, 'holocaust'), true, 'Holocaust keyword matching must be retained');
assert.equal(matchesInterest(ghettoMuseum, 'museum'), true, 'Jewish museums must be independently searchable');
assert.equal(matchesInterest(kosherRestaurant, 'kosher_food'), true, 'Kosher food must match tagged and descriptive places');
assert.equal(matchesInterest(communityCentre, 'community'), true, 'Community and Chabad places must be searchable');

assert.deepEqual(parseStoredInterests('["synagogue","cemetery","synagogue","invalid"]'), ['synagogue', 'cemetery']);
assert.deepEqual(parseStoredInterests('not-json'), []);
assert.deepEqual(parseStoredInterests(null), []);

const languages: LanguageCode[] = ['en', 'he', 'ru', 'fr', 'de', 'es'];
for (const language of languages) {
  const copy = INTEREST_FILTER_TRANSLATIONS[language];
  assert.ok(copy.label && copy.clearAll && copy.remove && copy.matchHint && copy.noResults, `${language} filter copy is incomplete`);
  for (const interest of INTEREST_VALUES) {
    assert.ok(CATEGORY_NAMES[language]?.[interest], `${language} is missing the CMS/Discovery label for ${interest}`);
  }
}

const componentSource = readFileSync(new URL('../src/components/HeritageSearch.tsx', import.meta.url), 'utf8');
assert.match(componentSource, /sessionStorage/);
assert.match(componentSource, /type="checkbox"/);
assert.match(componentSource, /clearAll/);
assert.match(componentSource, /aria-expanded/);
assert.match(componentSource, /matchesSelectedInterests/);

console.log('Discovery multi-select interest checks passed.');
