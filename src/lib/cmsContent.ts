import { apiUrl } from './api';
import { COUNTRIES } from '../data/countries';
import { ContentLanguage, ContentStatus, HeritageSite, HeritageSiteTranslation, SiteCategory, TourCity, TourSummary } from '../types';
import { AccountContext, OrganizationRole, supabase } from './supabase';
import { normalizePronunciations } from './pronunciation';

export type ContentKind = 'city' | 'tour' | 'stop';

export interface CmsOrganization {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole | 'super_admin';
}

export interface CmsReviewItem {
  id: string;
  organizationId: string;
  contentKind: ContentKind;
  contentId: string;
  revisionNumber: number;
  snapshot: Record<string, unknown>;
  status: ContentStatus;
  submittedAt: string | null;
  revisesPublishedContent: boolean;
}

export interface CmsMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'quarantined';
  notes?: string;
  rightsStatus: CmsImageRights['rightsStatus'];
  creatorName?: string;
  sourceUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  attributionText?: string;
  rightsNotes?: string;
  createdAt: string;
}

export interface CmsImageRights {
  rightsStatus: 'unknown' | 'own_work' | 'public_domain' | 'cc_by' | 'cc_by_sa' | 'permission_granted' | 'other_licensed';
  creatorName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
  attributionText: string;
  rightsNotes: string;
}

export interface CmsNarrationItem {
  id: string;
  stopId?: string;
  language: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  provider: string;
  model: string;
  voice: string;
  speakingRate: number;
  sourceCharacters: number;
  durationSeconds?: number;
  sourceType: 'provider_generated' | 'kokoro_tts' | 'human_recording' | 'other_tts';
  pronunciations: HeritageSiteTranslation['pronunciations'];
  originalFilename?: string;
  url?: string;
  status: 'generated' | 'pending_review' | 'changes_requested' | 'approved' | 'published' | 'failed' | 'superseded';
  reviewNotes?: string;
  createdAt: string;
}

export interface CmsArchivedItem {
  id: string;
  kind: ContentKind;
  name: string;
  cityId?: string;
  archivedAt?: string;
}

export type AiSourceStatus = 'draft' | 'pending_review' | 'changes_requested' | 'published' | 'disabled';
export type AiSourceScope = 'organization' | 'city' | 'tour' | 'stop';

export interface CmsAiSource {
  id: string;
  organizationId: string;
  name: string;
  sourceType: 'institution' | 'web' | 'document' | 'book' | 'article' | 'archive';
  url: string;
  citationLabel: string;
  author: string;
  publisher: string;
  publicationDate: string;
  rightsStatus: 'public_domain' | 'licensed' | 'permission_granted' | 'link_only' | 'unknown';
  verificationNotes: string;
  evidenceText: string;
  scopeType: AiSourceScope;
  cityId?: string;
  tourId?: string;
  stopId?: string;
  status: AiSourceStatus;
  reviewNotes?: string;
  updatedAt?: string;
}

export interface CmsTourRating {
  id: string;
  organizationId: string;
  tourId: string;
  userId: string;
  rating: number;
  status: 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';
  revision: number;
  submittedAt: string;
  reviewNotes?: string;
}

export interface CmsTourComment {
  id: string;
  organizationId: string;
  tourId: string;
  stopId?: string;
  userId: string;
  body: string;
  status: 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';
  revision: number;
  submittedAt: string;
  reviewNotes?: string;
}

export interface CmsCommunityBan {
  id: string;
  organizationId: string;
  userId: string;
  reason: string;
  bannedBy: string;
  startsAt: string;
  expiresAt?: string;
  liftedAt?: string;
  liftedBy?: string;
  liftReason?: string;
}

export interface CmsHeritageStory {
  id: string;
  organizationId: string;
  tourId: string;
  userId: string;
  originalLanguage: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  title: string;
  body: string;
  attributionMode: 'anonymous' | 'display_name';
  status: 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'withdrawn';
  revision: number;
  publishedRevision?: number;
  submittedAt?: string;
  reviewNotes?: string;
  media: Array<{ path: string; url?: string; position: number }>;
}

export interface CmsContentData {
  cities: TourCity[];
  tours: TourSummary[];
  sites: HeritageSite[];
  reviewItems: CmsReviewItem[];
  archivedReviewItems: CmsReviewItem[];
  mediaItems: CmsMediaItem[];
  narrationItems: CmsNarrationItem[];
  archivedItems: CmsArchivedItem[];
  aiSources: CmsAiSource[];
  tourRatings: CmsTourRating[];
  tourComments: CmsTourComment[];
  heritageStories: CmsHeritageStory[];
  communityBans: CmsCommunityBan[];
}

export interface UploadedCmsImage {
  mediaId: string;
  url: string;
}

export interface CmsLicensedMediaImport {
  stopRef: string;
  cityName: string;
  stopName: string;
  imageUrl: string;
  originalFilename: string;
  rights: CmsImageRights;
}

export interface CmsNarrationVoice {
  id: string;
  language: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  label: string;
  style: string;
}

export interface CmsNarrationConfig {
  mode: 'simulator' | 'live';
  provider: string;
  model: string;
  maxCharactersPerRequest: number;
  liveConfigured: boolean;
  languages: Array<CmsNarrationVoice['language']>;
  voices: CmsNarrationVoice[];
}

async function cmsAuthenticatedRequest(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) fail('Sign in again before using CMS narration.');
  const response = await fetch(apiUrl(path), { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) fail(body.error || 'The narration service is unavailable.');
  return body;
}

