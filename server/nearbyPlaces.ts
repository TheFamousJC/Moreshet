export interface NearbyPlaceRequest {
  lat: number;
  lng: number;
  radiusMeters: number;
  language: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  interests: string[];
}

export interface NearbyGooglePlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  primaryType: string;
  googleMapsUrl: string;
  websiteUrl?: string;
  openNow?: boolean;
  distanceMeters: number;
  source: 'google';
  verificationStatus: 'unverified';
}

const MAX_RADIUS_METERS = 25_000;
const INTEREST_SEARCH_TERMS: Record<string, string> = {
  synagogue: 'synagogues',
  museum: 'Jewish museums',
  kosher_food: 'kosher restaurants, bakeries and food shops',
  community: 'Jewish community centres and Chabad houses',
  education: 'Jewish schools, yeshivas and study centres',
  juderia: 'Jewish quarters and heritage sites',
  holocaust: 'Holocaust memorials and museums',
  legends: 'Jewish folklore and historic sites',
  scholar: 'Zionist heritage sites',
  personalities: 'landmarks connected to Jewish historical figures',
  monument: 'Jewish memorials and monuments',
  cemetery: 'Jewish cemeteries',
  mikveh: 'mikvehs and Jewish ritual baths',
  archaeology: 'Jewish archaeological sites and ancient ruins',
  archives: 'Jewish archives and libraries',
  culture: 'Jewish cultural centres, galleries and Judaica sites',
  historic_sites: 'Jewish historic sites',
};

const ALL_JEWISH_PLACE_QUERY = 'Jewish places including synagogues, Jewish museums, kosher restaurants, Holocaust memorials, Jewish cemeteries, mikvehs, community centres, Chabad houses, schools, yeshivas, archives, libraries, cultural centres, archaeological sites and historic Jewish quarters';

export function parseNearbyPlaceRequest(input: unknown): NearbyPlaceRequest {
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const requestedRadius = Number(body.radiusMeters ?? 10_000);
  const language = ['en', 'he', 'ru', 'fr', 'de', 'es'].includes(String(body.language))
    ? String(body.language) as NearbyPlaceRequest['language']
    : 'en';
  const interests = Array.isArray(body.interests)
    ? [...new Set(body.interests.map(String).filter((value) => value in INTEREST_SEARCH_TERMS))].slice(0, 20)
    : [];

  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new Error('A valid current location is required.');
  }
  if (!Number.isFinite(requestedRadius)) throw new Error('A valid search distance is required.');

  return {
    lat,
    lng,
    radiusMeters: Math.min(MAX_RADIUS_METERS, Math.max(500, Math.round(requestedRadius))),
    language,
    interests,
  };
}

export function distanceInMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeType(type: unknown) {
  const value = String(type || 'point_of_interest').trim().toLowerCase();
  return /^[a-z0-9_]{1,60}$/.test(value) ? value : 'point_of_interest';
}

function normalizeWebUrl(value: unknown, fallback?: string) {
  try {
    const url = new URL(String(value || fallback || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export async function searchGoogleNearbyJewishPlaces(request: NearbyPlaceRequest, apiKey: string, signal?: AbortSignal): Promise<NearbyGooglePlace[]> {
  const selectedTerms = request.interests.map((interest) => INTEREST_SEARCH_TERMS[interest]).filter(Boolean);
  const textQuery = selectedTerms.length > 0
    ? `Jewish heritage places related to ${selectedTerms.join(', ')}`
    : ALL_JEWISH_PLACE_QUERY;
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.googleMapsUri,places.websiteUri,places.regularOpeningHours.openNow',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: request.language,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: request.lat, longitude: request.lng },
          radius: request.radiusMeters,
        },
      },
    }),
    signal,
  });

  const payload = await response.json() as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      primaryType?: string;
      googleMapsUri?: string;
      websiteUri?: string;
      regularOpeningHours?: { openNow?: boolean };
    }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message || `Google Places returned ${response.status}.`);

  return (payload.places || []).flatMap((place): NearbyGooglePlace[] => {
    const lat = Number(place.location?.latitude);
    const lng = Number(place.location?.longitude);
    const id = String(place.id || '').trim();
    const name = String(place.displayName?.text || '').trim();
    if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const distanceMeters = Math.round(distanceInMeters(request.lat, request.lng, lat, lng));
    if (distanceMeters > request.radiusMeters) return [];
    return [{
      id,
      name,
      address: String(place.formattedAddress || '').trim(),
      lat,
      lng,
      primaryType: normalizeType(place.primaryType),
      googleMapsUrl: normalizeWebUrl(place.googleMapsUri, `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)!,
      websiteUrl: normalizeWebUrl(place.websiteUri),
      openNow: typeof place.regularOpeningHours?.openNow === 'boolean' ? place.regularOpeningHours.openNow : undefined,
      distanceMeters,
      source: 'google',
      verificationStatus: 'unverified',
    }];
  }).sort((left, right) => left.distanceMeters - right.distanceMeters);
}
