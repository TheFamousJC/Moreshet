import assert from 'node:assert/strict';
import { CONTENT_LANGUAGES, incompleteTranslationFields, setSiteTranslation, siteTranslation, translationChangesForReview, translationHasContent } from '../src/lib/siteTranslations.js';
import type { HeritageSite } from '../src/types.js';
import { normalizePronunciations, pronunciationSuggestion } from '../src/lib/pronunciation.js';

const site: HeritageSite = {
  id: 'stop-1', name: 'English title', hebrewName: '', category: 'synagogue',
  lat: 31.9, lng: 35, address: '', shortDescription: 'English short',
  fullDescription: 'English narrative', audioDuration: 60, transcript: 'English transcript',
  historicalPeriod: '', imageUrl: '', tags: [], keyFacts: [],
};

assert.deepEqual(CONTENT_LANGUAGES, ['en', 'he', 'ru', 'fr', 'de', 'es']);
assert.equal(siteTranslation(site, 'en').transcript, 'English transcript');
assert.equal(siteTranslation(site, 'he').transcript, '');
assert.equal(translationHasContent(siteTranslation(site, 'he')), false, 'An entirely empty untranslated language must validate safely as empty.');

const withHebrew = setSiteTranslation(site, 'he', {
  title: 'כותרת', shortDescription: 'תיאור קצר', fullDescription: 'תיאור היסטורי', transcript: 'תמליל בעברית',
});
assert.equal(siteTranslation(withHebrew, 'he').transcript, 'תמליל בעברית');
assert.equal(siteTranslation(withHebrew, 'en').transcript, 'English transcript', 'Adding Hebrew must not alter English.');
assert.equal(translationHasContent(siteTranslation(withHebrew, 'he')), true);
assert.deepEqual(incompleteTranslationFields(siteTranslation(withHebrew, 'he')), []);

const incompleteFrench = setSiteTranslation(site, 'fr', { transcript: 'Texte français' });
assert.deepEqual(incompleteTranslationFields(siteTranslation(incompleteFrench, 'fr')), ['title', 'short description', 'historical narrative']);
const frenchReviewChanges = translationChangesForReview({ translations: incompleteFrench.translations }, site);
assert.equal(frenchReviewChanges.length, 1, 'A new French draft must create one readable language review group.');
assert.equal(frenchReviewChanges[0].language, 'fr');
assert.deepEqual(frenchReviewChanges[0].fields.map((field) => field.key), ['transcript']);
assert.equal(frenchReviewChanges[0].fields[0].proposed, 'Texte français');

const revisedEnglish = setSiteTranslation(site, 'en', { transcript: 'Revised English transcript' });
assert.equal(revisedEnglish.transcript, 'Revised English transcript');
assert.equal(siteTranslation(revisedEnglish, 'en').transcript, 'Revised English transcript');

const withPronunciation = setSiteTranslation(revisedEnglish, 'en', {
  pronunciations: normalizePronunciations([{ phrase: 'English', encoding: 'ipa', pronunciation: 'ˈɪŋɡlɪʃ', reviewerNote: 'Native review complete.' }], 'Revised English transcript'),
});
assert.equal(siteTranslation(withPronunciation, 'en').pronunciations[0].phrase, 'English');
assert.equal(siteTranslation(withPronunciation, 'he').pronunciations.length, 0, 'Pronunciation guidance must remain language-specific.');
assert.throws(() => normalizePronunciations([{ phrase: 'Absent phrase', encoding: 'spoken_hint', pronunciation: 'test', reviewerNote: '' }], 'Revised English transcript'), /not present/);
assert.equal(pronunciationSuggestion('en', 'Hasmonean')?.pronunciation, 'hæzməˈniːən', 'A verified glossary phrase should suggest its reviewed IPA automatically.');
assert.equal(pronunciationSuggestion('en', 'Bar Kokhba')?.pronunciation, 'bɑːr kɒxˈbɑː', 'A reviewed pilot phrase should suggest its stored IPA candidate.');
assert.equal(pronunciationSuggestion('en', "Modi'in")?.pronunciation, 'moʊdiˈiːn', 'A reviewed pilot place name should suggest its stored IPA candidate.');
assert.equal(pronunciationSuggestion('en', 'Unverified place name'), null, 'Unknown phrases must remain blank rather than receive invented phonetics.');
assert.equal(pronunciationSuggestion('he', 'Hasmonean'), null, 'A suggestion must never cross language boundaries.');

console.log('Six-language stop separation, binding and completeness checks passed.');
