import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { TOUR_CITIES, HERITAGE_SITES } from '../src/data/heritageSites';
import { COUNTRIES } from '../src/data/countries';
import type { SiteCategory } from '../src/types';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const secret = process.env.SUPABASE_SECRET_KEY || '';
if (!url || !secret) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local.');
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
const aliases: Partial<Record<SiteCategory, SiteCategory>> = { bridge: 'historic_sites', historic_site: 'historic_sites', memorial: 'monument' };

const { data: profiles, error: profileError } = await supabase.from('profiles').select('user_id').eq('platform_role', 'super_admin').eq('status', 'active').limit(1);
if (profileError) throw profileError;
const actorId = profiles?.[0]?.user_id;
if (!actorId) throw new Error('Create the Super Admin first with npm run auth:bootstrap, then rerun this migration.');

let { data: organization, error: organizationError } = await supabase.from('organizations').select('id').eq('slug', 'tudela-global').maybeSingle();
if (organizationError) throw organizationError;
if (!organization) {
  const result = await supabase.from('organizations').insert({ name: 'Tudela Global', slug: 'tudela-global', default_language: 'en', default_currency: 'USD', created_by: actorId }).select('id').single();
  if (result.error) throw result.error;
  organization = result.data;
}
const organizationId = organization.id;
await supabase.from('organization_settings').upsert({
  organization_id: organizationId,
  application_name: 'Tudela Global',
  enabled_languages: ['en', 'he', 'ru', 'fr', 'de', 'es'],
  enabled_commercial_models: ['free', 'paid', 'subscription'],
  feedback_enabled: true,
  heritage_stories_enabled: true,
  tips_enabled: true,
  aggregate_analytics_only: true,
}, { onConflict: 'organization_id' });

let cityCount = 0;
let tourCount = 0;
let stopCount = 0;
for (const city of TOUR_CITIES) {
  const citySlug = slugify(city.name);
  const code = COUNTRIES.find((country) => country.name === city.country)?.code || 'ZZ';
  let { data: cityRow, error } = await supabase.from('cities').select('id').eq('organization_id', organizationId).eq('slug', citySlug).maybeSingle();
  if (error) throw error;
  if (!cityRow) {
    const result = await supabase.from('cities').insert({ organization_id: organizationId, slug: citySlug, country_name: city.country, country_code: code, flag_emoji: city.flagEmoji, center_latitude: city.centerLat, center_longitude: city.centerLng, status: 'draft', created_by: actorId, updated_by: actorId }).select('id').single();
    if (result.error) throw result.error;
    cityRow = result.data;
    cityCount += 1;
  }
  const cityId = cityRow.id;
  const cityTranslation = await supabase.from('city_translations').upsert({ organization_id: organizationId, city_id: cityId, language: 'en', name: city.name, subtitle: city.subtitle, description: city.description, status: 'draft', created_by: actorId, updated_by: actorId }, { onConflict: 'city_id,language' });
  if (cityTranslation.error) throw cityTranslation.error;

  const tourSlug = `${citySlug}-heritage-tour`;
  let { data: tourRow, error: tourError } = await supabase.from('tours').select('id').eq('organization_id', organizationId).eq('slug', tourSlug).maybeSingle();
  if (tourError) throw tourError;
  if (!tourRow) {
    const result = await supabase.from('tours').insert({ organization_id: organizationId, city_id: cityId, slug: tourSlug, status: 'draft', created_by: actorId, updated_by: actorId }).select('id').single();
    if (result.error) throw result.error;
    tourRow = result.data;
    tourCount += 1;
  }
  const tourId = tourRow.id;
  const tourTranslation = await supabase.from('tour_translations').upsert({ organization_id: organizationId, tour_id: tourId, language: 'en', title: `${city.name} Heritage Tour`, subtitle: city.subtitle, overview: city.description, status: 'draft', created_by: actorId, updated_by: actorId }, { onConflict: 'tour_id,language' });
  if (tourTranslation.error) throw tourTranslation.error;

  const cityStops = HERITAGE_SITES.filter((site) => site.cityId === city.id).sort((a, b) => (a.tourOrder || 999) - (b.tourOrder || 999));
  for (const [index, site] of cityStops.entries()) {
    const stopSlug = slugify(site.name);
    let { data: stopRow, error: stopError } = await supabase.from('stops').select('id').eq('organization_id', organizationId).eq('slug', stopSlug).maybeSingle();
    if (stopError) throw stopError;
    if (!stopRow) {
      const result = await supabase.from('stops').insert({ organization_id: organizationId, city_id: cityId, slug: stopSlug, interest: aliases[site.category] || site.category, address: site.address || null, latitude: site.lat, longitude: site.lng, audio_duration_seconds: site.audioDuration || null, historical_period: site.historicalPeriod || null, status: 'draft', created_by: actorId, updated_by: actorId }).select('id').single();
      if (result.error) throw result.error;
      stopRow = result.data;
      stopCount += 1;
    }
    const stopId = stopRow.id;
    const stopTranslation = await supabase.from('stop_translations').upsert({ organization_id: organizationId, stop_id: stopId, language: 'en', title: site.name, native_name: site.hebrewName || null, short_description: site.shortDescription || site.fullDescription.slice(0, 1000), narrative: site.fullDescription || site.shortDescription, audio_transcript: site.transcript || null, status: 'draft', created_by: actorId, updated_by: actorId }, { onConflict: 'stop_id,language' });
    if (stopTranslation.error) throw stopTranslation.error;
    const assignment = await supabase.from('tour_stops').upsert({ organization_id: organizationId, tour_id: tourId, stop_id: stopId, position: site.tourOrder || index + 1, created_by: actorId, updated_by: actorId }, { onConflict: 'tour_id,stop_id' });
    if (assignment.error) throw assignment.error;
  }
}

console.log(`Test content migration complete. Added ${cityCount} cities, ${tourCount} tours and ${stopCount} stops; existing records were preserved and refreshed as drafts.`);
