import { createHash } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';

const LANGUAGES = new Set(['en', 'he', 'ru', 'fr', 'de', 'es']);
const ORGANIZATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CACHE_TTL_MS = 60_000;

type CachedPayload = { expiresAt: number; etag: string; payload: Record<string, unknown> };
const responseCache = new Map<string, CachedPayload>();

function chooseTranslation<T extends { language: string }>(rows: T[] | null | undefined, language: string) {
  return rows?.find((row) => row.language === language)
    || rows?.find((row) => row.language === 'en')
    || rows?.[0];
}

async function signedMediaUrls(admin: SupabaseClient, rows: Array<{ id: string; storage_bucket: string; object_path: string }>) {
  const urls = new Map<string, string>();
  await Promise.all(rows.map(async (row) => {
    const { data, error } = await admin.storage.from(row.storage_bucket).createSignedUrl(row.object_path, 3600);
    if (!error && data?.signedUrl) urls.set(row.id, data.signedUrl);
  }));
  return urls;
}

function publicImageUrl(organization: string, mediaId: string | null | undefined) {
  return mediaId ? `/api/public/media/${encodeURIComponent(mediaId)}?organization=${encodeURIComponent(organization)}` : undefined;
}

export async function loadPublishedContent(admin: SupabaseClient, organizationSlug: string, language: string) {
  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .select('id,name,slug,status')
    .eq('slug', organizationSlug)
    .in('status', ['trial', 'active'])
    .maybeSingle();
  if (organizationError) throw organizationError;
  if (!organization) return null;

  const organizationId = organization.id;
  const [cityResult, tourResult, stopResult, assignmentResult, mediaResult, narrationResult] = await Promise.all([
    admin.from('cities')
      .select('id,organization_id,slug,country_name,flag_emoji,center_latitude,center_longitude,hero_media_id,status,city_translations(language,name,subtitle,description,status)')
      .eq('organization_id', organizationId).eq('status', 'published'),
    admin.from('tours')
      .select('id,organization_id,city_id,slug,estimated_duration_minutes,distance_metres,difficulty,wheelchair_accessible,access_mode,hero_media_id,status,tour_translations(language,title,subtitle,overview,status)')
      .eq('organization_id', organizationId).eq('status', 'published'),
    admin.from('stops')
      .select('id,organization_id,city_id,slug,interest,address,latitude,longitude,hero_media_id,audio_duration_seconds,historical_period,status,stop_translations(language,title,native_name,short_description,narrative,audio_transcript,status)')
      .eq('organization_id', organizationId).eq('status', 'published'),
    admin.from('tour_stops').select('tour_id,stop_id,position').eq('organization_id', organizationId),
    admin.from('media_assets').select('id,storage_bucket,object_path,source_url,license_name,license_url,attribution_text').eq('organization_id', organizationId).eq('validation_status', 'approved').is('deleted_at', null),
    admin.from('narration_assets').select('id,stop_id,language,provider,voice_name,storage_bucket,object_path,created_at').eq('organization_id', organizationId).eq('status', 'published').in('language', language === 'en' ? ['en'] : [language, 'en']).order('created_at', { ascending: false }),
  ]);
  const error = cityResult.error || tourResult.error || stopResult.error || assignmentResult.error || mediaResult.error || narrationResult.error;
  if (error) throw error;

  const publishedCities = (cityResult.data || []).filter((row: any) =>
    (row.city_translations || []).some((item: any) => item.status === 'published'));
  const publishedCityIds = new Set(publishedCities.map((row: any) => row.id));
  const publishedTours = (tourResult.data || []).filter((row: any) =>
    publishedCityIds.has(row.city_id)
    && (row.tour_translations || []).some((item: any) => item.status === 'published'));
  const publishedTourIds = new Set(publishedTours.map((row: any) => row.id));
  const publishedStops = (stopResult.data || []).filter((row: any) =>
    publishedCityIds.has(row.city_id)
    && (row.stop_translations || []).some((item: any) => item.status === 'published'));
  const publishedStopIds = new Set(publishedStops.map((row: any) => row.id));
  const assignments = (assignmentResult.data || []).filter((row: any) => publishedTourIds.has(row.tour_id) && publishedStopIds.has(row.stop_id));
  const assignmentsByStop = new Map<string, any[]>();
  assignments.forEach((row: any) => {
    const stopAssignments = assignmentsByStop.get(row.stop_id) || [];
    stopAssignments.push(row);
    assignmentsByStop.set(row.stop_id, stopAssignments);
  });
  const mediaById = new Map((mediaResult.data || []).map((item: any) => [item.id, item]));
  const narrationUrls = await signedMediaUrls(admin, narrationResult.data || []);
  const narrationByStop = new Map<string, any>();
  for (const item of narrationResult.data || []) {
    const current = narrationByStop.get(item.stop_id);
    if (!current || (item.language === language && current.language !== language)) narrationByStop.set(item.stop_id, item);
  }

  const cityNames = new Map<string, string>();
  const cities = publishedCities.map((row: any) => {
    const available = (row.city_translations || []).filter((item: any) => item.status === 'published');
    const translation: any = chooseTranslation(available, language);
    const name = translation?.name || row.slug;
    cityNames.set(row.id, name);
    const media: any = row.hero_media_id ? mediaById.get(row.hero_media_id) : undefined;
    return {
      id: row.id, name, country: row.country_name, flagEmoji: row.flag_emoji || '',
      subtitle: translation?.subtitle || '', description: translation?.description || '',
      centerLat: row.center_latitude, centerLng: row.center_longitude,
      imageUrl: publicImageUrl(organization.slug, row.hero_media_id),
      imageCredit: media?.attribution_text || undefined,
      imageSourceUrl: media?.source_url || undefined,
      imageLicenseName: media?.license_name || undefined,
      imageLicenseUrl: media?.license_url || undefined,
      organizationId: row.organization_id, status: 'published',
    };
  }).sort((a: any, b: any) => a.name.localeCompare(b.name, language, { sensitivity: 'base' }));

  const tours = publishedTours.map((row: any) => {
    const available = (row.tour_translations || []).filter((item: any) => item.status === 'published');
    const translation: any = chooseTranslation(available, language);
    const media: any = row.hero_media_id ? mediaById.get(row.hero_media_id) : undefined;
    return {
      id: row.id, cityId: row.city_id, title: translation?.title || row.slug,
      subtitle: translation?.subtitle || '', overview: translation?.overview || '',
      imageUrl: publicImageUrl(organization.slug, row.hero_media_id),
      imageCredit: media?.attribution_text || undefined,
      imageSourceUrl: media?.source_url || undefined,
      imageLicenseName: media?.license_name || undefined,
      imageLicenseUrl: media?.license_url || undefined,
      estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
      distanceMetres: row.distance_metres ?? undefined, difficulty: row.difficulty,
      wheelchairAccessible: row.wheelchair_accessible, accessMode: row.access_mode,
      organizationId: row.organization_id, status: 'published',
    };
  }).sort((a: any, b: any) => a.title.localeCompare(b.title, language, { sensitivity: 'base' }));

  const sites = publishedStops.flatMap((row: any) => {
    const stopAssignments = assignmentsByStop.get(row.id) || [];
    if (!stopAssignments.length) return [];
    const primaryAssignment = [...stopAssignments].sort((a: any, b: any) => a.position - b.position)[0];
    const available = (row.stop_translations || []).filter((item: any) => item.status === 'published');
    const translation: any = chooseTranslation(available, language);
    const narration: any = narrationByStop.get(row.id);
    const media: any = row.hero_media_id ? mediaById.get(row.hero_media_id) : undefined;
    return [{
      id: row.id, name: translation?.title || row.slug, hebrewName: translation?.native_name || '',
      category: row.interest, cityId: row.city_id, cityName: cityNames.get(row.city_id) || '',
      lat: row.latitude, lng: row.longitude, address: row.address || '',
      shortDescription: translation?.short_description || '', fullDescription: translation?.narrative || '',
      audioDuration: row.audio_duration_seconds || 0, transcript: translation?.audio_transcript || '',
      narrationUrl: narration ? narrationUrls.get(narration.id) : undefined,
      narrationLanguage: narration?.language,
      narrationVoice: narration?.voice_name,
      narrationProvider: narration?.provider,
      historicalPeriod: row.historical_period || '', imageUrl: publicImageUrl(organization.slug, row.hero_media_id) || '',
      imageCredit: media?.attribution_text || undefined,
      imageSourceUrl: media?.source_url || undefined,
      imageLicenseName: media?.license_name || undefined,
      imageLicenseUrl: media?.license_url || undefined,
      tags: [row.interest], keyFacts: [], tourId: primaryAssignment.tour_id, tourOrder: primaryAssignment.position,
      tourAssignments: stopAssignments.map((assignment: any) => ({
        tourId: assignment.tour_id,
        position: assignment.position,
      })),
      organizationId: row.organization_id, status: 'published',
    }];
  }).sort((a: any, b: any) => (a.tourOrder || 0) - (b.tourOrder || 0));

  return {
    schemaVersion: 1,
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
    language,
    generatedAt: new Date().toISOString(),
    cities,
    tours,
    sites,
  };
}

