import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const community=await readFile(new URL('../src/lib/community.ts',import.meta.url),'utf8');
const visitor=await readFile(new URL('../src/components/HeritageStoriesPanel.tsx',import.meta.url),'utf8');
const cms=await readFile(new URL('../src/components/CmsHeritageStoriesModeration.tsx',import.meta.url),'utf8');
const migration=(await Promise.all([
  '20260817203000_heritage_stories.sql',
  '20260817213000_heritage_story_owner_archive.sql',
].map(name=>readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')))).join('\n');

assert.match(community,/rpc\('save_heritage_story_draft'/,'story drafts must use a protected RPC');
assert.match(community,/rpc\('submit_heritage_story'/,'story submission must use a protected RPC');
assert.match(community,/rpc\('set_heritage_story_owner_archived'/,'story archive state must use a protected RPC');
assert.match(community,/createSignedUrl/,'private story photographs need temporary signed delivery URLs');
assert.doesNotMatch(community,/from\('heritage_stories'\)\s*\.insert/,'the browser must not directly insert story rows');
assert.match(visitor,/up to three photographs|Up to 3 JPEG/i,'the visitor must see the three-photo limit');
assert.match(visitor,/I confirm I have the right to share/,'explicit publication and rights consent must be visible');
assert.match(visitor,/anonymous.*display name/is,'the visitor must control public attribution');
assert.match(visitor,/en:.*he:.*fr:.*ru:.*de:.*es:/s,'story controls must retain all six interface languages');
assert.match(cms,/Heritage stories awaiting review/,'the CMS must expose a story moderation queue');
assert.match(cms,/Explicit publication consent recorded/,'reviewers must see consent evidence');
assert.match(cms,/Remove from public display/,'published stories must have a recoverable moderation removal action');
assert.match(migration,/position between 1 and 3/,'the database must enforce at most three ordered photos');
assert.match(migration,/published_revision/,'edits must retain the approved public revision until approval');
assert.match(migration,/private\.is_community_banned/,'story submission and delivery must honor community restrictions');
assert.match(migration,/heritage_story_revisions_append_only/,'story revision evidence must be append-only');
assert.match(migration,/heritage_storage_public_published_select/,'anonymous photo access must be limited to published story media');
assert.match(migration,/revoke all on function public\.submit_heritage_story\(uuid,text\[\],boolean,text\) from public,anon/,'anonymous story submission must be revoked');
assert.match(migration,/Only withdrawn or rejected stories can be archived/,'active stories must not be hidden without withdrawal or rejection');

console.log('Heritage story consent, private-media and moderation interface tests passed.');
