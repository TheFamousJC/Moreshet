import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Compass,
  Play,
  Pause,
  Bookmark,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Filter,
  Maximize2,
  Clock3,
  Route,
  Accessibility,
  ChevronRight,
  X,
} from 'lucide-react';
import { HeritageSite, SiteCategory, UserLocation, AudioGuideSettings, TourCity, TourSummary } from '../types';
import { formatDistance, getDistanceMeters } from '../utils/geo';
import { LanguageCode, CATEGORY_NAMES, getTranslatedCity, getTranslatedSite, t } from '../data/translations';
import { INTEREST_VALUES } from '../data/interests';
import { INTEREST_FILTER_TRANSLATIONS } from '../data/interestFilterTranslations';
import { matchesSelectedInterests, parseStoredInterests } from '../lib/interestFilters';
import { TourActionsPanel } from './TourActionsPanel';
import { HeritageStoriesPanel } from './HeritageStoriesPanel';
import { StopCommentsPanel } from './StopCommentsPanel';
import { ImageCredit } from './ImageCredit';
import { cityMatchesDiscoverySearch, normalizeDiscoverySearch } from '../lib/discoverySearch';
import type { AccountPromptReason } from './AccountAccessModal';
import { WhatsAroundMe } from './WhatsAroundMe';

const INTEREST_SESSION_KEY = 'tudela-selected-interests';

const readSessionInterests = (): SiteCategory[] => {
  if (typeof window === 'undefined') return [];
  try {
    return parseStoredInterests(window.sessionStorage.getItem(INTEREST_SESSION_KEY));
  } catch {
    return [];
  }
};

interface HeritageSearchProps {
  sites: HeritageSite[];
  allSites: HeritageSite[];
  userLocation: UserLocation;
  gpsStatus: 'off' | 'simulated' | 'requesting' | 'live' | 'denied' | 'unavailable' | 'error';
  locationEnabled: boolean;
  onEnableLocation: () => void;
  audioSettings?: AudioGuideSettings;
  cities?: TourCity[];
  selectedCityId?: string;
  onSelectCity?: (cityId: string) => void;
  tours?: TourSummary[];
  selectedTourId?: string;
  onSelectTour?: (tourId: string) => void;
  onSelectSite: (site: HeritageSite) => void;
  onPlayAudioForSite: (site: HeritageSite) => void;
  onPauseAudio?: () => void;
  onResumeAudio?: () => void;
  savedTourIds: string[];
  onToggleSavedTour: (tourId: string) => void;
  selectedLanguage: LanguageCode;
  experienceMode: 'tour' | 'pod';
  onSelectExperience: (mode: 'tour' | 'pod') => void;
  signedIn: boolean;
  onOpenAccount: (reason?: AccountPromptReason) => void;
  onAskBenjamin: (question: string) => void;
  homeRequestId: number;
}