export async function loadCmsNarrationConfig(): Promise<CmsNarrationConfig> {
  return cmsAuthenticatedRequest('/api/admin/narration/config');
}

export async function previewCmsNarration(input: { organizationId: string; stopId?: string; language: CmsNarrationVoice['language']; voice: string; speakingRate: number; transcript: string; pronunciations: HeritageSiteTranslation['pronunciations'] }) {
  return cmsAuthenticatedRequest('/api/admin/narration/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }) as Promise<{ audioUrl: string | null; mode: 'simulator' | 'live'; cached: boolean; message?: string; assetId?: string; status?: string }>;
}

export async function previewCmsRevisionPronunciation(input: { revisionId: string; language: CmsNarrationVoice['language']; phrase: string; voice: string }) {
  return cmsAuthenticatedRequest('/api/admin/narration/pronunciation-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }) as Promise<{ audioUrl: string; reviewEventId: string; cached: boolean; mode: 'live'; message: string }>;
}

export async function completeCmsRevisionPronunciation(reviewEventId: string) {
  return cmsAuthenticatedRequest('/api/admin/narration/pronunciation-preview/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewEventId }),
  }) as Promise<{ completed: true; completedAt: string }>;
}

const sha256Text = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.trim()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function uploadCmsNarrationAudio(input: {
  organizationId: string;
  stopId: string;
  language: CmsNarrationVoice['language'];
  sourceType: 'kokoro_tts' | 'human_recording' | 'other_tts';
  model: string;
  voice: string;
  speakingRate: number;
  transcript: string;
  pronunciations: HeritageSiteTranslation['pronunciations'];
  file: File;
}) {
  const extension = input.file.name.split('.').pop()?.toLowerCase();
  if (!extension || !['mp3', 'wav'].includes(extension)) fail('Choose an MP3 or WAV audio file.');
  const maximumBytes = extension === 'wav' ? 30 * 1024 * 1024 : 15 * 1024 * 1024;
  if (input.file.size < 512 || input.file.size > maximumBytes) fail(`The ${extension.toUpperCase()} must be between 512 bytes and ${extension === 'wav' ? 30 : 15} MB.`);
  const transcriptHash = await sha256Text(input.transcript);
  return cmsAuthenticatedRequest('/api/admin/narration/upload', {
    method: 'POST',
    headers: {
      'Content-Type': extension === 'wav' ? 'audio/wav' : 'audio/mpeg',
      'X-Organization-Id': input.organizationId,
      'X-Stop-Id': input.stopId,
      'X-Narration-Language': input.language,
      'X-Narration-Source': input.sourceType,
      'X-Narration-Model': encodeURIComponent(input.model),
      'X-Narration-Voice': encodeURIComponent(input.voice),
      'X-Speaking-Rate': String(input.speakingRate),
      'X-Transcript-Sha256': transcriptHash,
      'X-Pronunciation-Guide': encodeURIComponent(JSON.stringify(normalizePronunciations(input.pronunciations, input.transcript))),
      'X-Original-Filename': encodeURIComponent(input.file.name),
    },
    body: input.file,
  }) as Promise<{ audioUrl: string | null; assetId: string; status: string; cached: boolean; sourceType: string; format?: string; message?: string }>;
}

const fail = (message: string): never => { throw new Error(message); };
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
const interestAliases: Partial<Record<SiteCategory, SiteCategory>> = {
  bridge: 'historic_sites', historic_site: 'historic_sites', memorial: 'monument',
};
const dbInterest = (value: SiteCategory) => interestAliases[value] || value;
const countryCode = (countryName: string) => COUNTRIES.find((country) => country.name === countryName)?.code || 'ZZ';
const first = <T>(value: T | T[] | null | undefined): T | undefined => Array.isArray(value) ? value[0] : value || undefined;

const signedMediaUrls = async (rows: Array<{ id: string; object_path: string }>) => {
  const result = new Map<string, string>();
  await Promise.all(rows.map(async (row) => {
    const { data } = await supabase.storage.from('tour-media').createSignedUrl(row.object_path, 3600);
    if (data?.signedUrl) result.set(row.id, data.signedUrl);
  }));
  return result;
};

export async function listCmsOrganizations(account: AccountContext): Promise<CmsOrganization[]> {
  if (account.profile.platform_role === 'super_admin') {
    const { data, error } = await supabase.from('organizations').select('id,name,slug').in('status',['trial','active']).order('name');
    if (error) fail(error.message);
    return (data || []).map((organization) => ({ ...organization, role: 'super_admin' as const }));
  }
  return account.memberships
    .filter((membership) => membership.status === 'active' && membership.organizations)
    .map((membership) => ({
      id: membership.organization_id,
      name: membership.organizations!.name,
      slug: membership.organizations!.slug,
      role: membership.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadCmsContent(organizationId: string): Promise<CmsContentData> {
  const [cityResult, tourResult, stopResult, assignmentResult, mediaResult, narrationResult, revisionResult, archivedCityResult, archivedTourResult, archivedStopResult, aiSourceResult, ratingResult, commentResult, storyResult, storyMediaResult, banResult] = await Promise.all([
    supabase.from('cities').select('id,organization_id,slug,country_name,flag_emoji,center_latitude,center_longitude,hero_media_id,status,city_translations(name,subtitle,description,language)').eq('organization_id', organizationId).neq('status', 'archived'),
    supabase.from('tours').select('id,organization_id,city_id,slug,estimated_duration_minutes,distance_metres,difficulty,wheelchair_accessible,access_mode,hero_media_id,status,tour_translations(title,subtitle,overview,completion_message,language)').eq('organization_id', organizationId).neq('status', 'archived'),
    supabase.from('stops').select('id,organization_id,city_id,slug,interest,address,latitude,longitude,hero_media_id,audio_duration_seconds,historical_period,status,stop_translations(title,native_name,short_description,narrative,audio_transcript,pronunciation_guide,language)').eq('organization_id', organizationId).neq('status', 'archived'),
    supabase.from('tour_stops').select('tour_id,stop_id,position').eq('organization_id', organizationId),
    supabase.from('media_assets').select('id,object_path,original_filename,mime_type,byte_size,validation_status,validation_notes,rights_status,creator_name,source_url,license_name,license_url,attribution_text,rights_notes,created_at').eq('organization_id', organizationId).is('deleted_at', null),
    supabase.from('narration_assets').select('id,stop_id,language,provider,model,voice_name,speaking_rate,source_characters,duration_seconds,source_type,original_filename,pronunciation_guide,storage_bucket,object_path,status,review_notes,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('content_revisions').select('id,organization_id,content_kind,content_id,revision_number,snapshot,status,submitted_at,revises_published_content').eq('organization_id', organizationId).in('status', ['pending_review', 'approved', 'archived']).order('submitted_at', { ascending: true }),
    supabase.from('cities').select('id,archived_at,city_translations(name,language)').eq('organization_id', organizationId).eq('status', 'archived'),
    supabase.from('tours').select('id,city_id,archived_at,tour_translations(title,language)').eq('organization_id', organizationId).eq('status', 'archived'),
    supabase.from('stops').select('id,city_id,archived_at,stop_translations(title,language)').eq('organization_id', organizationId).eq('status', 'archived'),
    supabase.from('ai_sources').select('id,organization_id,name,source_type,url,citation_label,author,publisher,publication_date,rights_status,verification_notes,evidence_text,scope_type,city_id,tour_id,stop_id,status,review_notes,updated_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    supabase.from('tour_ratings').select('id,organization_id,tour_id,user_id,rating,status,revision,submitted_at,review_notes').eq('organization_id', organizationId).order('submitted_at', { ascending: true }),
    supabase.from('tour_comments').select('id,organization_id,tour_id,stop_id,user_id,body,status,revision,submitted_at,review_notes').eq('organization_id', organizationId).order('submitted_at', { ascending: true }),
    supabase.from('heritage_stories').select('id,organization_id,tour_id,user_id,original_language,title,body,attribution_mode,status,revision,published_revision,submitted_at,review_notes').eq('organization_id', organizationId).order('submitted_at', { ascending: true }),
    supabase.from('heritage_story_media').select('story_id,revision,position,object_path').eq('organization_id', organizationId).order('position'),
    supabase.from('community_user_bans').select('id,organization_id,user_id,reason,banned_by,starts_at,expires_at,lifted_at,lifted_by,lift_reason').eq('organization_id', organizationId).order('starts_at', { ascending: false }),
  ]);
  const error = cityResult.error || tourResult.error || stopResult.error || assignmentResult.error || mediaResult.error || narrationResult.error || revisionResult.error || archivedCityResult.error || archivedTourResult.error || archivedStopResult.error || aiSourceResult.error || ratingResult.error || commentResult.error || storyResult.error || storyMediaResult.error || banResult.error;
  if (error) fail(error.message);

  const mediaUrls = await signedMediaUrls(mediaResult.data || []);
  const mediaById = new Map((mediaResult.data || []).map((item) => [item.id, item]));
  const narrationUrls = new Map<string, string>();
  await Promise.all((narrationResult.data || []).map(async (row) => {
    const { data } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.object_path, 3600);
    if (data?.signedUrl) narrationUrls.set(row.id, data.signedUrl);
  }));
  const storyMediaUrls = new Map<string, string>();
  await Promise.all((storyMediaResult.data || []).map(async (row) => {
    const { data } = await supabase.storage.from('heritage-story-media').createSignedUrl(row.object_path, 3600);
    if (data?.signedUrl) storyMediaUrls.set(row.object_path, data.signedUrl);
  }));
  const tourRows = tourResult.data || [];
  const activeTourIds = new Set(tourRows.map((row)=>row.id));
  const assignments = new Map<string, Array<{ tour_id: string; stop_id: string; position: number }>>();
  for (const row of assignmentResult.data || []) if (activeTourIds.has(row.tour_id)) assignments.set(row.stop_id, [...(assignments.get(row.stop_id) || []), row]);
  const cityNames = new Map<string, string>();
  const cities = (cityResult.data || []).map((row) => {
    const translation = first((row.city_translations || []).filter((item) => item.language === 'en')) || first(row.city_translations);
    const tour = tourRows.find((item) => item.city_id === row.id);
    const tourTranslation = first((tour?.tour_translations || []).filter((item) => item.language === 'en')) || first(tour?.tour_translations);
    const name = translation?.name || row.slug;
    const media = row.hero_media_id ? mediaById.get(row.hero_media_id) : undefined;
    cityNames.set(row.id, name);
    return {
      id: row.id,
      name,
      country: row.country_name,
      flagEmoji: row.flag_emoji || '',
      subtitle: tourTranslation?.subtitle || translation?.subtitle || '',
      description: tourTranslation?.overview || translation?.description || '',
      centerLat: row.center_latitude,
      centerLng: row.center_longitude,
      imageUrl: row.hero_media_id ? mediaUrls.get(row.hero_media_id) : undefined,
      imageCredit: media?.attribution_text || undefined,
      imageSourceUrl: media?.source_url || undefined,
      imageLicenseName: media?.license_name || undefined,
      imageLicenseUrl: media?.license_url || undefined,
      imageMediaId: row.hero_media_id || undefined,
      tourId: tour?.id,
      organizationId: row.organization_id,
      status: (tour?.status || row.status) as ContentStatus,
    } satisfies TourCity;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const tours: TourSummary[] = tourRows.map((row) => {
    const translation = first((row.tour_translations || []).filter((item) => item.language === 'en')) || first(row.tour_translations);
    const media = row.hero_media_id ? mediaById.get(row.hero_media_id) : undefined;
    return {
      id: row.id,
      cityId: row.city_id,
      title: translation?.title || row.slug,
      subtitle: translation?.subtitle || '',
      overview: translation?.overview || '',
      completionMessage: translation?.completion_message || '',
      imageUrl: row.hero_media_id ? mediaUrls.get(row.hero_media_id) : undefined,
      imageCredit: media?.attribution_text || undefined,
      imageSourceUrl: media?.source_url || undefined,
      imageLicenseName: media?.license_name || undefined,
      imageLicenseUrl: media?.license_url || undefined,
      imageMediaId: row.hero_media_id || undefined,
      estimatedDurationMinutes: row.estimated_duration_minutes || undefined,
      distanceMetres: row.distance_metres || undefined,
      difficulty: row.difficulty,
      wheelchairAccessible: row.wheelchair_accessible,
      accessMode: row.access_mode,
      organizationId: row.organization_id,
      status: row.status as ContentStatus,
    };
  }).sort((a, b) => a.title.localeCompare(b.title));

  const sites = (stopResult.data || []).map((row) => {
    const translation = first((row.stop_translations || []).filter((item) => item.language === 'en')) || first(row.stop_translations);
    const translations = Object.fromEntries((row.stop_translations || []).map((item) => [item.language, {
      title: item.title || '',
      nativeName: item.native_name || '',
      shortDescription: item.short_description || '',
      fullDescription: item.narrative || '',
      transcript: item.audio_transcript || '',
      pronunciations: Array.isArray(item.pronunciation_guide) ? item.pronunciation_guide : [],
    }])) as Partial<Record<ContentLanguage, HeritageSiteTranslation>>;
    const stopAssignments = assignments.get(row.id) || [];
    const assignment = stopAssignments[0];
    const media = row.hero_media_id ? mediaById.get(row.hero_media_id) : undefined;
    return {
      id: row.id,
      name: translation?.title || row.slug,
      hebrewName: translation?.native_name || '',
      category: row.interest as SiteCategory,
      cityId: row.city_id,
      cityName: cityNames.get(row.city_id) || '',
      lat: row.latitude,
      lng: row.longitude,
      address: row.address || '',
      shortDescription: translation?.short_description || '',
      fullDescription: translation?.narrative || '',
      audioDuration: row.audio_duration_seconds || 0,
      transcript: translation?.audio_transcript || '',
      historicalPeriod: row.historical_period || '',
      imageUrl: row.hero_media_id ? mediaUrls.get(row.hero_media_id) || '' : '',
      imageCredit: media?.attribution_text || undefined,
      imageSourceUrl: media?.source_url || undefined,
      imageLicenseName: media?.license_name || undefined,
      imageLicenseUrl: media?.license_url || undefined,
      imageMediaId: row.hero_media_id || undefined,
      tags: [row.interest],
      keyFacts: [],
      tourId: assignment?.tour_id,
      tourOrder: assignment?.position,
      tourAssignments: stopAssignments.map((item) => ({ tourId: item.tour_id, position: item.position })),
      organizationId: row.organization_id,
      status: row.status as ContentStatus,
      translations,
    } satisfies HeritageSite;
  });

  return {
    cities,
    tours,
    sites,
    reviewItems: (revisionResult.data || []).filter((row) => row.status !== 'archived').map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      contentKind: row.content_kind as ContentKind,
      contentId: row.content_id,
      revisionNumber: row.revision_number,
      snapshot: row.snapshot as Record<string, unknown>,
      status: row.status as ContentStatus,
      submittedAt: row.submitted_at,
      revisesPublishedContent: row.revises_published_content,
    })),
    archivedReviewItems: (revisionResult.data || []).filter((row) => row.status === 'archived').map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      contentKind: row.content_kind as ContentKind,
      contentId: row.content_id,
      revisionNumber: row.revision_number,
      snapshot: row.snapshot as Record<string, unknown>,
      status: row.status as ContentStatus,
      submittedAt: row.submitted_at,
      revisesPublishedContent: row.revises_published_content,
    })),
    mediaItems: (mediaResult.data || []).map((row) => ({
      id: row.id,
      filename: row.original_filename,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      url: mediaUrls.get(row.id),
      status: row.validation_status,
      notes: row.validation_notes || undefined,
      rightsStatus: row.rights_status as CmsImageRights['rightsStatus'],
      creatorName: row.creator_name || undefined,
      sourceUrl: row.source_url || undefined,
      licenseName: row.license_name || undefined,
      licenseUrl: row.license_url || undefined,
      attributionText: row.attribution_text || undefined,
      rightsNotes: row.rights_notes || undefined,
      createdAt: row.created_at,
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    narrationItems: (narrationResult.data || []).map((row) => ({
      id: row.id,
      stopId: row.stop_id || undefined,
      language: row.language,
      provider: row.provider,
      model: row.model,
      voice: row.voice_name,
      speakingRate: Number(row.speaking_rate),
      sourceCharacters: row.source_characters,
      durationSeconds: row.duration_seconds == null ? undefined : Number(row.duration_seconds),
      sourceType: row.source_type,
      pronunciations: Array.isArray(row.pronunciation_guide) ? row.pronunciation_guide : [],
      originalFilename: row.original_filename || undefined,
      url: narrationUrls.get(row.id),
      status: row.status,
      reviewNotes: row.review_notes || undefined,
      createdAt: row.created_at,
    } as CmsNarrationItem)),
    archivedItems: [
      ...(archivedCityResult.data || []).map((row) => { const translation=first((row.city_translations || []).filter((item)=>item.language==='en')) || first(row.city_translations); return { id:row.id,kind:'city' as const,name:translation?.name || 'Archived city',archivedAt:row.archived_at || undefined }; }),
      ...(archivedTourResult.data || []).map((row) => { const translation=first((row.tour_translations || []).filter((item)=>item.language==='en')) || first(row.tour_translations); return { id:row.id,kind:'tour' as const,name:translation?.title || 'Archived tour',cityId:row.city_id,archivedAt:row.archived_at || undefined }; }),
      ...(archivedStopResult.data || []).map((row) => { const translation=first((row.stop_translations || []).filter((item)=>item.language==='en')) || first(row.stop_translations); return { id:row.id,kind:'stop' as const,name:translation?.title || 'Archived stop',cityId:row.city_id,archivedAt:row.archived_at || undefined }; }),
    ].sort((a,b)=>a.name.localeCompare(b.name)),
    aiSources: (aiSourceResult.data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      sourceType: row.source_type,
      url: row.url || '',
      citationLabel: row.citation_label,
      author: row.author || '',
      publisher: row.publisher || '',
      publicationDate: row.publication_date || '',
      rightsStatus: row.rights_status,
      verificationNotes: row.verification_notes || '',
      evidenceText: row.evidence_text || '',
      scopeType: row.scope_type,
      cityId: row.city_id || undefined,
      tourId: row.tour_id || undefined,
      stopId: row.stop_id || undefined,
      status: row.status,
      reviewNotes: row.review_notes || undefined,
      updatedAt: row.updated_at,
    } as CmsAiSource)),
    tourRatings: (ratingResult.data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      tourId: row.tour_id,
      userId: row.user_id,
      rating: row.rating,
      status: row.status,
      revision: row.revision,
      submittedAt: row.submitted_at,
      reviewNotes: row.review_notes || undefined,
    } as CmsTourRating)),
    tourComments: (commentResult.data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      tourId: row.tour_id,
      stopId: row.stop_id || undefined,
      userId: row.user_id,
      body: row.body,
      status: row.status,
      revision: row.revision,
      submittedAt: row.submitted_at,
      reviewNotes: row.review_notes || undefined,
    } as CmsTourComment)),
    heritageStories: (storyResult.data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      tourId: row.tour_id,
      userId: row.user_id,
      originalLanguage: row.original_language,
      title: row.title,
      body: row.body,
      attributionMode: row.attribution_mode,
      status: row.status,
      revision: row.revision,
      publishedRevision: row.published_revision || undefined,
      submittedAt: row.submitted_at || undefined,
      reviewNotes: row.review_notes || undefined,
      media: (storyMediaResult.data || []).filter((media) => media.story_id === row.id && media.revision === row.revision).map((media) => ({
        path: media.object_path, url: storyMediaUrls.get(media.object_path), position: media.position,
      })),
    } as CmsHeritageStory)),
    communityBans: (banResult.data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      reason: row.reason,
      bannedBy: row.banned_by,
      startsAt: row.starts_at,
      expiresAt: row.expires_at || undefined,
      liftedAt: row.lifted_at || undefined,
      liftedBy: row.lifted_by || undefined,
      liftReason: row.lift_reason || undefined,
    } as CmsCommunityBan)),
  };
}

