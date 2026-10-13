import { LanguageCode } from './translations';

interface InterestFilterCopy {
  label: string;
  selected: string;
  clearAll: string;
  remove: string;
  matchHint: string;
  noResults: string;
}

export const INTEREST_FILTER_TRANSLATIONS: Record<LanguageCode, InterestFilterCopy> = {
  en: {
    label: 'Interests',
    selected: '{count} selected',
    clearAll: 'Clear all',
    remove: 'Remove {interest}',
    matchHint: 'Stops matching any selected interest are shown.',
    noResults: 'No matching heritage sites found. Try adjusting your search or selected interests.',
  },
  he: {
    label: 'תחומי עניין',
    selected: '{count} נבחרו',
    clearAll: 'נקה הכול',
    remove: 'הסר את {interest}',
    matchHint: 'מוצגות תחנות התואמות לאחד מתחומי העניין שנבחרו.',
    noResults: 'לא נמצאו אתרי מורשת תואמים. נסו לשנות את החיפוש או את תחומי העניין.',
  },
  ru: {
    label: 'Интересы',
    selected: 'Выбрано: {count}',
    clearAll: 'Очистить всё',
    remove: 'Удалить: {interest}',
    matchHint: 'Показаны остановки, соответствующие любому выбранному интересу.',
    noResults: 'Подходящие объекты наследия не найдены. Измените поиск или выбранные интересы.',
  },
  fr: {
    label: 'Centres d’intérêt',
    selected: '{count} sélectionnés',
    clearAll: 'Tout effacer',
    remove: 'Retirer {interest}',
    matchHint: 'Les étapes correspondant à l’un des centres d’intérêt sélectionnés sont affichées.',
    noResults: 'Aucun site patrimonial correspondant. Modifiez la recherche ou les centres d’intérêt.',
  },
  de: {
    label: 'Interessen',
    selected: '{count} ausgewählt',
    clearAll: 'Alle löschen',
    remove: '{interest} entfernen',
    matchHint: 'Haltepunkte mit mindestens einem ausgewählten Interesse werden angezeigt.',
    noResults: 'Keine passenden Kulturerbestätten gefunden. Ändern Sie die Suche oder Interessen.',
  },
  es: {
    label: 'Intereses',
    selected: '{count} seleccionados',
    clearAll: 'Borrar todo',
    remove: 'Quitar {interest}',
    matchHint: 'Se muestran las paradas que coinciden con cualquiera de los intereses seleccionados.',
    noResults: 'No se encontraron sitios patrimoniales. Ajusta la búsqueda o los intereses.',
  },
};
