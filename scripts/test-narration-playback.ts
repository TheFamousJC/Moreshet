import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findMatchingRecordedNarration, narrationPlaybackSource } from '../src/lib/narrationPlayback.js';
import { HeritageSite } from '../src/types.js';
import { TOUR_CONTROL_UI_TRANSLATIONS } from '../src/data/tourControlTranslations.js';

const site = {
  id: 'test', name: 'Test', hebrewName: '', category: 'historic_site', lat: 0, lng: 0,
  address: '', shortDescription: '', fullDescription: '', audioDuration: 30,
  transcript: 'Reviewed transcript.', historicalPeriod: '', imageUrl: '', tags: [], keyFacts: [],
} satisfies HeritageSite;

assert.equal(narrationPlaybackSource(site, 'en'), 'device', 'Device speech must remain the default without published audio.');
assert.equal(narrationPlaybackSource({ ...site, narrationUrl: 'https://signed.example/audio.mp3', narrationLanguage: 'en' }, 'en'), 'recorded');
assert.equal(narrationPlaybackSource({ ...site, narrationUrl: 'https://signed.example/audio.mp3', narrationLanguage: 'en' }, 'he'), 'device', 'A recording in the wrong language must never play.');
assert.equal(narrationPlaybackSource({ ...site, narrationLanguage: 'en' }, 'en'), 'device', 'Missing signed URL must fall back safely.');

const recordedStop = { ...site, id: 'stop-with-recording', narrationUrl: 'https://signed.example/stop-with-recording.mp3', narrationLanguage: 'en' as const };
const otherStop = { ...site, id: 'different-stop' };
assert.equal(narrationPlaybackSource(recordedStop, 'en'), 'recorded');
assert.equal(narrationPlaybackSource(otherStop, 'en'), 'device', 'A recording belonging to one stop must not leak into another stop.');
assert.equal(findMatchingRecordedNarration([recordedStop, otherStop], recordedStop.id, 'en')?.id, recordedStop.id, 'A refreshed URL must be selected only for the same stop and language.');
assert.equal(findMatchingRecordedNarration([recordedStop, otherStop], otherStop.id, 'en'), null, 'Refresh must not borrow another stop recording.');
assert.equal(findMatchingRecordedNarration([recordedStop, otherStop], recordedStop.id, 'fr'), null, 'Refresh must not borrow another language recording.');

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const playerSource = readFileSync(new URL('../src/components/AudioPlayerDrawer.tsx', import.meta.url), 'utf8');
assert.match(appSource, /playbackSource: canUseRecording \? 'recorded' : 'device'/, 'Playback must initially report the source selected for this stop and language.');
assert.match(appSource, /setAudioSettings\(\(prev\) => \(\{ \.\.\.prev, playbackSource: 'device' \}\)\)/, 'A failed recording must visibly switch the player to device voice.');
assert.match(appSource, /if \(deviceFallbackStarted \|\| playbackSessionRef\.current !== playbackSession\) return;/, 'Recording failure events must not start duplicate or obsolete device narration.');
assert.match(appSource, /playRecording\(refreshedSite, false\)/, 'An expired signed URL should be refreshed and retried exactly once before fallback.');
assert.match(appSource, /playbackSessionRef\.current !== playbackSession/, 'A refreshed URL must not restart an obsolete stop after the visitor changes playback.');
assert.match(playerSource, /audioSettings\.playbackSource/, 'The visitor badge must display the active source, including runtime fallback.');
assert.match(appSource, /isPlaying: false, playbackError: true/, 'A device-speech failure must enter a visible error state.');
assert.match(playerSource, /role="alert"/, 'The expanded player must expose playback failure as an accessible alert.');
for (const language of ['en', 'he', 'ru', 'fr', 'de', 'es'] as const) {
  assert.ok(TOUR_CONTROL_UI_TRANSLATIONS[language].audioUnavailable, `Missing audio-unavailable guidance for ${language}.`);
}

console.log('Narration playback selection and language-safe fallback checks passed.');
