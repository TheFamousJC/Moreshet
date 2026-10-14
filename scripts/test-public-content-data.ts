import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { loadPublishedContent } from '../server/publicContent.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const secret = process.env.SUPABASE_SECRET_KEY || '';
assert.ok(url && secret, 'SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const payload = await loadPublishedContent(admin, 'moreshet', 'en');
assert.ok(payload, 'The moreshet organization must exist.');
assert.ok(payload.cities.every((city: any) => city.status === 'published'));
assert.ok(payload.tours.every((tour: any) => tour.status === 'published'));
assert.ok(payload.sites.every((site: any) => site.status === 'published'));
assert.ok(payload.sites.every((site: any) => payload.tours.some((tour: any) => tour.id === site.tourId)));
const catalogueState = payload.cities.length && payload.tours.length && payload.sites.length
  ? 'complete published catalogue available'
  : 'published catalogue currently empty or incomplete';
console.log(`Published data boundary PASS: ${payload.cities.length} cities, ${payload.tours.length} tours, ${payload.sites.length} stops; CMS drafts excluded; ${catalogueState}.`);
