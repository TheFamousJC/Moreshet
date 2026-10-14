import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeGooglePolyline } from '../src/lib/walkingRoutes.js';

const [app, discovery, nearby, benjamin, walk, settings, header, saved, server] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/HeritageSearch.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WhatsAroundMe.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/AskHerzlChat.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/LiveWalkMap.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/SettingsPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Header.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/SavedToursPanel.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../server.ts', import.meta.url), 'utf8'),
]);

assert.doesNotMatch(app, /Math\.floor\(Math\.random\(\) \* sites\.length\)/, 'Arrival must never choose a random global stop.');
assert.match(app, /currentCitySites\.find\(\(site\) => !completedSiteIds\.includes\(site\.id\)\)/, 'Geofencing must target the next incomplete selected-tour stop.');
assert.match(app, /visitorPreferences\.arrivalPlaybackMode === 'auto'/, 'Arrival playback must respect the visitor choice.');
assert.match(app, /arrivalToneEnabled/, 'Arrival tone must respect Settings.');
assert.match(app, /arrivalVibrationEnabled/, 'Arrival vibration must respect Settings.');
assert.match(app, /arrivalPulseEnabled/, 'Arrival screen pulse must respect Settings.');
assert.match(app, /locationEnabled/, 'Location must be a persisted visitor preference.');

assert.match(discovery, /!selectedTourId && <div className="space-y-2">/, 'Discovery filters must collapse after choosing a tour.');
assert.match(discovery, /slice\(0, 5\)/, 'Discovery must show up to five large recommended destinations.');
assert.match(discovery, /google-maps-mark\.svg/, 'Google Maps actions must have a recognizable map mark.');
assert.match(discovery, /waze\.com\/ul/, 'Stop cards must offer a Waze handoff.');
assert.match(discovery, /onToggleSavedTour/, 'Discovery must let visitors bookmark complete tours.');
assert.match(discovery, /whats-around-me-button/, 'Discovery must expose the plain-language nearby heritage entry point.');
assert.match(nearby, /Verified by Moreshet/, 'Nearby results must distinguish Moreshet-reviewed places.');
assert.match(nearby, /Not yet verified by Moreshet/, 'Google-discovered places must be visibly unverified.');
assert.match(nearby, /AI can make mistakes/, 'The AI disclosure must be visible before asking Benjamin about a place.');
assert.match(nearby, /onOpenAccount/, 'Saving or asking about nearby places must support contextual sign-in.');
assert.match(nearby, /googleMapsUrl/, 'Nearby results must provide an official map handoff.');
assert.match(nearby, /INTEREST_VALUES\.map/, 'What’s Around Me must use the shared Discovery/CMS interest taxonomy.');
assert.match(nearby, /matchesSelectedInterests/, 'Nearby Moreshet results must respect the selected interests.');
assert.match(nearby, /interests: selectedInterests/, 'Nearby Google searches must be tailored to the selected interests.');
assert.match(benjamin, /initialQuestion/, 'Ask Benjamin must receive the selected nearby-place question without automatically spending a request.');

assert.match(walk, /backToTourStops/, 'Live Walk must return to the full stop list.');
assert.match(walk, /Location \{locationEnabled \? 'On' : 'Off'\}/, 'Live Walk must expose Location On/Off.');
assert.match(walk, /onOpenSettings/, 'Live Walk must link to arrival settings.');
assert.doesNotMatch(walk, /onMarkVisited|markVisited/, 'The obsolete manual visited button must be removed.');
assert.doesNotMatch(walk, /setMapTileStyle|isLayerMenuOpen|<Layers/, 'Live Walk must not expose a map-style selector.');
assert.match(walk, /L\.polyline\(routePoints\.map/, 'Live Walk may draw only genuine walking geometry.');
assert.match(walk, /dashArray: '1 13'/, 'The Google walking route must use the dotted pilot style.');
assert.doesNotMatch(walk, /L\.polyline\(validCoords/, 'Live Walk must not draw a geometric stop-to-stop line.');

assert.match(settings, /arrivalPlaybackMode/, 'Settings must offer automatic and manual arrival playback.');
assert.match(settings, /arrivalAlertsEnabled/, 'Settings must include the arrival-alert master toggle.');
assert.match(settings, /arrivalToneEnabled[\s\S]*arrivalVibrationEnabled[\s\S]*arrivalPulseEnabled/, 'Tone, vibration and pulse must be independently configurable.');
assert.match(header, /onOpenAccount[\s\S]*onOpenSaved[\s\S]*onOpenSettings[\s\S]*onOpenHelp/, 'Header must route to profile, saved, settings and help.');
assert.match(header, /onGoDiscovery[\s\S]*Moreshet<br \/>Global/, 'The Moreshet wordmark must return visitors to Discovery.');
assert.match(header, /onClick=\{onGoDiscovery\}[\s\S]*onClick=\{onOpenAccount\}/, 'The Moreshet logo must be the first header button, immediately before Profile.');
assert.match(header, /left-1\/2 -translate-x-1\/2 bg-white px-1[\s\S]*\{language\.flag\}/, 'The selected-language flag must break the bottom border at the centre like the battery indicator.');
assert.match(header, /justify-center gap-0\.5 px-1/, 'Header controls must remain tightly centred on narrow phones.');
assert.match(header, /w-16[\s\S]*Moreshet<br \/>Global/, 'The text-only Moreshet home control must be twice the width of an icon button.');
assert.doesNotMatch(header, /Volume2|VolumeX|onToggleMasterAudio|audioSettings/, 'The redundant header audio toggle must be removed.');
assert.match(header, /border-\[#c45d79\][\s\S]*border-\[#7c4db5\][\s\S]*border-\[#2f8f68\][\s\S]*border-\[#d4a017\]/, 'Header icons must use the requested profile, language, battery and location colours.');
assert.match(header, /border-\[#c43d4d\][\s\S]*<Bookmark/, 'The header bookmark must remain red.');
assert.match(app, /onGoDiscovery=\{\(\) => \{ setDiscoveryHomeRequest/, 'The logo must reset any nested Discovery screen.');
assert.match(app, /setSelectedCityId\(''\); setSelectedTourId\(''\); setSelectedSite\(null\); setActiveTab\('search'\);/, 'The logo must clear tour context and return to the original Discovery page.');
assert.match(discovery, /setShowNearbyPlaces\(false\);[\s\S]*\[homeRequestId\]/, 'The original Discovery page must close What’s Around Me when Home is requested.');
assert.match(discovery, /text-\[#c43d4d\][\s\S]*<Bookmark/, 'Tour bookmark controls must be red.');
assert.match(saved, /savedTourIds/, 'Saved must contain complete tours.');
assert.match(server, /routes\.googleapis\.com\/directions\/v2:computeRoutes/, 'The server must provide Google Routes.');
assert.match(server, /\/api\/places\/nearby/, 'The server must proxy nearby Google Places without exposing its key.');

const decoded = decodeGooglePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
assert.deepEqual(decoded.map((point) => [point.lat, point.lng]), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
console.log('Android pilot UX, visitor settings and hybrid routing checks passed.');
