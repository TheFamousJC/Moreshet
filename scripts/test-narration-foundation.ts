import assert from 'node:assert/strict';
import { createNarrationDailyBudget, generateNarrationAudio, loadNarrationConfig, NARRATION_LANGUAGES, NARRATION_VOICES, parseNarrationRequest } from '../server/narrationProvider.js';
import { readFile } from 'node:fs/promises';

const organizationId = '11111111-1111-4111-8111-111111111111';
const simulator = loadNarrationConfig({ NARRATION_MODE: 'simulator' });
assert.equal(simulator.mode, 'simulator');
assert.equal(simulator.dailyCharacterLimit, 25000);
assert.equal(NARRATION_VOICES.filter((voice) => voice.language === 'en').length, 3);
assert.equal(NARRATION_VOICES.filter((voice) => voice.language === 'he').length, 3);
assert.deepEqual(NARRATION_LANGUAGES, ['en', 'he', 'fr'], 'Pilot narration must be limited to English, Hebrew and French.');
assert.equal(NARRATION_VOICES.filter((voice) => voice.language === 'fr').length, 1);
assert.equal(NARRATION_VOICES.some((voice) => ['ru', 'de', 'es'].includes(voice.language)), false);

const request = parseNarrationRequest({
  organizationId,
  language: 'en',
  voice: 'en-GB-Chirp3-HD-Aoede',
  speakingRate: 1,
  transcript: 'A short, reviewed heritage narration.',
  pronunciations: [{ phrase: 'heritage', encoding: 'ipa', pronunciation: 'ˈhɛrɪtɪdʒ', reviewerNote: 'Reviewed English pronunciation.' }],
}, simulator);
assert.equal(request.language, 'en');
assert.match(request.cacheKey, /^[0-9a-f]{64}$/);
assert.equal(request.cacheKey, parseNarrationRequest({ ...request }, simulator).cacheKey, 'Identical narration inputs must reuse the cache key.');
assert.notEqual(request.cacheKey, parseNarrationRequest({ ...request, transcript: `${request.transcript} Revised.` }, simulator).cacheKey, 'Transcript edits must invalidate the prior recording.');
assert.notEqual(request.cacheKey, parseNarrationRequest({ ...request, pronunciations: [{ ...request.pronunciations[0], pronunciation: 'ˈhɛrətɪdʒ' }] }, simulator).cacheKey, 'Pronunciation edits must invalidate the prior recording.');
assert.throws(() => parseNarrationRequest({ ...request, voice: 'he-IL-Chirp3-HD-Aoede' }, simulator), /matches the narration language/);
assert.throws(() => parseNarrationRequest({ ...request, speakingRate: 1.5 }, simulator), /between 0.85 and 1.15/);
assert.throws(() => parseNarrationRequest({ ...request, language: 'ru', voice: 'ru-RU-Chirp3-HD-Aoede' }, simulator), /English, Hebrew and French only/);

let networkCalled = false;
const simulation = await generateNarrationAudio(request, simulator, async () => {
  networkCalled = true;
  throw new Error('Simulator must not call a paid provider.');
});
assert.equal(networkCalled, false);
assert.equal(simulation.audioUrl, '/voice-samples/en-aoede.mp3');

let current = new Date('2026-08-12T10:00:00Z');
const budget = createNarrationDailyBudget(50, () => current);
assert.equal(budget.tryConsume(30), true);
assert.equal(budget.tryConsume(21), false);
assert.equal(budget.status().remaining, 20);
current = new Date('2026-08-13T00:00:01Z');
assert.equal(budget.status().remaining, 50);

const live = loadNarrationConfig({ NARRATION_MODE: 'live', NARRATION_WORKER_URL: 'https://narration.example.test', NARRATION_WORKER_SECRET: 'a-secure-test-secret-with-32-characters' });
let body: Record<string, any> | undefined;
let headers: Headers | undefined;
const result = await generateNarrationAudio(request, live, async (url, init) => {
  assert.equal(url, 'https://narration.example.test/synthesize');
  body = JSON.parse(String(init?.body || '{}'));
  headers = new Headers(init?.headers);
  return new Response(JSON.stringify({ audioContent: Buffer.from('test mp3 bytes').toString('base64') }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
assert.equal(result.mode, 'live');
assert.equal(result.bytes?.toString(), 'test mp3 bytes');
assert.equal(body?.voice, 'en-GB-Chirp3-HD-Aoede');
assert.equal(body?.speakingRate, 1);
assert.deepEqual(body?.pronunciations, request.pronunciations);
assert.match(headers?.get('x-moreshet-signature') || '', /^[0-9a-f]{64}$/);

const adminSource = await readFile(new URL('../server/authAdmin.ts', import.meta.url), 'utf8');
assert.match(adminSource, /narration\/pronunciation-preview/, 'Pronunciation approval must use a dedicated authenticated preview endpoint.');
assert.match(adminSource, /pronunciation-previews/, 'Short review samples must be stored separately from publishable narration assets.');
assert.match(adminSource, /Reviewer access is required/, 'Organization reviewers must be authorized explicitly.');
assert.match(adminSource, /pronunciation-preview\/complete/, 'Playback completion must use a dedicated authenticated endpoint.');
assert.match(adminSource, /pronunciation_review_events/, 'The server must store reviewer-bound listening evidence.');
assert.match(adminSource, /pronunciation_review_completed/, 'Completed listening must enter the administrative audit trail.');

const lifecycleMigration = await readFile(new URL('../supabase/migrations/20260816150000_cms_lifecycle_controls.sql', import.meta.url), 'utf8');
assert.match(lifecycleMigration, /p_decision='superseded'/, 'Administrators must be able to archive narration without deleting its recording.');
assert.match(lifecycleMigration, /p_decision='generated'/, 'Archived narration must be recoverable as a draft.');
assert.match(lifecycleMigration, /status='published' and id<>p_asset_id/, 'Publishing a replacement must archive the previous public narration for that stop and language.');
assert.match(lifecycleMigration, /archive_content_revision/, 'Active content proposals must have an audit-preserving archive action.');
assert.match(lifecycleMigration, /restore_content_revision/, 'Archived content proposals must be recoverable.');
assert.match(lifecycleMigration, /old\.status='disabled' and new\.status='draft'/, 'Archived AI knowledge sources must be recoverable as drafts.');

console.log('Stage 5 narration provider, validation, cache and budget checks passed without a paid API call.');
