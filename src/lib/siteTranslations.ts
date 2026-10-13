import { ContentLanguage, HeritageSite, HeritageSiteTranslation } from '../types';

export const CONTENT_LANGUAGES: ContentLanguage[] = ['en', 'he', 'ru', 'fr', 'de', 'es'];

export const CONTENT_LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  en: 'English',
  he: 'Hebrew',
  ru: 'Russian',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
};

export type ReviewableTranslationField = 'title' | 'nativeName' | 'shortDescription' | 'fullDescription' | 'transcript';

export interface TranslationFieldChange {
  key: ReviewableTranslationField;
  label: string;
  previous: string;
  proposed: string;
}

export interface TranslationChange {
  language: ContentLanguage;
  fields: TranslationFieldChange[];
}

const REVIEWABLE_TRANSLATION_FIELDS: Array<{ key: ReviewableTranslationField; label: string }> = [
  { key: 'title', label: 'Localized stop title' },
  { key: 'nativeName', label: 'Native / alternate name' },
  { key: 'shortDescription', label: 'Short description' },
  { key: 'fullDescription', label: 'Historical narrative' },
  { key: 'transcript', label: 'Audio guide transcript' },
];

export const emptySiteTranslation = (): HeritageSiteTranslation => ({
  title: '',
  nativeName: '',
  shortDescription: '',
  fullDescription: '',
  transcript: '',
  pronunciations: [],
});

export function siteTranslation(site: HeritageSite, language: ContentLanguage): HeritageSiteTranslation {
  if (language === 'en') {
    return {
      title: site.name || '',
      nativeName: site.hebrewName || '',
      shortDescription: site.shortDescription || '',
      fullDescription: site.fullDescription || '',
      transcript: site.transcript || '',
      pronunciations: site.translations?.en?.pronunciations || [],
    };
  }
  return { ...emptySiteTranslation(), ...(site.translations?.[language] || {}) };
}

export function setSiteTranslation(site: HeritageSite, language: ContentLanguage, patch: Partial<HeritageSiteTranslation>): HeritageSite {
  const next = { ...siteTranslation(site, language), ...patch };
  if (language === 'en') {
    return {
      ...site,
      name: next.title,
      hebrewName: next.nativeName,
      shortDescription: next.shortDescription,
      fullDescription: next.fullDescription,
      transcript: next.transcript,
      translations: { ...(site.translations || {}), en: next },
    };
  }
  return { ...site, translations: { ...(site.translations || {}), [language]: next } };
}

export function translationHasContent(translation: HeritageSiteTranslation) {
  return [translation.title, translation.nativeName, translation.shortDescription, translation.fullDescription, translation.transcript]
    .some((value) => value.trim().length > 0) || translation.pronunciations.length > 0;
}

export function incompleteTranslationFields(translation: HeritageSiteTranslation) {
  const fields: string[] = [];
  if (!translation.title.trim()) fields.push('title');
  if (!translation.shortDescription.trim()) fields.push('short description');
  if (!translation.fullDescription.trim()) fields.push('historical narrative');
  return fields;
}

export function translationChangesForReview(snapshot: Record<string, unknown>, current?: HeritageSite): TranslationChange[] {
  const translations = snapshot.translations && typeof snapshot.translations === 'object'
    ? snapshot.translations as Record<string, unknown>
    : {};

  return CONTENT_LANGUAGES.flatMap((language) => {
    const raw = translations[language];
    if (!raw || typeof raw !== 'object') return [];
    const proposed = raw as Record<string, unknown>;
    const existing = current ? siteTranslation(current, language) : emptySiteTranslation();
    const fields = REVIEWABLE_TRANSLATION_FIELDS.flatMap(({ key, label }) => {
      const proposedValue = String(proposed[key] ?? '').trim();
      const previousValue = String(existing[key] ?? '').trim();
      return proposedValue === previousValue ? [] : [{ key, label, previous: previousValue, proposed: proposedValue }];
    });
    return fields.length > 0 ? [{ language, fields }] : [];
  });
}
