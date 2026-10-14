import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, Bot, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Compass, ExternalLink, Filter, Flag, Landmark, LoaderCircle, MapPin, Navigation, RefreshCw, X } from 'lucide-react';
import { CATEGORY_NAMES, getTranslatedSite, LanguageCode } from '../data/translations';
import { HeritageSite, NearbyGooglePlace, SiteCategory, UserLocation } from '../types';
import { formatDistance, getDistanceMeters } from '../utils/geo';
import { INTEREST_VALUES } from '../data/interests';
import { INTEREST_FILTER_TRANSLATIONS } from '../data/interestFilterTranslations';
import { matchesSelectedInterests } from '../lib/interestFilters';

type NearbyResult = {
  key: string;
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  category: string;
  summary: string;
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  googleMapsUrl: string;
  websiteUrl?: string;
  openNow?: boolean;
  source: 'moreshet' | 'google';
  verificationStatus: 'verified' | 'unverified';
};

interface WhatsAroundMeProps {
  isOpen: boolean;
  onClose: () => void;
  sites: HeritageSite[];
  userLocation: UserLocation;
  gpsStatus: 'off' | 'simulated' | 'requesting' | 'live' | 'denied' | 'unavailable' | 'error';
  locationEnabled: boolean;
  onEnableLocation: () => void;
  selectedLanguage: LanguageCode;
  signedIn: boolean;
  onOpenAccount: () => void;
  onAskBenjamin: (question: string) => void;
  selectedInterests: SiteCategory[];
  onToggleInterest: (interest: SiteCategory) => void;
  onClearInterests: () => void;
}

const SEARCH_RADIUS_METERS = 10_000;
const SAVED_NEARBY_KEY = 'moreshet_saved_nearby_place_ids';

