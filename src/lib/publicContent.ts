import { HERITAGE_SITES, TOUR_CITIES } from '../data/heritageSites';
import { LanguageCode } from '../data/translations';
import { HeritageSite, TourCity, TourSummary } from '../types';

export interface PublicContentPayload {
  schemaVersion: 1;
  organization?: { id: string; name: string; slug: string };
  language: LanguageCode;
  generatedAt: string;
  cities: TourCity[];
  tours: TourSummary[];
  sites: HeritageSite[];
}

export type PublicContentSource = 'shared' | 'cache' | 'demo';

const CACHE_PREFIX = 'tudela_public_content_v1';

export function demoPublicContent(language: LanguageCode): PublicContentPayload {
  const tours: TourSummary[] = TOUR_CITIES.map((city) => ({
    id: `${city.id}-demo-tour`, cityId: city.id, title: `${city.name} Heritage Tour`,
    subtitle: city.subtitle, overview: city.description, accessMode: 'free' as const, status: 'published' as const,
  }));
  const budapest = TOUR_CITIES.find((city) => city.id === 'budapest');
  if (budapest) {
    tours.push({
      id: 'budapest-herzl-demo-tour',
      cityId: budapest.id,
      title: 'Herzl and Jewish Budapest',
      subtitle: 'A focused journey through Herzl’s birthplace and the Jewish Quarter',
      overview: 'Follow the places that shaped Theodor Herzl while exploring Budapest’s living synagogues, memorials and Jewish community heritage.',
      estimatedDurationMinutes: 75,
      distanceMetres: 2300,
      difficulty: 'easy',
      wheelchairAccessible: true,
      accessMode: 'free',
      status: 'published',
    });
  }
  const tourIds = new Map(TOUR_CITIES.map((city) => [city.id, `${city.id}-demo-tour`]));
  const cityPositions = new Map<string, number>();
  return {
    schemaVersion: 1,
    language,
    generatedAt: new Date().toISOString(),
    cities: TOUR_CITIES,
    tours,
    sites: HERITAGE_SITES.map((site) => {
      const cityId = site.cityId || '';
      const position = (cityPositions.get(cityId) || 0) + 1;
      cityPositions.set(cityId, position);
      const primaryTourId = site.tourId || (site.cityId ? tourIds.get(site.cityId) : undefined);
      const tourAssignments = primaryTourId ? [{ tourId: primaryTourId, position }] : [];
      if (cityId === 'budapest') tourAssignments.push({ tourId: 'budapest-herzl-demo-tour', position });
      return {
        ...site,
        tourId: primaryTourId,
        tourOrder: site.tourOrder || position,
        tourAssignments,
      };
    }),
  };
}

export function readPublicContentCache(organization: string, language: LanguageCode): PublicContentPayload | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}:${organization}:${language}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicContentPayload;
    return parsed.schemaVersion === 1 && Array.isArray(parsed.cities) && Array.isArray(parsed.tours) && Array.isArray(parsed.sites)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writePublicContentCache(organization: string, language: LanguageCode, payload: PublicContentPayload) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}:${organization}:${language}`, JSON.stringify(payload));
  } catch {
    // Browsers may disable or fill local storage; online content still works.
  }
}

export function clearPublicContentCache(organization: string, language: LanguageCode) {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}:${organization}:${language}`);
  } catch {
    // Continue without cache cleanup if browser storage is unavailable.
  }
}

export async function fetchPublicContent(organization: string, language: LanguageCode, signal?: AbortSignal) {
  const params = new URLSearchParams({ organization, language });
  const response = await fetch(`/api/public/content?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Published content request failed (${response.status}).`);
  const payload = await response.json() as PublicContentPayload;
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.cities) || !Array.isArray(payload.tours) || !Array.isArray(payload.sites)) {
    throw new Error('Published content response is invalid.');
  }
  return payload;
}
