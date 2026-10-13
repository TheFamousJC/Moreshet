import type { LanguageCode } from './translations';

export const LEGACY_CORE_UI_SUPPLEMENTS: Partial<Record<LanguageCode, Record<string, string>>> = {
  he: {
    discoverTitle: 'מורשת יהודית עולמית',
    selectCity: 'בחירת עיר',
    recommendedCities: 'ערים מומלצות',
    selectDestination: 'בחירת יעד',
  },
  ru: {
    discoverTitle: 'Мировое еврейское наследие',
    selectCity: 'Выбрать город',
    recommendedCities: 'Рекомендуемые города',
    selectDestination: 'Выбрать направление',
  },
  fr: {
    discoverTitle: 'Patrimoine juif mondial',
    selectCity: 'Choisir une ville',
    recommendedCities: 'Villes recommandées',
    selectDestination: 'Choisir une destination',
  },
};

export const FRENCH_CATEGORY_SUPPLEMENTS: Record<string, string> = {
  holocaust: 'Shoah',
  legends: 'Légendes',
  personalities: 'Personnalités',
  historic_sites: 'Sites historiques',
};
