import type { ContentLanguage, PronunciationEntry } from '../types.js';

export const MAX_PRONUNCIATIONS_PER_LANGUAGE = 30;
export const GOOGLE_CUSTOM_PRONUNCIATION_LANGUAGES: ContentLanguage[] = ['en', 'ru', 'fr', 'de', 'es'];

export interface PronunciationSuggestion {
  pronunciation: string;
  reviewerNote: string;
}

const VERIFIED_IPA_SUGGESTIONS: Partial<Record<ContentLanguage, Record<string, PronunciationSuggestion>>> = {
  en: {
    hasmonean: {
      pronunciation: 'hæzməˈniːən',
      reviewerNote: 'Verified English dictionary suggestion; confirm during audio review.',
    },
    'bar kokhba': {
      pronunciation: 'bɑːr kɒxˈbɑː',
      reviewerNote: 'Pilot pronunciation candidate added after owner playback QA; confirm the complete phrase during audio review.',
    },
    "modi'in": {
      pronunciation: 'moʊdiˈiːn',
      reviewerNote: 'Pilot pronunciation candidate added after owner playback QA; confirm the complete place name during audio review.',
    },
  },
};

export function pronunciationSuggestion(language: ContentLanguage, phrase: string): PronunciationSuggestion | null {
  return VERIFIED_IPA_SUGGESTIONS[language]?.[phrase.trim().toLocaleLowerCase()] || null;
}

export function normalizePronunciations(value: unknown, transcript = ''): PronunciationEntry[] {
  if (!Array.isArray(value)) throw new Error('Pronunciation guidance must be a list.');
  if (value.length > MAX_PRONUNCIATIONS_PER_LANGUAGE) throw new Error(`Use no more than ${MAX_PRONUNCIATIONS_PER_LANGUAGE} pronunciation entries per language.`);
  const normalized = value.map((item) => {
    const entry = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const phrase = String(entry.phrase || '').trim();
    const encoding = String(entry.encoding || '') as PronunciationEntry['encoding'];
    const pronunciation = String(entry.pronunciation || '').trim();
    const reviewerNote = String(entry.reviewerNote || '').trim();
    if (phrase.length < 1 || phrase.length > 120) throw new Error('Each pronunciation phrase must contain 1 to 120 characters.');
    if (!['ipa', 'x_sampa', 'spoken_hint'].includes(encoding)) throw new Error('Choose IPA, X-SAMPA or a spoken reviewer hint.');
    if (pronunciation.length < 1 || pronunciation.length > 240) throw new Error('Each pronunciation value must contain 1 to 240 characters.');
    if (reviewerNote.length > 500) throw new Error('Pronunciation reviewer notes are limited to 500 characters.');
    if (transcript && !transcript.toLocaleLowerCase().includes(phrase.toLocaleLowerCase())) throw new Error(`The pronunciation phrase “${phrase}” is not present in this language transcript.`);
    return { phrase, encoding, pronunciation, reviewerNote };
  });
  const unique = new Set(normalized.map((entry) => entry.phrase.toLocaleLowerCase()));
  if (unique.size !== normalized.length) throw new Error('Each pronunciation phrase may appear only once per language.');
  return normalized;
}

export function googlePronunciations(language: ContentLanguage, entries: PronunciationEntry[]) {
  if (!GOOGLE_CUSTOM_PRONUNCIATION_LANGUAGES.includes(language)) return [];
  return entries.filter((entry) => entry.encoding !== 'spoken_hint').map((entry) => ({
    phrase: entry.phrase,
    phoneticEncoding: entry.encoding === 'ipa' ? 'PHONETIC_ENCODING_IPA' : 'PHONETIC_ENCODING_X_SAMPA',
    pronunciation: entry.pronunciation,
  }));
}