export function createPublicContentRouter() {
  const router = Router();
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const secretKey = process.env.SUPABASE_SECRET_KEY || '';
  const admin = supabaseUrl && secretKey ? createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null;

  router.get('/public/content', async (req: Request, res: Response) => {
    const organization = String(req.query.organization || 'tudela-global').trim().toLowerCase();
    const language = String(req.query.language || 'en').trim().toLowerCase();
    if (!ORGANIZATION_SLUG.test(organization)) return res.status(400).json({ error: 'Invalid organization.' });
    if (!LANGUAGES.has(language)) return res.status(400).json({ error: 'Unsupported language.' });
    if (!admin) return res.status(503).json({ error: 'Public content service is not configured.' });

    try {
      const cacheKey = `${organization}:${language}`;
      const cached = responseCache.get(cacheKey);
      let entry = cached && cached.expiresAt > Date.now() ? cached : undefined;
      if (!entry) {
        const payload = await loadPublishedContent(admin, organization, language);
        if (!payload) return res.status(404).json({ error: 'Organization not found.' });
        const etag = `"${createHash('sha256').update(JSON.stringify(payload)).digest('base64url')}"`;
        entry = { payload, etag, expiresAt: Date.now() + CACHE_TTL_MS };
        responseCache.set(cacheKey, entry);
      }
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.setHeader('ETag', entry.etag);
      if (req.header('if-none-match') === entry.etag) return res.status(304).end();
      return res.json(entry.payload);
    } catch (error: any) {
      console.error('Public content endpoint error:', error?.message || error);
      return res.status(502).json({ error: 'Published tour content is temporarily unavailable.' });
    }
  });

  router.get('/public/media/:mediaId', async (req: Request, res: Response) => {
    const organization = String(req.query.organization || 'tudela-global').trim().toLowerCase();
    const mediaId = String(req.params.mediaId || '').trim().toLowerCase();
    if (!ORGANIZATION_SLUG.test(organization)) return res.status(400).json({ error: 'Invalid organization.' });
    if (!UUID.test(mediaId)) return res.status(400).json({ error: 'Invalid media identifier.' });
    if (!admin) return res.status(503).json({ error: 'Public media service is not configured.' });

    try {
      const { data: organizationRow, error: organizationError } = await admin.from('organizations')
        .select('id').eq('slug', organization).in('status', ['trial', 'active']).maybeSingle();
      if (organizationError) throw organizationError;
      if (!organizationRow) return res.status(404).json({ error: 'Organization not found.' });

      const { data: media, error: mediaError } = await admin.from('media_assets')
        .select('id,storage_bucket,object_path,mime_type')
        .eq('id', mediaId).eq('organization_id', organizationRow.id)
        .eq('validation_status', 'approved').is('deleted_at', null).maybeSingle();
      if (mediaError) throw mediaError;
      if (!media) return res.status(404).json({ error: 'Published media not found.' });

      const [cityReference, tourReference, stopReference] = await Promise.all([
        admin.from('cities').select('id').eq('organization_id', organizationRow.id).eq('hero_media_id', mediaId).eq('status', 'published').limit(1),
        admin.from('tours').select('id').eq('organization_id', organizationRow.id).eq('hero_media_id', mediaId).eq('status', 'published').limit(1),
        admin.from('stops').select('id').eq('organization_id', organizationRow.id).eq('hero_media_id', mediaId).eq('status', 'published').limit(1),
      ]);
      const referenceError = cityReference.error || tourReference.error || stopReference.error;
      if (referenceError) throw referenceError;
      if (!(cityReference.data?.length || tourReference.data?.length || stopReference.data?.length)) {
        return res.status(404).json({ error: 'Published media not found.' });
      }

      const { data: file, error: downloadError } = await admin.storage.from(media.storage_bucket).download(media.object_path);
      if (downloadError || !file) throw downloadError || new Error('Media object is unavailable.');
      const bytes = Buffer.from(await file.arrayBuffer());
      res.setHeader('Content-Type', media.mime_type);
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('ETag', `"${createHash('sha256').update(bytes).digest('base64url')}"`);
      return res.send(bytes);
    } catch (error: any) {
      console.error('Public media endpoint error:', error?.message || error);
      return res.status(502).json({ error: 'Published media is temporarily unavailable.' });
    }
  });

  return router;
}