export const HeritageSearch: React.FC<HeritageSearchProps> = ({
  sites,
  allSites,
  userLocation,
  gpsStatus,
  locationEnabled,
  onEnableLocation,
  audioSettings,
  cities,
  selectedCityId,
  onSelectCity,
  tours,
  selectedTourId,
  onSelectTour,
  onSelectSite,
  onPlayAudioForSite,
  onPauseAudio,
  onResumeAudio,
  savedTourIds,
  onToggleSavedTour,
  selectedLanguage,
  experienceMode,
  onSelectExperience,
  signedIn,
  onOpenAccount,
  onAskBenjamin,
  homeRequestId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<SiteCategory[]>(readSessionInterests);
  const [isInterestMenuOpen, setIsInterestMenuOpen] = useState(false);
  const interestMenuRef = useRef<HTMLDivElement>(null);
  const [expandedTranscriptSiteId, setExpandedTranscriptSiteId] = useState<string | null>(null);
  const [expandedDetailsSiteId, setExpandedDetailsSiteId] = useState<string | null>(null);
  const [expandedDirectionsSiteId, setExpandedDirectionsSiteId] = useState<string | null>(null);
  const [expandedOverviewTourId, setExpandedOverviewTourId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedTourId) return;
    setSearchQuery('');
    setIsInterestMenuOpen(false);
    pageRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedTourId]);

  useEffect(() => {
    setShowNearbyPlaces(false);
  }, [homeRequestId]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTEREST_SESSION_KEY, JSON.stringify(selectedInterests));
    } catch {
      // Filtering still works if a browser blocks session storage.
    }
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

  // Translate site objects dynamically according to selected language
  const translatedSites = useMemo(() => {
    return sites.map((s) => getTranslatedSite(s, selectedLanguage));
  }, [sites, selectedLanguage]);

  // Compute site list with calculated distances
  const processedSites = useMemo(() => {
    let result = translatedSites.map((site) => ({
      ...site,
      distanceMeters: getDistanceMeters(userLocation.lat, userLocation.lng, site.lat, site.lng),
    }));

    // Filter by query
    if (searchQuery.trim()) {
      const q = normalizeDiscoverySearch(searchQuery);
      const queryCity = cities?.find((city) => city.id === selectedCityId);
      const selectedCountryMatches = Boolean(queryCity && cityMatchesDiscoverySearch(queryCity, searchQuery));
      result = result.filter(
        (s) =>
          selectedCountryMatches ||
          normalizeDiscoverySearch(s.name).includes(q) ||
          normalizeDiscoverySearch(s.shortDescription).includes(q) ||
          normalizeDiscoverySearch(s.transcript).includes(q) ||
          s.tags.some((tag) => normalizeDiscoverySearch(tag).includes(q))
      );
    }

    result = result.filter((site) => matchesSelectedInterests(site, selectedInterests));

    return result;
  }, [cities, selectedCityId, translatedSites, searchQuery, selectedInterests, userLocation]);

  const catNames = CATEGORY_NAMES[selectedLanguage] || CATEGORY_NAMES.en;
  const translatedCities = cities
    ?.map((city) => getTranslatedCity(city, selectedLanguage))
    .sort((a, b) => a.name.localeCompare(b.name, selectedLanguage, { sensitivity: 'base' }));
  const visibleCities = searchQuery.trim()
    ? translatedCities?.filter((city) => cityMatchesDiscoverySearch(city, searchQuery))
    : translatedCities?.slice(0, 5);
  const categories: { label: string; value: SiteCategory }[] = INTEREST_VALUES.map((value) => ({
    value,
    label: catNames[value] || value,
  }));
  const interestCopy = INTEREST_FILTER_TRANSLATIONS[selectedLanguage];
  const selectedInterestLabel = selectedInterests.length === 0
    ? interestCopy.label
    : selectedInterests.length === 1
      ? catNames[selectedInterests[0]] || selectedInterests[0]
      : interestCopy.selected.replace('{count}', String(selectedInterests.length));
  const toggleInterest = (interest: SiteCategory) => {
    setSelectedInterests((current) =>
      current.includes(interest) ? current.filter((value) => value !== interest) : [...current, interest],
    );
  };
  const cityTours = (tours || []).filter((tour) => tour.cityId === selectedCityId);
  const selectedCity = translatedCities?.find((city) => city.id === selectedCityId);
  const selectedTour = cityTours.find((tour) => tour.id === selectedTourId);
  const siteBelongsToTour = (site: HeritageSite, tourId: string) =>
    site.tourId === tourId || site.tourAssignments?.some((assignment) => assignment.tourId === tourId);
  const tourStopCount = (tourId: string) => allSites.filter((site) => siteBelongsToTour(site, tourId)).length;

  if (showNearbyPlaces) return <WhatsAroundMe
    isOpen
    onClose={() => setShowNearbyPlaces(false)}
    sites={allSites}
    userLocation={userLocation}
    gpsStatus={gpsStatus}
    locationEnabled={locationEnabled}
    onEnableLocation={onEnableLocation}
    selectedLanguage={selectedLanguage}
    signedIn={signedIn}
    onOpenAccount={() => onOpenAccount('nearby')}
    onAskBenjamin={onAskBenjamin}
    selectedInterests={selectedInterests}
    onToggleInterest={toggleInterest}
    onClearInterests={() => setSelectedInterests([])}
  />;

  return (
    <div ref={pageRef} className="h-full overflow-y-auto overscroll-contain bg-[#f7f0e5] p-3 pb-24 text-gray-900 space-y-3 max-w-md mx-auto">
      <h1 className="sr-only">{t('navDiscover', selectedLanguage)}</h1>

      {/* Search Bar & City Selector Controls */}
      {!selectedTourId && <div className="space-y-2">
        {/* Search Input Box & City Dropdown List Row */}
        <div className="flex items-center gap-2">
          {/* Free Text Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              id="input-heritage-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder', selectedLanguage)}
              aria-label={t('searchPlaceholder', selectedLanguage)}
              className="min-h-10 w-full bg-white border border-gray-200 rounded-2xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 shadow-xs transition-all"
            />
          </div>

          {/* City Dropdown List */}
          {cities && onSelectCity && (
            <div className="relative shrink-0">
              <select
                id="select-city-dropdown-search"
                value={selectedCityId}
                onChange={(e) => onSelectCity(e.target.value)}
                aria-label={t('selectCity', selectedLanguage)}
                className="min-h-10 appearance-none bg-white border border-gray-200 text-gray-900 text-xs font-bold py-2 pl-2.5 pr-7 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-xs cursor-pointer"
              >
                <option value="">{t('selectCity', selectedLanguage)}</option>
                {translatedCities?.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.flagEmoji} {city.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Filter Row: Experience and Interests */}
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <label
              htmlFor="select-experience-mode"
              className="mb-1 block text-[10px] font-bold text-blue-900"
            >
              {t('experienceType', selectedLanguage)}
            </label>
            <div className="relative">
              <select
                id="select-experience-mode"
                aria-label={t('experienceType', selectedLanguage)}
                value={experienceMode}
                onChange={(e) => onSelectExperience(e.target.value as 'tour' | 'pod')}
                className="min-h-10 appearance-none rounded-2xl bg-blue-900 py-2 pl-3 pr-8 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="tour">{t('tourOption', selectedLanguage)}</option>
                <option value="pod">{t('podOption', selectedLanguage)}</option>
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-white pointer-events-none" />
            </div>
          </div>
          {/* Multi-select Interests Menu */}
          <div className="relative flex-1" ref={interestMenuRef}>
            <label className="mb-1 block text-[10px] font-bold text-blue-900" id="interest-filter-label">
              {interestCopy.label}
            </label>
            <button
              type="button"
              id="select-category-dropdown"
              aria-label={selectedInterests.length === 0 ? interestCopy.label : `${interestCopy.label}: ${selectedInterestLabel}`}
              aria-expanded={isInterestMenuOpen}
              aria-controls="interest-filter-options"
              onClick={() => setIsInterestMenuOpen((open) => !open)}
              className="flex min-h-10 w-full items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white py-2 pl-3 pr-3 text-left text-xs font-medium text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <span className="truncate">{selectedInterestLabel}</span>
              <Filter className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </button>
            {isInterestMenuOpen && (
              <div
                id="interest-filter-options"
                className="absolute right-0 z-30 mt-2 w-full min-w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl"
              >
                <p className="px-2 pb-1 text-[10px] leading-snug text-gray-500">{interestCopy.matchHint}</p>
                <div className="max-h-64 overflow-y-auto" role="group" aria-labelledby="interest-filter-label">
                  {categories.map((category) => (
                    <label
                      key={category.value}
                      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-xs text-gray-800 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInterests.includes(category.value)}
                        onChange={() => toggleInterest(category.value)}
                        className="h-4 w-4 rounded border-gray-300 accent-blue-900"
                      />
                      <span>{category.label}</span>
                    </label>
                  ))}
                </div>
                {selectedInterests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedInterests([])}
                    className="mt-1 min-h-10 w-full rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-blue-900 hover:bg-gray-200"
                  >
                    {interestCopy.clearAll}
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
        {selectedInterests.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
            {selectedInterests.map((interest) => {
              const label = catNames[interest] || interest;
              return (
                <button
                  type="button"
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  aria-label={interestCopy.remove.replace('{interest}', label)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-950"
                >
                  {label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedInterests([])}
              className="min-h-8 px-2 text-[11px] font-bold text-blue-800 underline underline-offset-2"
            >
              {interestCopy.clearAll}
            </button>
          </div>
        )}
        <button
          type="button"
          id="whats-around-me-button"
          onClick={() => setShowNearbyPlaces(true)}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#4f8078]/30 bg-white px-4 py-3 text-left shadow-xs transition hover:border-[#4f8078]/60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c38b3a]/20 text-[#173f46]"><Compass className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#173f46]">{selectedLanguage === 'he' ? 'מה נמצא סביבי?' : selectedLanguage === 'fr' ? 'Autour de moi' : selectedLanguage === 'ru' ? 'Что рядом?' : selectedLanguage === 'de' ? 'Was ist in meiner Nähe?' : selectedLanguage === 'es' ? '¿Qué hay cerca?' : 'What’s around me?'}</span><span className="mt-0.5 block text-[11px] text-gray-500">{selectedLanguage === 'he' ? 'גלו אתרי מורשת יהודית בקרבתכם' : selectedLanguage === 'fr' ? 'Découvrez le patrimoine juif à proximité' : selectedLanguage === 'ru' ? 'Найдите еврейское наследие поблизости' : selectedLanguage === 'de' ? 'Jüdisches Erbe in der Nähe entdecken' : selectedLanguage === 'es' ? 'Descubre patrimonio judío cercano' : 'Discover Jewish heritage near your location'}</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#4f8078] rtl:rotate-180" />
        </button>
      </div>}

      {selectedCityId && cityTours.length === 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-center">
          <h2 className="font-bold text-amber-950">{selectedCity?.flagEmoji} {selectedCity?.name}</h2>
          <p className="mt-2 text-xs leading-relaxed text-amber-900">{t('noToursAvailable', selectedLanguage)}</p>
        </section>
      )}

      {selectedCityId && cityTours.length > 0 && !selectedTourId && onSelectTour && (
        <section className="space-y-3" aria-labelledby="city-tours-heading">
          <div className="rounded-3xl bg-blue-950 p-4 text-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300">{selectedCity?.flagEmoji} {selectedCity?.country}</p>
            <h2 id="city-tours-heading" className="mt-1 text-lg font-bold">{selectedCity?.name}: {t('toursInCity', selectedLanguage)}</h2>
            {selectedCity?.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-blue-100">{selectedCity.description}</p>}
            <p className="mt-3 text-[11px] font-semibold text-amber-200">{t('chooseTourPrompt', selectedLanguage)}</p>
          </div>

          <div className="space-y-3">
            {cityTours.map((tour) => {
              const stopCount = tourStopCount(tour.id);
              const fallbackImageSite = allSites.find((site) => siteBelongsToTour(site, tour.id));
              const tourImageSource = tour.imageUrl ? tour : selectedCity?.imageUrl ? selectedCity : fallbackImageSite;
              const tourImage = tourImageSource?.imageUrl;
              return (
                <article key={tour.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
                  {tourImage && <img src={tourImage} alt="" className="h-28 w-full object-cover" />}
                  <ImageCredit credit={tourImageSource?.imageCredit} sourceUrl={tourImageSource?.imageSourceUrl} licenseName={tourImageSource?.imageLicenseName} licenseUrl={tourImageSource?.imageLicenseUrl} className="px-4 pt-2"/>
                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="text-base font-bold leading-snug text-blue-950">{tour.title}</h3>
                      {tour.subtitle && <p className="mt-1 text-xs font-semibold text-amber-700">{tour.subtitle}</p>}
                    </div>
                    {tour.overview && <><p className={`text-xs leading-relaxed text-gray-700 ${expandedOverviewTourId === tour.id ? '' : 'line-clamp-3'}`}>{tour.overview}</p><button type="button" onClick={() => setExpandedOverviewTourId((current) => current === tour.id ? null : tour.id)} className="text-[11px] font-bold text-blue-800 underline underline-offset-2">{t(expandedOverviewTourId === tour.id ? 'hideFullOverview' : 'showFullOverview', selectedLanguage)}</button></>}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-gray-700">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1"><MapPin className="me-1 inline h-3 w-3 text-blue-800" />{stopCount} {t('stops', selectedLanguage)}</span>
                      {tour.estimatedDurationMinutes && <span className="rounded-full bg-blue-50 px-2.5 py-1"><Clock3 className="me-1 inline h-3 w-3 text-blue-800" />{tour.estimatedDurationMinutes} {t('minutes', selectedLanguage)}</span>}
                      {tour.distanceMetres && <span className="rounded-full bg-blue-50 px-2.5 py-1"><Route className="me-1 inline h-3 w-3 text-blue-800" />{(tour.distanceMetres / 1000).toFixed(1)} {t('kilometres', selectedLanguage)}</span>}
                      {tour.wheelchairAccessible && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-900"><Accessibility className="me-1 inline h-3 w-3" />{t('wheelchairAccessible', selectedLanguage)}</span>}
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2"><button type="button" onClick={() => onSelectTour(tour.id)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#173f46] px-4 py-2.5 text-xs font-bold text-white shadow-sm">{t('chooseTour', selectedLanguage)}<ChevronRight className="h-4 w-4 rtl:rotate-180" /></button><button type="button" onClick={() => onToggleSavedTour(tour.id)} className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c43d4d] text-[#c43d4d] ${savedTourIds.includes(tour.id) ? 'bg-red-50' : 'bg-white'}`} aria-label={savedTourIds.includes(tour.id) ? 'Remove saved tour' : 'Save tour'}><Bookmark className={`h-5 w-5 ${savedTourIds.includes(tour.id) ? 'fill-current' : ''}`} /></button></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {selectedTour && onSelectTour && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-3" aria-labelledby="selected-tour-heading">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-blue-700">{t('tourStops', selectedLanguage)}</p>
              <h2 id="selected-tour-heading" className="mt-0.5 truncate text-sm font-bold text-blue-950">{selectedTour.title}</h2>
              {selectedTour.subtitle && <p className="mt-1 text-[11px] text-blue-800">{selectedTour.subtitle}</p>}
            </div>
            <button type="button" onClick={() => onSelectTour('')} title={t('changeTourHelp', selectedLanguage)} className="min-h-10 shrink-0 rounded-xl border border-blue-300 bg-white px-3 text-[10px] font-bold text-blue-900">
              {t('changeTour', selectedLanguage)}
            </button>
          </div>
        </section>
      )}

      {!selectedCityId && (
        <section className="space-y-2 pt-1">
          <h2 className="text-sm font-semibold text-blue-900">{t('recommendedCities', selectedLanguage)}</h2>
          <div className="space-y-3">
            {visibleCities?.map((city) => {
              const stopCount = allSites.filter((site) => site.cityId === city.id).length;
              const fallbackImageSite = allSites.find((site) => site.cityId === city.id);
              const cityImage = city.imageUrl || fallbackImageSite?.imageUrl;
              const cityImageCredit = city.imageCredit || fallbackImageSite?.imageCredit;
              return (
                <button
                  key={city.id}
                  onClick={() => onSelectCity?.(city.id)}
                  className="grid min-h-28 w-full grid-cols-[7.5rem_1fr] overflow-hidden rounded-3xl border border-gray-200 bg-white text-left shadow-xs transition hover:border-blue-300 hover:shadow-sm"
                >
                  {cityImage && (
                    <img src={cityImage} alt={city.name} className="h-full min-h-28 w-full object-cover" />
                  )}
                  <span className="flex min-w-0 flex-col justify-center px-4 py-3">
                    <span className="block text-base font-bold text-blue-950">{city.flagEmoji} {city.name}</span>
                    <span className="mt-1 block text-xs font-semibold text-gray-600">{city.country}</span>
                    <span className="mt-2 block text-xs text-gray-500">{stopCount} {t('heritageSites', selectedLanguage)}</span>
                    {cityImageCredit && <span className="mt-2 block truncate text-[8px] leading-tight text-slate-400">{cityImageCredit}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Results Header */}
      {selectedCityId && selectedTourId && <>
      {selectedTour && <TourActionsPanel
        tour={selectedTour}
        language={selectedLanguage}
        signedIn={signedIn}
        onOpenAccount={onOpenAccount}
      />}
      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
        <h2 className="font-semibold text-blue-950">{t('tourStops', selectedLanguage)} ({processedSites.length})</h2>
      </div>

      {/* Sites List Cards */}
      <div className="space-y-2.5">
        {processedSites.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center space-y-2 shadow-xs my-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-xs">{t('noSitesFound', selectedLanguage)}</h3>
            <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
              {interestCopy.noResults}
            </p>
          </div>
        )}
        {processedSites.map((site) => {
          const isTranscriptOpen = expandedTranscriptSiteId === site.id;
          const isDetailsOpen = expandedDetailsSiteId === site.id;
          const isDirectionsOpen = expandedDirectionsSiteId === site.id;
          const translatedCityName = translatedCities?.find((city) => city.id === site.cityId)?.name || site.cityName;
          const translatedCategory = catNames[site.category] || site.category;

          return (
            <div
              key={site.id}
              className="bg-white border border-gray-100 rounded-2xl p-2.5 shadow-2xs hover:shadow-xs transition-all space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative w-12 h-12 shrink-0">
                  <button type="button" onClick={() => setExpandedImage({ src: site.imageUrl, alt: site.name })} className="group relative h-12 w-12" aria-label={`${t('expandPhoto', selectedLanguage)}: ${site.name}`}>
                    <img
                      src={site.imageUrl}
                      alt={site.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="h-12 w-12 rounded-xl border border-gray-100 object-cover shadow-2xs"
                    />
                    <Maximize2 className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded bg-white/90 p-0.5 text-blue-950 shadow" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {translatedCityName && (
                        <span className="text-[9px] font-bold text-blue-900 uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-50 border border-blue-100">
                          {translatedCityName}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-50 border border-amber-100">
                        {translatedCategory}
                      </span>
                    </div>
                    {site.distanceMeters !== undefined && (gpsStatus === 'live' || gpsStatus === 'simulated') && (
                      <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 shrink-0">
                        {site.distanceMeters > 50000 ? t('notNearby', selectedLanguage) : `${formatDistance(site.distanceMeters)} ${t('away', selectedLanguage)}`}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-gray-900 mt-0.5 truncate leading-snug">
                    {site.name}
                  </h3>
                </div>
              </div>

              <ImageCredit credit={site.imageCredit} sourceUrl={site.imageSourceUrl} licenseName={site.imageLicenseName} licenseUrl={site.imageLicenseUrl}/>

              {/* Three clear actions: start, details and directions. */}
              <div className="grid grid-cols-3 gap-1.5 border-t border-gray-100 pt-1.5">
                {(() => {
                  const isCurrentAudioSite = audioSettings?.currentSiteId === site.id;
                  const isPlayingThisSite = isCurrentAudioSite && audioSettings?.isPlaying;

                  return (
                    <button
                      onClick={() => {
                        if (isPlayingThisSite) {
                          onPauseAudio?.();
                        } else {
                          onPlayAudioForSite(site);
                        }
                      }}
                      className={`min-h-10 flex-1 py-1.5 px-2 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs transition-colors ${
                        isPlayingThisSite
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-200'
                          : 'bg-blue-900 hover:bg-blue-800 text-white'
                      }`}
                      title={t('startStop', selectedLanguage)}
                    >
                      {isPlayingThisSite ? (
                        <>
                          <Pause className="w-3 h-3 fill-slate-950 text-slate-950" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-white ml-0.5" />
                          <span>{t('startStop', selectedLanguage)}</span>
                        </>
                      )}
                    </button>
                  );
                })()}

                <button
                  onClick={() => setExpandedDetailsSiteId(isDetailsOpen ? null : site.id)}
                  className="min-h-10 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-blue-900 font-semibold rounded-xl text-xs flex items-center gap-1 border border-gray-200"
                  aria-expanded={isDetailsOpen}
                >
                  <FileText className="w-3 h-3" />
                  <span>{t('details', selectedLanguage)}</span>
                  {isDetailsOpen ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                <button type="button" onClick={() => setExpandedDirectionsSiteId(isDirectionsOpen ? null : site.id)} aria-expanded={isDirectionsOpen} className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-900">
                  <Route className="h-3.5 w-3.5" />{t('directions', selectedLanguage)}
                </button>
              </div>

              {isDirectionsOpen && <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lng}&travelmode=walking`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white"><img src="/google-maps-mark.svg" alt="" className="h-5 w-5 rounded bg-white" />Google Maps</a>
                <a href={`https://waze.com/ul?ll=${site.lat},${site.lng}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-center rounded-xl bg-sky-500 px-3 text-xs font-bold text-white">Waze</a>
              </div>}
              {isDetailsOpen && <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 shadow-inner">
                <p className="leading-relaxed text-gray-700">{site.shortDescription}</p>
                <button type="button" onClick={() => setExpandedTranscriptSiteId(isTranscriptOpen ? null : site.id)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white font-bold text-blue-900"><FileText className="h-4 w-4" />{t('readAlong', selectedLanguage)}{isTranscriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                {isTranscriptOpen && <div className="space-y-1.5 rounded-xl bg-white p-3"><div className="flex items-center justify-between border-b border-gray-200 pb-1 text-[10px] font-bold text-gray-900"><span>{t('readAlong', selectedLanguage)}</span><span className="text-amber-600">{site.historicalPeriod}</span></div><p className="whitespace-pre-line font-sans text-xs leading-relaxed text-gray-700">{site.transcript}</p></div>}
              </div>}
              {selectedTour && <StopCommentsPanel
                tourId={selectedTour.id}
                stopId={site.id}
                stopName={site.name}
                language={selectedLanguage}
                signedIn={signedIn}
                onOpenAccount={onOpenAccount}
              />}
            </div>
          );
        })}
      </div>
      {selectedTour && <HeritageStoriesPanel
        tour={selectedTour}
        language={selectedLanguage}
        signedIn={signedIn}
        onOpenAccount={onOpenAccount}
      />}
      </>}
      {expandedImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 p-3" role="dialog" aria-modal="true" aria-label={expandedImage.alt} onClick={() => setExpandedImage(null)}>
          <button type="button" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950" onClick={() => setExpandedImage(null)} aria-label={t('close', selectedLanguage)}><X className="h-5 w-5" /></button>
          <img src={expandedImage.src} alt={expandedImage.alt} className="max-h-[88dvh] max-w-full rounded-2xl object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
