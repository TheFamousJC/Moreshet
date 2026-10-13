import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { narrationCoverageCell, publishedNarrationCount } from '../src/lib/narrationCoverage';
import type { CmsNarrationItem } from '../src/lib/cmsContent';

const item = (overrides: Partial<CmsNarrationItem>): CmsNarrationItem => ({
  id: 'audio-1',
  stopId: 'stop-1',
  language: 'en',
  provider: 'test',
  model: 'test',
  voice: 'test',
  speakingRate: 1,
  sourceCharacters: 100,
  sourceType: 'human_recording',
  pronunciations: [],
  status: 'published',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

const items = [
  item({ id: 'published-en' }),
  item({ id: 'draft-en', status: 'pending_review', createdAt: '2026-08-02T00:00:00.000Z' }),
  item({ id: 'archived-fr', language: 'fr', status: 'superseded' }),
  item({ id: 'published-he', language: 'he' }),
];

const english = narrationCoverageCell(items, 'stop-1', 'en');
assert.equal(english.published?.id, 'published-en', 'published visitor audio should remain visible');
assert.equal(english.latestWork?.id, 'draft-en', 'newer work should be shown alongside the live recording');

const french = narrationCoverageCell(items, 'stop-1', 'fr');
assert.equal(french.published, undefined, 'archived audio must not count as visitor coverage');
assert.equal(french.latestWork, undefined, 'archived audio must not appear as active work');

assert.equal(publishedNarrationCount(['stop-1'], items), 2, 'the pilot count should cover English, Hebrew and French');
assert.equal(publishedNarrationCount(['stop-1', 'stop-2'], items), 2, 'empty stops should add no published recordings');

const cmsSource = await readFile(new URL('../src/components/CmsPanel.tsx', import.meta.url), 'utf8');
assert.match(cmsSource, /Narration Coverage/, 'CMS home must expose the coverage workspace.');
assert.match(cmsSource, /English, Hebrew and French across every active stop/, 'The dashboard must state the pilot language scope.');
assert.match(cmsSource, /Published recording/, 'The dashboard must identify stored visitor audio.');
assert.match(cmsSource, /Device voice only/, 'The dashboard must identify fallback-only coverage.');
assert.match(cmsSource, /No provider call or paid narration generation occurs|No TTS or AI usage event is created|without a new TTS charge/, 'The cost behavior must be clear to operators.');

console.log('Narration coverage tests passed.');
