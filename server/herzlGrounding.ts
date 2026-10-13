import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { HerzlRequest } from './herzlProvider.js';

export interface HerzlCitation { marker: string; title: string; url: string }
export interface HerzlGrounding {
  context: string;
  citations: HerzlCitation[];
  organizationId: string;
  selectedCityId: string | null;
  selectedTourId: string | null;
  tourMatchesRequestedCity: boolean;
  selectedStopCount: number;
}

export interface HerzlBudgetReservation {
  allowed: boolean;
  requestId: string | null;
  used: number;
  remaining: number;
}

export function createHerzlSupabaseAdmin(url: string, secretKey: string) {
  if (!url || !secretKey) return null;
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function authenticateHerzlUser(admin: SupabaseClient, authorization?: string): Promise<User | null> {
  const match = /^Bearer\s+(.+)$/i.exec(authorization || '');
  if (!match) return null;
  const { data, error } = await admin.auth.getUser(match[1]);
  return error ? null : data.user;
}

const chooseTranslation = (rows: any[] | null | undefined, language: string) => rows?.find((item) => item.language === language && item.status === 'published')
  || rows?.find((item) => item.language === 'en' && item.status === 'published')
  || rows?.find((item) => item.status === 'published');

export async function loadHerzlGrounding(admin: SupabaseClient, request: HerzlRequest): Promise<HerzlGrounding | null> {
  const { data: organization, error: organizationError } = await admin.from('organizations').select('id,name').eq('slug', request.organization).in('status', ['trial','active']).maybeSingle();
  if (organizationError) throw organizationError;
  if (!organization) return null;

  const [citiesResult, toursResult, stopsResult, assignmentsResult, sourceResult] = await Promise.all([
    admin.from('cities').select('id,slug,country_name,status,city_translations(language,name,subtitle,description,status)').eq('organization_id', organization.id).eq('status','published'),
    admin.from('tours').select('id,slug,city_id,status,tour_translations(language,title,subtitle,overview,status)').eq('organization_id', organization.id).eq('status','published'),
    admin.from('stops').select('id,slug,city_id,address,historical_period,status,stop_translations(language,title,short_description,narrative,audio_transcript,status)').eq('organization_id', organization.id).eq('status','published'),
    admin.from('tour_stops').select('tour_id,stop_id,position').eq('organization_id', organization.id),
    admin.from('ai_sources').select('id,name,url,citation_label,author,publisher,publication_date,evidence_text,scope_type,city_id,tour_id,stop_id').eq('organization_id', organization.id).eq('status','published').order('updated_at',{ ascending:false }).limit(30),
  ]);
  const error = citiesResult.error || toursResult.error || stopsResult.error || assignmentsResult.error || sourceResult.error;
  if (error) throw error;

  const cities = citiesResult.data || [];
  const tours = toursResult.data || [];
  const stops = stopsResult.data || [];
  const requestedCity = cities.find((item: any) => item.id === request.cityId || item.slug === request.cityId);
  const selectedTour = request.tourId
    ? tours.find((item: any) => item.id === request.tourId || item.slug === request.tourId)
    : undefined;
  const selectedCity = requestedCity || cities.find((item: any) => item.id === selectedTour?.city_id);
  const selectedCityId = selectedCity?.id || selectedTour?.city_id;
  const tourMatchesRequestedCity = !request.tourId || !request.cityId
    || Boolean(requestedCity && selectedTour && selectedTour.city_id === requestedCity.id);
  const stopIds = new Set((assignmentsResult.data || []).filter((item: any) => item.tour_id === selectedTour?.id).sort((a: any,b: any) => a.position-b.position).map((item: any) => item.stop_id));
  const selectedStops = stops.filter((item: any) => stopIds.has(item.id)).slice(0, 12);

  const blocks: string[] = [];
  if (selectedCity) {
    const text: any = chooseTranslation(selectedCity.city_translations, request.language);
    blocks.push(`PUBLISHED CITY\nName: ${text?.name || selectedCity.slug}\nCountry: ${selectedCity.country_name}\nOverview: ${text?.description || text?.subtitle || ''}`);
  }
  if (selectedTour) {
    const text: any = chooseTranslation(selectedTour.tour_translations, request.language);
    blocks.push(`PUBLISHED TOUR\nTitle: ${text?.title || selectedTour.slug}\nOverview: ${text?.overview || text?.subtitle || ''}`);
  }
  for (const stop of selectedStops) {
    const text: any = chooseTranslation(stop.stop_translations, request.language);
    blocks.push(`PUBLISHED STOP\nTitle: ${text?.title || stop.slug}\nAddress: ${stop.address || ''}\nPeriod: ${stop.historical_period || ''}\nDescription: ${text?.narrative || text?.short_description || ''}`);
  }

  const applicable = (sourceResult.data || []).filter((source: any) => source.scope_type === 'organization'
    || (source.scope_type === 'city' && source.city_id === selectedCityId)
    || (source.scope_type === 'tour' && source.tour_id === selectedTour?.id)
    || (source.scope_type === 'stop' && stopIds.has(source.stop_id))).filter((source: any) => Boolean(source.evidence_text?.trim())).slice(0, 8);
  const citations = applicable.map((source: any, index: number) => ({ marker: `S${index + 1}`, title: source.citation_label || source.name, url: source.url || '' }));
  for (const [index, source] of applicable.entries()) {
    blocks.push(`[S${index + 1}] APPROVED SOURCE EVIDENCE\nCitation: ${source.citation_label}\nAuthor: ${source.author || ''}\nPublisher: ${source.publisher || ''}\nDate: ${source.publication_date || ''}\nURL: ${source.url || ''}\nEvidence: ${String(source.evidence_text).slice(0, 5000)}`);
  }

  const context = blocks.join('\n\n').slice(0, 14_000);
  return {
    context,
    citations,
    organizationId: organization.id,
    selectedCityId: selectedCityId || null,
    selectedTourId: selectedTour?.id || null,
    tourMatchesRequestedCity,
    selectedStopCount: selectedStops.length,
  };
}

export function citedHerzlSources(text: string, citations: HerzlCitation[]) {
  return citations.filter((source) => new RegExp(`\\[${source.marker}\\]`, 'i').test(text)).map(({ title, url }) => ({ title, url })).slice(0, 5);
}

export async function reserveHerzlDailyRequest(admin: SupabaseClient, event: {
  organizationId: string; userId: string; provider: string; model: string; dailyLimit: number; requestCharacters: number;
}): Promise<HerzlBudgetReservation> {
  const { data, error } = await admin.rpc('reserve_ai_daily_request', {
    p_organization_id: event.organizationId,
    p_user_id: event.userId,
    p_provider: event.provider,
    p_model: event.model,
    p_daily_limit: event.dailyLimit,
    p_request_characters: event.requestCharacters,
  });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== 'boolean') throw new Error('AI daily budget reservation returned an invalid response.');
  return {
    allowed: row.allowed,
    requestId: typeof row.request_id === 'string' ? row.request_id : null,
    used: Number(row.used || 0),
    remaining: Number(row.remaining || 0),
  };
}

export async function recordHerzlUsage(admin: SupabaseClient, event: {
  organizationId: string; userId: string | null; requestId?: string | null; provider: string; model: string; mode: 'simulator' | 'live'; status: 'succeeded' | 'rejected' | 'failed'; requestCharacters: number; errorCode?: string;
}) {
  const { error } = await admin.from('ai_usage_events').insert({
    organization_id: event.organizationId, user_id: event.userId, provider: event.provider, model: event.model, mode: event.mode,
    ...(event.requestId ? { request_id: event.requestId } : {}),
    status: event.status, request_characters: event.requestCharacters, error_code: event.errorCode || null,
  });
  if (error) console.error('AI usage record failed:', error.message);
}