const copyByLanguage: Record<LanguageCode, Record<string, string>> = {
  en: { title: 'What’s around me?', intro: 'Discover Jewish heritage near your current location.', back: 'Back to Discover', locationOn: 'Location on', locationNeeded: 'Turn on location to find nearby places.', enable: 'Turn on location', requesting: 'Finding your location…', blocked: 'Location is blocked. Allow location for Moreshet in your browser settings, then try again.', unavailable: 'Your current location is unavailable. You can still search by city on Discover.', retry: 'Try again', searching: 'Searching nearby…', results: 'Places near you', empty: 'No nearby Jewish heritage places were found within 10 km.', googleUnavailable: 'Google results are temporarily unavailable. Published Moreshet places are still shown.', verified: 'Verified by Moreshet', partner: 'Possible Jewish heritage place', details: 'View place', open: 'Open now', closed: 'May be closed', directions: 'Directions', save: 'Save place', saved: 'Saved', ask: 'Ask Benjamin', report: 'Report an issue', sources: 'View sources and verification', hideSources: 'Hide sources and verification', aiTitle: 'Ask Benjamin uses AI', aiWarning: 'AI can make mistakes. Check the listed sources and official visitor information before relying on a response.', googleSource: 'Google Maps place details', moreshetSource: 'Moreshet published catalogue', unverified: 'Not yet verified by Moreshet', signInSave: 'Sign in to save this place.', signInAsk: 'Sign in to ask Benjamin about this place.', website: 'Official website', googleSummary: 'This place was found through Google Maps. Its Jewish heritage information has not yet been reviewed by Moreshet.' },
  he: { title: 'מה נמצא סביבי?', intro: 'גלו אתרי מורשת יהודית בקרבת המיקום הנוכחי.', back: 'חזרה לגילוי', locationOn: 'המיקום פעיל', locationNeeded: 'הפעילו מיקום כדי למצוא מקומות בקרבתכם.', enable: 'הפעלת מיקום', requesting: 'מאתר את המיקום…', blocked: 'הגישה למיקום חסומה. אפשרו מיקום עבור Moreshet בהגדרות הדפדפן ונסו שוב.', unavailable: 'המיקום הנוכחי אינו זמין. עדיין אפשר לחפש לפי עיר במסך הגילוי.', retry: 'נסו שוב', searching: 'מחפש בקרבת מקום…', results: 'מקומות בקרבתכם', empty: 'לא נמצאו אתרי מורשת יהודית בטווח של 10 ק״מ.', googleUnavailable: 'תוצאות Google אינן זמינות זמנית. אתרי Moreshet שפורסמו עדיין מוצגים.', verified: 'אומת על ידי Moreshet', partner: 'אתר מורשת יהודית אפשרי', details: 'הצגת המקום', open: 'פתוח כעת', closed: 'ייתכן שסגור', directions: 'הוראות הגעה', save: 'שמירת מקום', saved: 'נשמר', ask: 'שאלו את Benjamin', report: 'דיווח על בעיה', sources: 'הצגת מקורות ואימות', hideSources: 'הסתרת מקורות ואימות', aiTitle: 'Benjamin משתמש ב-AI', aiWarning: 'AI עלול לטעות. בדקו את המקורות ואת המידע הרשמי למבקרים לפני שמסתמכים על התשובה.', googleSource: 'פרטי מקום ב-Google Maps', moreshetSource: 'הקטלוג שפורסם ב-Moreshet', unverified: 'טרם אומת על ידי Moreshet', signInSave: 'יש להתחבר כדי לשמור את המקום.', signInAsk: 'יש להתחבר כדי לשאול את Benjamin על המקום.', website: 'אתר רשמי', googleSummary: 'המקום נמצא באמצעות Google Maps. פרטי המורשת היהודית שלו טרם נבדקו על ידי Moreshet.' },
  fr: { title: 'Autour de moi', intro: 'Découvrez le patrimoine juif près de votre position.', back: 'Retour à Découvrir', locationOn: 'Localisation activée', locationNeeded: 'Activez la localisation pour trouver des lieux à proximité.', enable: 'Activer la localisation', requesting: 'Recherche de votre position…', blocked: 'La localisation est bloquée. Autorisez Moreshet à accéder à votre position dans les réglages du navigateur, puis réessayez.', unavailable: 'Votre position est indisponible. Vous pouvez toujours rechercher une ville dans Découvrir.', retry: 'Réessayer', searching: 'Recherche à proximité…', results: 'Lieux près de vous', empty: 'Aucun lieu de patrimoine juif trouvé dans un rayon de 10 km.', googleUnavailable: 'Les résultats Google sont momentanément indisponibles. Les lieux Moreshet publiés restent affichés.', verified: 'Vérifié par Moreshet', partner: 'Lieu de patrimoine juif possible', details: 'Voir le lieu', open: 'Ouvert', closed: 'Peut être fermé', directions: 'Itinéraire', save: 'Enregistrer', saved: 'Enregistré', ask: 'Demander à Benjamin', report: 'Signaler un problème', sources: 'Voir les sources et la vérification', hideSources: 'Masquer les sources et la vérification', aiTitle: 'Benjamin utilise l’IA', aiWarning: 'L’IA peut se tromper. Vérifiez les sources citées et les informations officielles avant de vous fier à une réponse.', googleSource: 'Fiche Google Maps', moreshetSource: 'Catalogue publié de Moreshet', unverified: 'Pas encore vérifié par Moreshet', signInSave: 'Connectez-vous pour enregistrer ce lieu.', signInAsk: 'Connectez-vous pour interroger Benjamin sur ce lieu.', website: 'Site officiel', googleSummary: 'Ce lieu a été trouvé grâce à Google Maps. Son intérêt pour le patrimoine juif n’a pas encore été vérifié par Moreshet.' },
  ru: { title: 'Что рядом?', intro: 'Найдите объекты еврейского наследия рядом с вами.', back: 'Назад к поиску', locationOn: 'Местоположение включено', locationNeeded: 'Включите местоположение, чтобы найти места рядом.', enable: 'Включить местоположение', requesting: 'Определяем местоположение…', blocked: 'Доступ к местоположению заблокирован. Разрешите его для Moreshet в настройках браузера и повторите попытку.', unavailable: 'Местоположение недоступно. Можно продолжить поиск по городу.', retry: 'Повторить', searching: 'Ищем поблизости…', results: 'Места рядом', empty: 'В радиусе 10 км объекты еврейского наследия не найдены.', googleUnavailable: 'Результаты Google временно недоступны. Опубликованные места Moreshet по-прежнему показаны.', verified: 'Проверено Moreshet', partner: 'Возможный объект еврейского наследия', details: 'Открыть место', open: 'Открыто', closed: 'Возможно закрыто', directions: 'Маршрут', save: 'Сохранить', saved: 'Сохранено', ask: 'Спросить Benjamin', report: 'Сообщить о проблеме', sources: 'Источники и проверка', hideSources: 'Скрыть источники', aiTitle: 'Benjamin использует ИИ', aiWarning: 'ИИ может ошибаться. Проверяйте источники и официальную информацию для посетителей.', googleSource: 'Данные Google Maps', moreshetSource: 'Опубликованный каталог Moreshet', unverified: 'Ещё не проверено Moreshet', signInSave: 'Войдите, чтобы сохранить место.', signInAsk: 'Войдите, чтобы спросить Benjamin.', website: 'Официальный сайт', googleSummary: 'Место найдено через Google Maps. Его связь с еврейским наследием ещё не проверена Moreshet.' },
  de: { title: 'Was ist in meiner Nähe?', intro: 'Entdecken Sie jüdisches Erbe in Ihrer Nähe.', back: 'Zurück zu Entdecken', locationOn: 'Standort an', locationNeeded: 'Aktivieren Sie den Standort, um Orte in der Nähe zu finden.', enable: 'Standort einschalten', requesting: 'Standort wird ermittelt…', blocked: 'Der Standort ist blockiert. Erlauben Sie Moreshet den Zugriff in den Browser-Einstellungen und versuchen Sie es erneut.', unavailable: 'Ihr Standort ist nicht verfügbar. Sie können weiterhin nach einer Stadt suchen.', retry: 'Erneut versuchen', searching: 'Suche in der Nähe…', results: 'Orte in Ihrer Nähe', empty: 'Im Umkreis von 10 km wurden keine jüdischen Kulturstätten gefunden.', googleUnavailable: 'Google-Ergebnisse sind vorübergehend nicht verfügbar. Veröffentlichte Moreshet-Orte werden weiterhin angezeigt.', verified: 'Von Moreshet geprüft', partner: 'Möglicher jüdischer Kulturort', details: 'Ort ansehen', open: 'Jetzt geöffnet', closed: 'Möglicherweise geschlossen', directions: 'Route', save: 'Ort speichern', saved: 'Gespeichert', ask: 'Benjamin fragen', report: 'Problem melden', sources: 'Quellen und Prüfung anzeigen', hideSources: 'Quellen ausblenden', aiTitle: 'Benjamin verwendet KI', aiWarning: 'KI kann Fehler machen. Prüfen Sie die aufgeführten Quellen und offiziellen Besucherinformationen.', googleSource: 'Google-Maps-Ortsdetails', moreshetSource: 'Veröffentlichter Moreshet-Global-Katalog', unverified: 'Noch nicht von Moreshet geprüft', signInSave: 'Melden Sie sich an, um diesen Ort zu speichern.', signInAsk: 'Melden Sie sich an, um Benjamin zu diesem Ort zu fragen.', website: 'Offizielle Website', googleSummary: 'Dieser Ort wurde über Google Maps gefunden. Seine Bedeutung für das jüdische Erbe wurde noch nicht von Moreshet geprüft.' },
  es: { title: '¿Qué hay cerca?', intro: 'Descubre patrimonio judío cerca de tu ubicación.', back: 'Volver a Descubrir', locationOn: 'Ubicación activada', locationNeeded: 'Activa la ubicación para encontrar lugares cercanos.', enable: 'Activar ubicación', requesting: 'Buscando tu ubicación…', blocked: 'La ubicación está bloqueada. Permite el acceso de Moreshet en los ajustes del navegador e inténtalo de nuevo.', unavailable: 'Tu ubicación no está disponible. Puedes seguir buscando por ciudad.', retry: 'Reintentar', searching: 'Buscando cerca…', results: 'Lugares cercanos', empty: 'No se encontraron lugares de patrimonio judío en un radio de 10 km.', googleUnavailable: 'Los resultados de Google no están disponibles temporalmente. Los lugares publicados de Moreshet siguen visibles.', verified: 'Verificado por Moreshet', partner: 'Posible lugar de patrimonio judío', details: 'Ver lugar', open: 'Abierto', closed: 'Puede estar cerrado', directions: 'Cómo llegar', save: 'Guardar lugar', saved: 'Guardado', ask: 'Preguntar a Benjamin', report: 'Informar de un problema', sources: 'Ver fuentes y verificación', hideSources: 'Ocultar fuentes', aiTitle: 'Benjamin utiliza IA', aiWarning: 'La IA puede cometer errores. Comprueba las fuentes y la información oficial antes de confiar en una respuesta.', googleSource: 'Datos de Google Maps', moreshetSource: 'Catálogo publicado de Moreshet', unverified: 'Aún no verificado por Moreshet', signInSave: 'Inicia sesión para guardar este lugar.', signInAsk: 'Inicia sesión para preguntar a Benjamin.', website: 'Sitio oficial', googleSummary: 'Este lugar se encontró mediante Google Maps. Su relevancia para el patrimonio judío aún no ha sido revisada por Moreshet.' },
};

