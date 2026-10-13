import type { LanguageCode } from './translations';

export const DISCOVERY_TOUR_UI_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    toursInCity: 'Tours in this city', chooseTourPrompt: 'Choose a tour to see its stops',
    chooseTour: 'Choose this tour', changeTour: 'See other tours', changeTourHelp: 'Return to the tours available in this city', tourStops: 'Tour stops', expandPhoto: 'Expand photo', startStop: 'Start this stop', details: 'Details', directions: 'Directions', readAlong: 'Read along', notNearby: 'Not nearby', showFullOverview: 'About this tour', hideFullOverview: 'Show less',
    minutes: 'min', kilometres: 'km', wheelchairAccessible: 'Wheelchair accessible',
    noToursAvailable: 'No published tours are available for this city yet.', backToTourStops: 'Tour stops', autoArrivalOn: 'Arrival Sound: On', autoArrivalOff: 'Arrival Sound: Off', openWaze: 'Open destination in Waze', tourMap: 'Tour map', mapOsmStreets: 'OpenStreetMap Streets', mapOsmHumanitarian: 'OpenStreetMap Walking', loadingWalkingRoute: 'Loading walking route…', walkingRouteUnavailable: 'Walking route unavailable — use Directions',
  },
  he: {
    toursInCity: 'סיורים בעיר זו', chooseTourPrompt: 'בחרו סיור כדי לראות את התחנות שלו',
    chooseTour: 'בחרו בסיור זה', changeTour: 'סיורים נוספים', changeTourHelp: 'חזרה לסיורים הזמינים בעיר זו', tourStops: 'תחנות הסיור', expandPhoto: 'הגדלת תמונה', startStop: 'התחלת התחנה', details: 'פרטים', directions: 'הוראות הגעה', readAlong: 'קריאה במקביל', notNearby: 'לא בקרבת מקום', showFullOverview: 'מידע על הסיור', hideFullOverview: 'הצג פחות',
    minutes: 'דק׳', kilometres: 'ק״מ', wheelchairAccessible: 'נגיש לכיסאות גלגלים',
    noToursAvailable: 'עדיין אין סיורים שפורסמו עבור עיר זו.', backToTourStops: 'חזרה לתחנות הסיור', autoArrivalOn: 'צליל הגעה: פועל', autoArrivalOff: 'צליל הגעה: כבוי', openWaze: 'פתיחת היעד ב-Waze', tourMap: 'מפת הסיור', mapOsmStreets: 'רחובות OpenStreetMap', mapOsmHumanitarian: 'הליכה ב-OpenStreetMap', loadingWalkingRoute: 'טוען מסלול הליכה של Google…', walkingRouteUnavailable: 'מסלול ההליכה אינו זמין — השתמשו ב-Google Maps',
  },
  ru: {
    toursInCity: 'Экскурсии в этом городе', chooseTourPrompt: 'Выберите экскурсию, чтобы увидеть её остановки',
    chooseTour: 'Выбрать экскурсию', changeTour: 'Другие экскурсии', changeTourHelp: 'Вернуться к экскурсиям в этом городе', tourStops: 'Остановки экскурсии', expandPhoto: 'Увеличить фото', startStop: 'Начать остановку', details: 'Подробнее', directions: 'Маршрут', readAlong: 'Читать вместе', notNearby: 'Не рядом', showFullOverview: 'Об этой экскурсии', hideFullOverview: 'Свернуть',
    minutes: 'мин', kilometres: 'км', wheelchairAccessible: 'Доступно для колясок',
    noToursAvailable: 'Для этого города пока нет опубликованных экскурсий.', backToTourStops: 'К остановкам экскурсии', autoArrivalOn: 'Звук прибытия: вкл.', autoArrivalOff: 'Звук прибытия: выкл.', openWaze: 'Открыть место в Waze', tourMap: 'Карта экскурсии', mapOsmStreets: 'Улицы OpenStreetMap', mapOsmHumanitarian: 'Пешая OpenStreetMap', loadingWalkingRoute: 'Загрузка пешего маршрута Google…', walkingRouteUnavailable: 'Пеший маршрут недоступен — откройте Google Maps',
  },
  fr: {
    toursInCity: 'Visites dans cette ville', chooseTourPrompt: 'Choisissez une visite pour afficher ses étapes',
    chooseTour: 'Choisir cette visite', changeTour: 'Autres visites', changeTourHelp: 'Revenir aux visites disponibles dans cette ville', tourStops: 'Étapes de la visite', expandPhoto: 'Agrandir la photo', startStop: 'Commencer cette étape', details: 'Détails', directions: 'Itinéraire', readAlong: 'Lire le texte', notNearby: 'Pas à proximité', showFullOverview: 'À propos de cette visite', hideFullOverview: 'Afficher moins',
    minutes: 'min', kilometres: 'km', wheelchairAccessible: 'Accessible en fauteuil roulant',
    noToursAvailable: 'Aucune visite publiée n’est encore disponible pour cette ville.', backToTourStops: 'Retour aux étapes', autoArrivalOn: 'Son d’arrivée : activé', autoArrivalOff: 'Son d’arrivée : désactivé', openWaze: 'Ouvrir la destination dans Waze', tourMap: 'Carte de la visite', mapOsmStreets: 'Rues OpenStreetMap', mapOsmHumanitarian: 'Marche OpenStreetMap', loadingWalkingRoute: 'Chargement de l’itinéraire Google…', walkingRouteUnavailable: 'Itinéraire indisponible — utilisez Google Maps',
  },
  de: {
    toursInCity: 'Touren in dieser Stadt', chooseTourPrompt: 'Wählen Sie eine Tour, um ihre Stopps zu sehen',
    chooseTour: 'Diese Tour wählen', changeTour: 'Andere Touren', changeTourHelp: 'Zurück zu den Touren in dieser Stadt', tourStops: 'Tourstopps', expandPhoto: 'Foto vergrößern', startStop: 'Diesen Stopp starten', details: 'Details', directions: 'Wegbeschreibung', readAlong: 'Mitlesen', notNearby: 'Nicht in der Nähe', showFullOverview: 'Über diese Tour', hideFullOverview: 'Weniger anzeigen',
    minutes: 'Min.', kilometres: 'km', wheelchairAccessible: 'Rollstuhlgerecht',
    noToursAvailable: 'Für diese Stadt sind noch keine veröffentlichten Touren verfügbar.', backToTourStops: 'Zurück zu den Tourstopps', autoArrivalOn: 'Ankunftston: Ein', autoArrivalOff: 'Ankunftston: Aus', openWaze: 'Ziel in Waze öffnen', tourMap: 'Tourkarte', mapOsmStreets: 'OpenStreetMap Straßen', mapOsmHumanitarian: 'OpenStreetMap zu Fuß', loadingWalkingRoute: 'Google-Fußweg wird geladen…', walkingRouteUnavailable: 'Fußweg nicht verfügbar — Google Maps verwenden',
  },
  es: {
    toursInCity: 'Tours en esta ciudad', chooseTourPrompt: 'Elige un tour para ver sus paradas',
    chooseTour: 'Elegir este tour', changeTour: 'Otros tours', changeTourHelp: 'Volver a los tours de esta ciudad', tourStops: 'Paradas del tour', expandPhoto: 'Ampliar foto', startStop: 'Iniciar esta parada', details: 'Detalles', directions: 'Indicaciones', readAlong: 'Leer el texto', notNearby: 'No está cerca', showFullOverview: 'Acerca de este tour', hideFullOverview: 'Mostrar menos',
    minutes: 'min', kilometres: 'km', wheelchairAccessible: 'Accesible en silla de ruedas',
    noToursAvailable: 'Todavía no hay tours publicados disponibles para esta ciudad.', backToTourStops: 'Volver a las paradas', autoArrivalOn: 'Sonido de llegada: activado', autoArrivalOff: 'Sonido de llegada: desactivado', openWaze: 'Abrir destino en Waze', tourMap: 'Mapa del tour', mapOsmStreets: 'Calles OpenStreetMap', mapOsmHumanitarian: 'Caminata OpenStreetMap', loadingWalkingRoute: 'Cargando ruta a pie de Google…', walkingRouteUnavailable: 'Ruta a pie no disponible — usa Google Maps',
  },
};
