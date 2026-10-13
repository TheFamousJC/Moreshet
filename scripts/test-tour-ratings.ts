import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const community = await readFile(new URL('../src/lib/community.ts', import.meta.url), 'utf8');
const modal = await readFile(new URL('../src/components/TourCompletionModal.tsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const cms = await readFile(new URL('../src/components/CmsPanel.tsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260817120000_tour_completion_and_ratings.sql', import.meta.url), 'utf8');
const grantsMigration = await readFile(new URL('../supabase/migrations/20260817121000_tour_rating_function_grants.sql', import.meta.url), 'utf8');

assert.match(community, /rpc\('mark_tour_stop_completed'/, 'completion must use the protected server function');
assert.match(community, /rpc\('submit_tour_rating'/, 'rating submission must use the protected server function');
assert.doesNotMatch(community, /from\('tour_ratings'\)\s*\.insert/, 'the browser must not insert ratings directly');
assert.match(app, /markTourStopCompleted\(selectedTourId, site\.id\)/, 'completed playback must record exact tour/stop evidence');
assert.match(app, /TourCompletionModal/, 'the visitor must receive an end-of-tour rating prompt');
assert.match(modal, /role="radiogroup"/, 'the star group must expose accessible selection semantics');
assert.match(modal, /role="radio"/, 'each star must expose an accessible rating choice');
assert.match(modal, /en:.*he:.*fr:.*ru:.*de:.*es:/s, 'completion copy must retain all six interface languages');
assert.match(cms, /Tour ratings awaiting review/, 'the CMS must expose the rating moderation queue');
assert.match(cms, /Rating approved for the public aggregate/, 'reviewers must understand what approval publishes');
assert.match(migration, /tour_ratings_one_per_user unique \(tour_id, user_id\)/, 'the database must enforce one current rating per visitor and tour');
assert.match(migration, /Complete every tour stop before rating this tour/, 'the database must enforce genuine completion');
assert.match(migration, /user_id = \(select auth\.uid\(\)\)/, 'completion history must remain private to its visitor');
assert.match(migration, /where r\.tour_id = p_tour_id and r\.status = 'approved'/, 'public aggregates must exclude unapproved ratings');
assert.match(grantsMigration, /revoke all on function public\.submit_tour_rating\(uuid, integer\) from public, anon/, 'rating mutation functions must not retain default public execution');

console.log('Tour completion and moderated rating interface tests passed.');