const readableType = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const readSavedIds = () => {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_NEARBY_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const WhatsAroundMe: React.FC<WhatsAroundMeProps> = ({ isOpen, onClose, sites, userLocation, gpsStatus, locationEnabled, onEnableLocation, selectedLanguage, signedIn, onOpenAccount, onAskBenjamin, selectedInterests, onToggleInterest, onClearInterests }) => {
  const copy = copyByLanguage[selectedLanguage] || copyByLanguage.en;
  const [googlePlaces, setGooglePlaces] = useState<NearbyGooglePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providerError, setProviderError] = useState('');
  const [selectedResult, setSelectedResult] = useState<NearbyResult | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(readSavedIds);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInterestMenuOpen, setIsInterestMenuOpen] = useState(false);
  const interestMenuRef = useRef<HTMLDivElement>(null);
  const locationReady = locationEnabled && (gpsStatus === 'live' || gpsStatus === 'simulated');
  const categoryNames = CATEGORY_NAMES[selectedLanguage] || CATEGORY_NAMES.en;
  const interestCopy = INTEREST_FILTER_TRANSLATIONS[selectedLanguage];
  const selectedInterestLabel = selectedInterests.length === 0
    ? interestCopy.label
    : selectedInterests.length === 1
      ? categoryNames[selectedInterests[0]] || selectedInterests[0]
      : interestCopy.selected.replace('{count}', String(selectedInterests.length));

  useEffect(() => {
    setSelectedResult(null);
    setSourcesOpen(false);
  }, [selectedLanguage]);

  useEffect(() => {
    setSelectedResult(null);
  }, [selectedInterests]);

  useEffect(() => {
    if (!isInterestMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!interestMenuRef.current?.contains(event.target as Node)) setIsInterestMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsInterestMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isInterestMenuOpen]);

  const moreshetPlaces = useMemo<NearbyResult[]>(() => sites
    .filter((site) => matchesSelectedInterests(site, selectedInterests))
    .map((rawSite) => {
      const site = getTranslatedSite(rawSite, selectedLanguage);
      const distanceMeters = Math.round(getDistanceMeters(userLocation.lat, userLocation.lng, site.lat, site.lng));
      return {
        key: `moreshet:${site.id}`,
        id: site.id,
        name: site.name,
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        distanceMeters,
        category: readableType(site.category),
        summary: site.shortDescription,
        imageUrl: site.imageUrl,
        imageCredit: site.imageCredit,
        imageSourceUrl: site.imageSourceUrl,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`,
        source: 'moreshet' as const,
        verificationStatus: 'verified' as const,
      };
    })
    .filter((site) => site.distanceMeters <= SEARCH_RADIUS_METERS)
    .sort((left, right) => left.distanceMeters - right.distanceMeters), [selectedInterests, selectedLanguage, sites, userLocation.lat, userLocation.lng]);

  // Search stays in Google Maps instead of calling the billed Places API.
  useEffect(() => {setGooglePlaces([]);setIsLoading(false);setProviderError('');},[isOpen]);

  const results = useMemo<NearbyResult[]>(() => {
    const normalizedMoreshetNames = new Set(moreshetPlaces.map((place) => place.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
    const external = googlePlaces.flatMap((place): NearbyResult[] => {
      const normalizedName = place.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const duplicatesMoreshet = normalizedMoreshetNames.has(normalizedName)
        || moreshetPlaces.some((candidate) => getDistanceMeters(candidate.lat, candidate.lng, place.lat, place.lng) < 70);
      if (duplicatesMoreshet) return [];
      return [{
        key: `google:${place.id}`,
        id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        distanceMeters: place.distanceMeters,
        category: readableType(place.primaryType),
        summary: copy.googleSummary,
        googleMapsUrl: place.googleMapsUrl,
        websiteUrl: place.websiteUrl,
        openNow: place.openNow,
        source: 'google',
        verificationStatus: 'unverified',
      }];
    });
    return [...moreshetPlaces, ...external].sort((left, right) => left.distanceMeters - right.distanceMeters);
  }, [copy.googleSummary, googlePlaces, moreshetPlaces]);

  if (!isOpen) return null;

  const toggleSaved = (place: NearbyResult) => {
    if (!signedIn) {
      onOpenAccount();
      return;
    }
    setSavedIds((current) => {
      const next = current.includes(place.key) ? current.filter((id) => id !== place.key) : [...current, place.key];
      try { localStorage.setItem(SAVED_NEARBY_KEY, JSON.stringify(next)); } catch { /* Keep the current-session save. */ }
      return next;
    });
  };

  const askBenjamin = (place: NearbyResult) => {
    onAskBenjamin(`What is the Jewish heritage significance of ${place.name}${place.address ? ` at ${place.address}` : ''}? Please state clearly what is verified and cite your sources.`);
  };

  if (selectedResult) {
    const isSaved = savedIds.includes(selectedResult.key);
    const reportHref = `mailto:jeremy@3sci.com?subject=${encodeURIComponent(`Moreshet place report: ${selectedResult.name}`)}&body=${encodeURIComponent(`Please check this place:\n${selectedResult.name}\n${selectedResult.address}\n${selectedResult.googleMapsUrl}\n\nWhat appears to be incorrect:\n`)}`;
    return <section className="h-full overflow-y-auto overscroll-contain bg-[#f0f8ff] p-3 pb-24 text-gray-900 max-w-md mx-auto" aria-labelledby="nearby-place-title">
      <button type="button" onClick={() => { setSelectedResult(null); setSourcesOpen(false); }} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#318bbf]/30 bg-white px-3 text-xs font-bold text-[#164b77]"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{copy.results}</button>
      <article className="overflow-hidden rounded-3xl border border-[#318bbf]/25 bg-white shadow-sm">
        {selectedResult.imageUrl && <img src={selectedResult.imageUrl} alt={selectedResult.name} className="h-44 w-full object-cover" />}
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#318bbf]/10 text-[#164b77]"><Landmark className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><h2 id="nearby-place-title" className="text-lg font-bold leading-snug text-[#164b77]">{selectedResult.name}</h2><p className="mt-1 text-xs text-gray-600">{selectedResult.address}</p><p className="mt-1 text-[11px] font-semibold text-[#a94632]">{selectedResult.category} · {formatDistance(selectedResult.distanceMeters)}</p></div>
          </div>
          <div className={`flex items-start gap-2 rounded-2xl p-3 text-xs font-semibold ${selectedResult.verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{selectedResult.verificationStatus === 'verified' ? copy.verified : copy.partner}</div>
          <p className="text-sm leading-relaxed text-gray-700">{selectedResult.summary}</p>
          {selectedResult.openNow !== undefined && <p className={`text-xs font-bold ${selectedResult.openNow ? 'text-emerald-700' : 'text-amber-800'}`}>{selectedResult.openNow ? copy.open : copy.closed}</p>}
          <div className="grid grid-cols-2 gap-2">
            <a href={selectedResult.googleMapsUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#164b77] px-3 text-xs font-bold text-white"><Navigation className="h-4 w-4" />{copy.directions}</a>
            <button type="button" onClick={() => toggleSaved(selectedResult)} className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-bold ${isSaved ? 'border-[#297fad] bg-red-50 text-[#297fad]' : 'border-[#297fad] bg-white text-[#297fad]'}`}><Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />{isSaved ? copy.saved : copy.save}</button>
          </div>
          {!signedIn && <p className="text-center text-[10px] text-gray-500">{copy.signInSave}</p>}
          <div className="rounded-2xl bg-[#fff5d9] p-3 text-xs leading-relaxed text-[#684c12]"><div className="flex items-center gap-2 font-bold"><CircleAlert className="h-4 w-4" />{copy.aiTitle}</div><p className="mt-1">{copy.aiWarning}</p><button type="button" onClick={() => askBenjamin(selectedResult)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#a94632] px-3 font-bold text-white"><Bot className="h-4 w-4" />{copy.ask}</button>{!signedIn && <p className="mt-2 text-center text-[10px]">{copy.signInAsk}</p>}</div>
          <button type="button" onClick={() => setSourcesOpen((open) => !open)} aria-expanded={sourcesOpen} className="flex min-h-10 w-full items-center justify-between text-left text-xs font-bold text-[#318bbf]">{sourcesOpen ? copy.hideSources : copy.sources}{sourcesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          {sourcesOpen && <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-700"><p className="font-bold">{selectedResult.source === 'moreshet' ? copy.moreshetSource : copy.googleSource}</p>{selectedResult.source === 'google' && <p className="mt-1 text-amber-800">{copy.unverified}</p>}{selectedResult.imageCredit && <p className="mt-2 text-[10px] text-gray-500">Image: {selectedResult.imageCredit}</p>}{selectedResult.imageSourceUrl && <a href={selectedResult.imageSourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-[#318bbf]">Image source <ExternalLink className="h-3 w-3" /></a>}{selectedResult.websiteUrl && <a href={selectedResult.websiteUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 font-bold text-[#318bbf]">{copy.website}<ExternalLink className="h-3 w-3" /></a>}</div>}
          <a href={reportHref} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"><Flag className="h-4 w-4" />{copy.report}</a>
        </div>
      </article>
    </section>;
  }

  return <section className="h-full overflow-y-auto overscroll-contain bg-[#f0f8ff] p-3 pb-24 text-gray-900 max-w-md mx-auto" aria-labelledby="nearby-title"><a className="mb-3 block rounded-xl bg-white p-3 text-sm font-bold text-blue-900" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Jewish heritage near ${userLocation.lat},${userLocation.lng}`)}`} target="_blank" rel="noopener noreferrer">Search nearby in Google Maps ↗</a>
    <header className="rounded-3xl bg-[#164b77] p-4 text-white shadow-sm">
      <button type="button" onClick={onClose} className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-[11px] font-bold"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{copy.back}</button>
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#c38b3a] text-[#164b77]"><Compass className="h-6 w-6" /></div><div><h2 id="nearby-title" className="text-lg font-bold">{copy.title}</h2><p className="mt-1 text-xs text-white/80">{copy.intro}</p></div></div>
    </header>

    {!locationReady ? <div className="mt-3 rounded-3xl border border-[#318bbf]/25 bg-white p-5 text-center shadow-sm">
      <MapPin className="mx-auto h-8 w-8 text-[#c38b3a]" />
      <p className="mt-3 text-sm font-bold text-[#164b77]">{gpsStatus === 'requesting' ? copy.requesting : gpsStatus === 'denied' ? copy.blocked : gpsStatus === 'unavailable' || gpsStatus === 'error' ? copy.unavailable : copy.locationNeeded}</p>
      {gpsStatus !== 'requesting' && <button type="button" onClick={onEnableLocation} className="mt-4 min-h-11 w-full rounded-2xl bg-[#164b77] px-4 text-sm font-bold text-white">{locationEnabled ? copy.retry : copy.enable}</button>}
    </div> : <>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#318bbf]/20 bg-white px-3 py-2 text-[11px] font-bold text-[#318bbf]"><span className="flex items-center gap-2"><Navigation className="h-4 w-4" />{copy.locationOn} · ±{Math.round(userLocation.accuracy)}m</span><button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="flex min-h-9 items-center gap-1 rounded-xl px-2 text-[#164b77]"><RefreshCw className="h-3.5 w-3.5" />{copy.retry}</button></div>
      <div className="relative mt-3" ref={interestMenuRef}>
        <button type="button" aria-label={`${interestCopy.label}: ${selectedInterestLabel}`} aria-expanded={isInterestMenuOpen} aria-controls="nearby-interest-options" onClick={() => setIsInterestMenuOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[#318bbf]/25 bg-white px-3 text-left text-xs font-bold text-[#164b77] shadow-xs">
          <span className="flex min-w-0 items-center gap-2"><Filter className="h-4 w-4 shrink-0 text-[#c38b3a]" /><span className="truncate">{selectedInterestLabel}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-[#318bbf] transition-transform ${isInterestMenuOpen ? 'rotate-180' : ''}`} />
        </button>
        {isInterestMenuOpen && <div id="nearby-interest-options" className="absolute inset-x-0 z-30 mt-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <p className="px-2 pb-1 text-[10px] leading-snug text-gray-500">{interestCopy.matchHint}</p>
          <div className="max-h-64 overflow-y-auto" role="group" aria-label={interestCopy.label}>
            {INTEREST_VALUES.map((interest) => <label key={interest} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-xs text-gray-800 hover:bg-[#318bbf]/10">
              <input type="checkbox" checked={selectedInterests.includes(interest)} onChange={() => onToggleInterest(interest)} className="h-4 w-4 rounded border-gray-300 accent-[#164b77]" />
              <span>{categoryNames[interest] || interest}</span>
            </label>)}
          </div>
          {selectedInterests.length > 0 && <button type="button" onClick={onClearInterests} className="mt-1 min-h-10 w-full rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-[#164b77] hover:bg-gray-200">{interestCopy.clearAll}</button>}
        </div>}
      </div>
      {selectedInterests.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite">
        {selectedInterests.map((interest) => <button type="button" key={interest} onClick={() => onToggleInterest(interest)} aria-label={interestCopy.remove.replace('{interest}', categoryNames[interest] || interest)} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#318bbf]/12 px-2.5 py-1 text-[11px] font-semibold text-[#164b77]">{categoryNames[interest] || interest}<X className="h-3 w-3" /></button>)}
        <button type="button" onClick={onClearInterests} className="min-h-8 px-2 text-[11px] font-bold text-[#a94632] underline underline-offset-2">{interestCopy.clearAll}</button>
      </div>}
      {providerError && <p role="status" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{providerError}</p>}
      <div className="mt-4 flex items-center justify-between"><h3 className="text-sm font-bold text-[#164b77]">{copy.results} ({results.length})</h3>{isLoading && <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" />{copy.searching}</span>}</div>
      {!isLoading && results.length === 0 && <div className="mt-3 rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm font-semibold text-gray-600">{copy.empty}</div>}
      <div className="mt-3 space-y-3">
        {results.map((place) => <button key={place.key} type="button" onClick={() => setSelectedResult(place)} className="flex min-h-24 w-full items-start gap-3 rounded-3xl border border-gray-200 bg-white p-3 text-left shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#318bbf]/10 text-[#164b77]"><Landmark className="h-5 w-5" /></div>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-snug text-[#164b77]">{place.name}</span><span className="mt-1 block truncate text-[11px] text-gray-500">{place.address}</span><span className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold"><span className="text-[#a94632]">{formatDistance(place.distanceMeters)}</span><span className={`rounded-full px-2 py-1 ${place.verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{place.verificationStatus === 'verified' ? copy.verified : copy.partner}</span></span></span>
        </button>)}
      </div>
    </>}
  </section>;
};
