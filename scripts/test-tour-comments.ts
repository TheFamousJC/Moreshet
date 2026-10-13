import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const community = await readFile(new URL('../src/lib/community.ts', import.meta.url), 'utf8');
const visitor = await readFile(new URL('../src/components/TourCommunityPanel.tsx', import.meta.url), 'utf8');
const cms = await readFile(new URL('../src/components/CmsCommunityModeration.tsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260817190000_tour_comments_and_bans.sql', import.meta.url), 'utf8');

assert.match(community, /rpc\('submit_tour_comment'/, 'comment submission must use the protected server function');
assert.match(community, /rpc\('get_public_tour_comments'/, 'public comments must come from the identity-safe server function');
assert.doesNotMatch(community, /from\('tour_comments'\)\s*\.insert/, 'the browser must not insert comments directly');
assert.match(visitor, /Comments appear here only after review/, 'visitors must be told that comments are moderated');
assert.match(visitor, /Public comments do not reveal account identities/, 'visitor identity privacy must be explained');
assert.match(visitor, /en:.*he:.*fr:.*ru:.*de:.*es:/s, 'comment controls must retain all six interface languages');
assert.match(cms, /Tour comments awaiting review/, 'the CMS must expose the comment moderation queue');
assert.match(cms, /Restrict this account/, 'administrators must be able to start an account restriction');
assert.match(cms, /Only Administrators and Super Admins can apply or lift them/, 'the CMS must explain ban authority');
assert.match(migration, /check \(char_length\(btrim\(body\)\) between 3 and 2000\)/, 'the database must enforce comment length');
assert.match(migration, /status = 'approved'/, 'anonymous reads must be limited to approved comments');
assert.match(migration, /private\.is_community_banned/, 'submission must enforce active organization bans');
assert.match(migration, /revoke all on function public\.submit_tour_comment\(uuid, text\) from public, anon/, 'comment mutation must not retain default public or anonymous execution');
assert.match(migration, /Returns approved tour comment text and publication time without visitor identifiers/, 'the public contract must explicitly exclude visitor identity');

console.log('Moderated tour comment and community-ban interface tests passed.');
