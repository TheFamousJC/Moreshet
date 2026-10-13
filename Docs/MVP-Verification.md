# Tudela Global MVP verification log

Updated 13 October 2026. These results apply to the restored local project, not an old deployment.

## Verified in this rebuild

| Check | Result | What this establishes |
| --- | --- | --- |
| Dependency installation | Passed | Locked dependencies installed; Windows trusted certificates used without disabling TLS verification |
| TypeScript checking | Passed | Recovered and revised source type-checks |
| Production build | Passed | Visitor assets and server compile successfully |
| New MVP constraints and server smoke test | Passed | External AI prompt behavior, correct Google Maps links, invalid coordinate rejection, disabled AI and paid endpoints, anonymous sync rejection, health and visitor server response |
| Discovery tour checks | Passed | Multiple tours and stop assignment, order and discovery search logic |
| Interest filter checks | Passed | Multi-select interest filtering and inherited labels |
| Licensed media import checks | Passed | Import structure and rights records are validated; this is not a legal rights-clearance certificate |
| Narration playback checks | Passed | Recorded narration matching and language-safe fallback logic |
| Multilingual stop checks | Passed | Six-language authoring separation and completeness rules |
| Browser discovery check | Passed | Budapest opens with two sample tours and five stops |
| Browser walking check | Passed | Ordered five-stop list and correct external Google Maps destination links |
| Browser AI check | Passed | Visible prompt, personal AI provider selection, Copy prompt and Open AI controls; no in-app generated answer |

The browser checks inspected the controls and destination links. They did not submit a question to an external AI, transmit real location to Google or validate turn-by-turn navigation on a phone.

## Pending infrastructure and acceptance checks

The Docker engine is not running and no shared database keys were imported from the ZIP. Local database startup, all migrations, real sign-up, owner bootstrap, organization isolation, visitor_state row isolation, media storage and complete CMS publishing remain unverified.

The inherited SQL and full pilot acceptance suites need that test database. Source-based checks and a build cannot substitute for those results. Some archived tests target the old Leaflet map, AI API and generated narration architecture; they must be revised before being used as acceptance criteria for this MVP.

Phone GPS, arrival alerts, offline recovery, voice quality, cross-device sync retrieval/conflicts, content accuracy, practical venue access, image permissions, accessibility and public hosting remain pilot gates.

## Current development position

Stage 1 restore and build: locally verified. Stage 2 zero-budget architecture: implemented and locally checked; database owner-policy execution still pending. Stage 3 visitor demo: browser flow checked; phone and offline acceptance pending. Stages 4–8: retained implementation where applicable, with service setup and acceptance work remaining.

The local app runs on port 3220. SubFinder remains separate on port 3210 and its GitHub repository has not been used for Tudela. No paid cloud project or public deployment was created.