export async function saveCmsAiSource(organizationId: string, userId: string, source: CmsAiSource): Promise<CmsAiSource> {
  if (!source.name.trim()) fail('Enter a source name.');
  if (!source.citationLabel.trim()) fail('Enter the citation text shown to visitors.');
  if (source.url && !/^https?:\/\//i.test(source.url)) fail('Source links must start with http:// or https://.');
  const isExisting = /^[0-9a-f-]{36}$/i.test(source.id);
  const scopeIds = {
    city_id: source.scopeType === 'city' ? source.cityId || null : null,
    tour_id: source.scopeType === 'tour' ? source.tourId || null : null,
    stop_id: source.scopeType === 'stop' ? source.stopId || null : null,
  };
  if (source.scopeType !== 'organization' && !scopeIds.city_id && !scopeIds.tour_id && !scopeIds.stop_id) fail('Choose the city, tour or stop this source supports.');
  const payload = {
    organization_id: organizationId,
    name: source.name.trim(),
    source_type: source.sourceType,
    url: source.url.trim() || null,
    citation_label: source.citationLabel.trim(),
    author: source.author.trim() || null,
    publisher: source.publisher.trim() || null,
    publication_date: source.publicationDate || null,
    rights_status: source.rightsStatus,
    verification_notes: source.verificationNotes.trim() || null,
    evidence_text: source.evidenceText.trim() || null,
    scope_type: source.scopeType,
    ...scopeIds,
    updated_by: userId,
  };
  if (isExisting) {
    const { error } = await supabase.from('ai_sources').update(payload).eq('id', source.id).eq('organization_id', organizationId);
    if (error) fail(error.message);
    return { ...source, organizationId };
  }
  const { data, error } = await supabase.from('ai_sources').insert({ ...payload, created_by: userId, status: 'draft' }).select('id').single();
  if (error || !data) fail(error?.message || 'AI source creation failed.');
  return { ...source, id: data.id, organizationId, status: 'draft' };
}

export async function submitCmsAiSource(sourceId: string) {
  const { error } = await supabase.rpc('submit_ai_source', { p_source_id: sourceId });
  if (error) fail(error.message);
}

export async function reviewCmsAiSource(sourceId: string, decision: 'published' | 'changes_requested' | 'disabled' | 'draft', notes?: string) {
  if (decision === 'changes_requested' && !notes?.trim()) fail('Explain the changes required.');
  const { error } = await supabase.rpc('review_ai_source', { p_source_id: sourceId, p_decision: decision, p_notes: notes?.trim() || null });
  if (error) fail(error.message);
}

export async function saveCmsTour(organizationId: string, userId: string, tour: TourSummary): Promise<TourSummary> {
  if (!tour.cityId) fail('Choose a city before saving the tour.');
  if (!tour.title.trim()) fail('Enter a tour title.');
  const isExisting = /^[0-9a-f-]{36}$/i.test(tour.id);
  if (isExisting && tour.status === 'published') {
    await submitCmsContent('tour', tour.id, tour as unknown as Record<string, unknown>);
    return { ...tour, organizationId, status: 'published' };
  }
  const slug = await uniqueSlug('tours', organizationId, tour.title, isExisting ? tour.id : undefined);
  const payload = {
    organization_id: organizationId,
    city_id: tour.cityId,
    slug,
    estimated_duration_minutes: tour.estimatedDurationMinutes || null,
    distance_metres: tour.distanceMetres || null,
    difficulty: tour.difficulty || 'easy',
    wheelchair_accessible: Boolean(tour.wheelchairAccessible),
    access_mode: tour.accessMode || 'free',
    hero_media_id: tour.imageMediaId || null,
    status: 'draft',
    updated_by: userId,
  };
  let tourId = tour.id;
  if (isExisting) {
    const { error } = await supabase.from('tours').update(payload).eq('id', tour.id).eq('organization_id', organizationId);
    if (error) fail(error.message);
  } else {
    const { data, error } = await supabase.from('tours').insert({ ...payload, created_by: userId }).select('id').single();
    if (error || !data) fail(error?.message || 'Tour creation failed.');
    tourId = data.id;
  }
  const { error: translationError } = await supabase.from('tour_translations').upsert({
    organization_id: organizationId,
    tour_id: tourId,
    language: 'en',
    title: tour.title.trim(),
    subtitle: tour.subtitle || null,
    overview: tour.overview || tour.subtitle || `${tour.title} heritage tour`,
    completion_message: tour.completionMessage || null,
    status: 'draft',
    created_by: userId,
    updated_by: userId,
  }, { onConflict: 'tour_id,language' });
  if (translationError) fail(translationError.message);
  return { ...tour, id: tourId, organizationId, status: 'draft' };
}

async function uniqueSlug(table: 'cities' | 'tours' | 'stops', organizationId: string, desired: string, existingId?: string) {
  const base = slugify(desired);
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix ? `${base}-${suffix + 1}` : base;
    let query = supabase.from(table).select('id').eq('organization_id', organizationId).eq('slug', candidate).limit(1);
    if (existingId) query = query.neq('id', existingId);
    const { data, error } = await query;
    if (error) fail(error.message);
    if (!data?.length) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function saveCmsCity(organizationId: string, userId: string, city: TourCity): Promise<TourCity> {
  const isExisting = /^[0-9a-f-]{36}$/i.test(city.id);
  if (isExisting && city.status === 'published') {
    await submitCmsContent('city', city.id, city as unknown as Record<string, unknown>);
    return { ...city, organizationId, status: 'published' };
  }
  const slug = await uniqueSlug('cities', organizationId, city.name, isExisting ? city.id : undefined);
  const cityPayload = {
    organization_id: organizationId, slug, country_name: city.country, country_code: countryCode(city.country), flag_emoji: city.flagEmoji,
    center_latitude: city.centerLat, center_longitude: city.centerLng, hero_media_id: city.imageMediaId || null,
    status: 'draft', updated_by: userId,
  };
  let cityId = city.id;
  if (isExisting) {
    const { error } = await supabase.from('cities').update(cityPayload).eq('id', city.id).eq('organization_id', organizationId);
    if (error) fail(error.message);
  } else {
    const { data, error } = await supabase.from('cities').insert({ ...cityPayload, created_by: userId }).select('id').single();
    if (error || !data) fail(error?.message || 'City creation failed.');
    cityId = data.id;
  }
  const { error: cityTranslationError } = await supabase.from('city_translations').upsert({
    organization_id: organizationId, city_id: cityId, language: 'en', name: city.name, subtitle: city.subtitle || null,
    description: city.description || city.subtitle || `${city.name} heritage tour`, status: 'draft', created_by: userId, updated_by: userId,
  }, { onConflict: 'city_id,language' });
  if (cityTranslationError) fail(cityTranslationError.message);

  let tourId = city.tourId;
  if (tourId) {
    const { error } = await supabase.from('tours').update({ city_id: cityId, hero_media_id: city.imageMediaId || null, status: 'draft', updated_by: userId }).eq('id', tourId).eq('organization_id', organizationId);
    if (error) fail(error.message);
  } else {
    const tourSlug = await uniqueSlug('tours', organizationId, `${city.name} heritage tour`);
    const { data, error } = await supabase.from('tours').insert({ organization_id: organizationId, city_id: cityId, slug: tourSlug, hero_media_id: city.imageMediaId || null, status: 'draft', created_by: userId, updated_by: userId }).select('id').single();
    if (error || !data) fail(error?.message || 'Tour creation failed.');
    tourId = data.id;
  }
  const { error: tourTranslationError } = await supabase.from('tour_translations').upsert({
    organization_id: organizationId, tour_id: tourId, language: 'en', title: `${city.name} Heritage Tour`, subtitle: city.subtitle || null,
    overview: city.description || city.subtitle || `${city.name} heritage tour`, status: 'draft', created_by: userId, updated_by: userId,
  }, { onConflict: 'tour_id,language' });
  if (tourTranslationError) fail(tourTranslationError.message);
  return { ...city, id: cityId, tourId, organizationId, status: 'draft' };
}

export async function saveCmsSite(organizationId: string, userId: string, site: HeritageSite): Promise<HeritageSite> {
  if (!site.cityId) fail('Choose a city before saving the stop.');
  const isExisting = /^[0-9a-f-]{36}$/i.test(site.id);
  if (isExisting && site.status === 'published') {
    const translations = { ...(site.translations || {}), en: {
      title: site.name, nativeName: site.hebrewName || '', shortDescription: site.shortDescription,
      fullDescription: site.fullDescription, transcript: site.transcript || '', pronunciations: site.translations?.en?.pronunciations || [],
    } };
    await submitCmsContent('stop', site.id, { ...site, translations, category: dbInterest(site.category) } as unknown as Record<string, unknown>);
    return { ...site, organizationId, status: 'published' };
  }
  const slug = await uniqueSlug('stops', organizationId, site.name, isExisting ? site.id : undefined);
  const stopPayload = {
    organization_id: organizationId, city_id: site.cityId, slug, interest: dbInterest(site.category), address: site.address || null,
    latitude: site.lat, longitude: site.lng, hero_media_id: site.imageMediaId || null, audio_duration_seconds: site.audioDuration || null,
    historical_period: site.historicalPeriod || null, status: 'draft', updated_by: userId,
  };
  let stopId = site.id;
  if (isExisting) {
    const { error } = await supabase.from('stops').update(stopPayload).eq('id', site.id).eq('organization_id', organizationId);
    if (error) fail(error.message);
  } else {
    const { data, error } = await supabase.from('stops').insert({ ...stopPayload, created_by: userId }).select('id').single();
    if (error || !data) fail(error?.message || 'Stop creation failed.');
    stopId = data.id;
  }
  const english: HeritageSiteTranslation = {
    title: site.name,
    nativeName: site.hebrewName || '',
    shortDescription: site.shortDescription || site.fullDescription.slice(0, 1000) || `${site.name} heritage stop`,
    fullDescription: site.fullDescription || site.shortDescription || `${site.name} heritage stop`,
    transcript: site.transcript || '',
    pronunciations: site.translations?.en?.pronunciations || [],
  };
  const rows = (['en','he','ru','fr','de','es'] as ContentLanguage[]).flatMap((language) => {
    const value = language === 'en' ? english : site.translations?.[language];
    if (!value || ![value.title,value.nativeName,value.shortDescription,value.fullDescription,value.transcript].some((item) => item.trim()) && value.pronunciations.length === 0) return [];
    if (!value.title.trim() || !value.shortDescription.trim() || !value.fullDescription.trim()) {
      fail(`${language.toUpperCase()} translation requires a title, short description and historical narrative.`);
    }
    return [{
      organization_id: organizationId, stop_id: stopId, language, title: value.title.trim(), native_name: value.nativeName.trim() || null,
      short_description: value.shortDescription.trim(), narrative: value.fullDescription.trim(), audio_transcript: value.transcript.trim() || null,
      pronunciation_guide: normalizePronunciations(value.pronunciations || [], value.transcript),
      status: 'draft', created_by: userId, updated_by: userId,
    }];
  });
  const { error: translationError } = await supabase.from('stop_translations').upsert(rows, { onConflict: 'stop_id,language' });
  if (translationError) fail(translationError.message);

  if (site.tourId) {
    const { error: assignmentError } = await supabase.from('tour_stops').upsert({
      organization_id: organizationId, tour_id: site.tourId, stop_id: stopId, position: site.tourOrder || 1,
      created_by: userId, updated_by: userId,
    }, { onConflict: 'tour_id,stop_id' });
    if (assignmentError) fail(assignmentError.message);
  }
  return { ...site, id: stopId, organizationId, status: 'draft' };
}

export async function submitCmsContent(contentKind: ContentKind, contentId: string, snapshot: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('submit_content_for_review', { p_content_kind: contentKind, p_content_id: contentId, p_snapshot: snapshot, p_source: 'human' });
  if (error) fail(error.message);
  return data as string;
}

export async function reorderCmsTourStops(tour: TourSummary, stopIds: string[]) {
  if (tour.status === 'published') {
    await submitCmsContent('tour', tour.id, { ...tour, stopOrder: stopIds } as unknown as Record<string, unknown>);
    return 'submitted' as const;
  }
  const { error } = await supabase.rpc('reorder_tour_stops', { p_tour_id: tour.id, p_stop_ids: stopIds });
  if (error) fail(error.message);
  return 'saved' as const;
}

export async function replaceCmsTourStops(tour: TourSummary, stopIds: string[]) {
  if (tour.status === 'published') {
    await submitCmsContent('tour', tour.id, { ...tour, stopOrder: stopIds } as unknown as Record<string, unknown>);
    return 'submitted' as const;
  }
  const { error } = await supabase.rpc('replace_tour_stops', { p_tour_id: tour.id, p_stop_ids: stopIds });
  if (error) fail(error.message);
  return 'saved' as const;
}

export async function reviewCmsRevision(item: CmsReviewItem, userId: string, decision: 'approved' | 'changes_requested', notes?: string) {
  const { error } = await supabase.from('review_decisions').insert({ organization_id: item.organizationId, revision_id: item.id, decision, notes: notes || null, reviewer_user_id: userId });
  if (error) fail(error.message);
}

export async function amendCmsRevision(revisionId: string, snapshot: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('amend_pending_content_revision', { p_revision_id: revisionId, p_snapshot: snapshot });
  if (error) fail(error.message);
  return data as string;
}

export async function publishCmsRevision(revisionId: string) {
  const { error } = await supabase.rpc('publish_content_revision', { p_revision_id: revisionId });
  if (error) fail(error.message);
}

export async function reviewCmsMedia(mediaId: string, userId: string, decision: 'approved' | 'rejected', notes?: string) {
  if (decision === 'rejected' && !notes?.trim()) fail('Enter a reason before rejecting media.');
  const { error } = await supabase.from('media_assets').update({
    validation_status: decision,
    validation_notes: notes?.trim() || null,
    validated_by: userId,
    validated_at: new Date().toISOString(),
  }).eq('id', mediaId);
  if (error) fail(error.message);
}

export async function reviewCmsNarration(assetId: string, decision: 'pending_review' | 'approved' | 'changes_requested' | 'published' | 'superseded' | 'generated', notes?: string) {
  if (decision === 'changes_requested' && !notes?.trim()) fail('Enter a reason before requesting narration changes.');
  const { error } = await supabase.rpc('review_narration_asset', { p_asset_id: assetId, p_decision: decision, p_notes: notes?.trim() || null });
  if (error) fail(error.message);
}

export async function archiveCmsRevision(revisionId: string) {
  const { error } = await supabase.rpc('archive_content_revision', { p_revision_id: revisionId });
  if (error) fail(error.message);
}

export async function restoreCmsRevision(revisionId: string) {
  const { error } = await supabase.rpc('restore_content_revision', { p_revision_id: revisionId });
  if (error) fail(error.message);
}

export async function archiveCmsContent(contentKind: ContentKind, contentId: string) {
  const { error } = await supabase.rpc('archive_content', { p_content_kind: contentKind, p_content_id: contentId });
  if (error) fail(error.message);
}

export async function restoreCmsContent(contentKind: ContentKind, contentId: string) {
  const { error } = await supabase.rpc('restore_content', { p_content_kind: contentKind, p_content_id: contentId });
  if (error) fail(error.message);
}

export async function uploadCmsImage(organizationId: string, _userId: string, file: File, rights: CmsImageRights): Promise<UploadedCmsImage> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) fail('Choose a JPEG, PNG, WebP or GIF image.');
  if (file.size > 8 * 1024 * 1024) fail('Images must be 8 MB or smaller.');
  if (rights.rightsStatus === 'unknown') fail('Choose the image rights status before uploading.');
  if (!rights.attributionText.trim()) fail('Enter the exact public image credit before uploading.');
  if (['cc_by', 'cc_by_sa', 'other_licensed'].includes(rights.rightsStatus)
    && (!rights.sourceUrl.trim() || !rights.licenseName.trim() || !rights.licenseUrl.trim())) {
    fail('Licensed images require a source page, licence name and licence URL.');
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) fail('Sign in again before uploading.');
  const response = await fetch(apiUrl('/api/admin/media'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type,
      'X-Organization-Id': organizationId,
      'X-File-Name': encodeURIComponent(file.name),
      'X-Media-Rights-Status': rights.rightsStatus,
      'X-Media-Creator': encodeURIComponent(rights.creatorName.trim()),
      'X-Media-Source-Url': encodeURIComponent(rights.sourceUrl.trim()),
      'X-Media-License-Name': encodeURIComponent(rights.licenseName.trim()),
      'X-Media-License-Url': encodeURIComponent(rights.licenseUrl.trim()),
      'X-Media-Attribution': encodeURIComponent(rights.attributionText.trim()),
      'X-Media-Rights-Notes': encodeURIComponent(rights.rightsNotes.trim()),
    },
    body: file,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) fail(body.error || 'Image upload failed.');
  return { mediaId: body.mediaId, url: body.url };
}

export async function importCmsLicensedImage(organizationId: string, stopId: string, media: CmsLicensedMediaImport): Promise<UploadedCmsImage> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) fail('Sign in again before importing licensed media.');
  const response = await fetch(apiUrl('/api/admin/media/import-url'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, stopId, ...media }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) fail(body.error || `Image import failed for ${media.stopName}.`);
  return { mediaId: body.mediaId, url: body.url };
}
