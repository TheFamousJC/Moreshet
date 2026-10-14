import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildTourShareUrl } from '../src/lib/tourSharing';

const community = await readFile(new URL('../src/lib/community.ts', import.meta.url), 'utf8');
const visitor = await readFile(new URL('../src/components/TourCommunityPanel.tsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260817193000_tour_likes_and_sharing.sql', import.meta.url), 'utf8');

const link = buildTourShareUrl('https://moreshet.example', 'client-one', 'city-1', 'tour-1');
const parsed = new URL(link);
assert.equal(parsed.origin, 'https://moreshet.example');
assert.equal(parsed.pathname, '/');
assert.deepEqual(Object.fromEntries(parsed.searchParams), { organization: 'client-one', city: 'city-1', tour: 'tour-1' });
assert.doesNotMatch(link, /lat|lng|gps|user|location/i, 'shared links must not contain user or GPS data');

assert.match(community, /rpc\('set_tour_like'/, 'like mutation must use the protected server function');
assert.match(community, /rpc\('get_tour_like_summary'/, 'public like totals must use the aggregate function');
assert.doesNotMatch(community, /from\('tour_likes'\)\s*\.insert/, 'the browser must not insert likes directly');
assert.match(visitor, /navigator\.share/, 'mobile devices must use the native share sheet when supported');
assert.match(visitor, /navigator\.clipboard\.writeText/, 'sharing must provide a copy-link fallback');
assert.match(visitor, /aria-pressed=\{liked\}/, 'the like toggle must expose its selected state');
assert.match(visitor, /en:.*he:.*fr:.*ru:.*de:.*es:/s, 'like and share controls must retain all six interface languages');
assert.match(app, /initialPublicParams\.get\('city'\)/, 'the app must accept a stable city deep link');
assert.match(app, /initialPublicParams\.get\('tour'\)/, 'the app must accept a stable tour deep link');
assert.match(migration, /tour_likes_one_per_user unique \(tour_id, user_id\)/, 'the database must enforce one like per user and tour');
assert.match(migration, /pg_advisory_xact_lock/, 'concurrent taps for one visitor and tour must be serialized');
assert.match(migration, /created_at > now\(\) - interval '1 minute'/, 'rapid toggling must be rate-limited server-side');
assert.match(migration, /private\.is_community_banned/, 'active community bans must prevent new likes');
assert.match(migration, /revoke all on function public\.set_tour_like\(uuid, boolean\) from public, anon/, 'anonymous like mutation must be revoked');
assert.match(migration, /Returns a public aggregate count and only the current caller own like state/, 'the aggregate privacy contract must be explicit');

console.log('Tour likes, stable sharing and privacy interface tests passed.');
