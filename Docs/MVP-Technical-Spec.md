# Tudela Global MVP technical specification

Version 1, 13 October 2026. This is the current specification for the rebuild from Build 1.zip. Earlier documents in this folder describe the previous architecture and are retained as reference, not instructions for this MVP.

## What the app does

Tudela helps visitors discover Jewish heritage, choose a city and tour, read and listen to stories at individual stops, and open Google Maps for walking directions. Staff create and review tours in a separate editing area. Visitors can save content and, once shared accounts are configured, contribute ratings, comments and personal stories.

Budapest is the first European pilot. Existing cities and sample tours remain available. An MVP means a testable product with a deliberately small operating model; it does not mean that placeholders are presented as working online services.

## Rules for this rebuild

1. The initial operating target is as close to zero budget as practical. No paid service is activated by this rebuild.
2. Tudela does not call an AI API, send prompts automatically, or display generated answers as if they came from its own assistant. The visitor copies a prompt and opens their own AI website.
3. Google Maps provides external maps and navigation. An in-app Google map is optional and requires a separate configuration decision.
4. Shared personal data belongs to the signed-in account. A visitor must never receive another account's private notes.
5. Only reviewed and published content is served from the shared catalogue. Bundled sample content is labeled as demonstration content.
6. Existing source code is reused where it supports these rules. Source files and archived feature claims alone are not proof that a feature has passed live testing.

## How the pieces fit together

The visitor interface is a React website: it can be used on a phone or desktop and supports installation as a web app. A small Express server serves the website and checks requests. Supabase supplies the shared database, account sign-in and file storage when configured. Its local version can run on the developer's machine; no paid hosting is needed to demonstrate the visitor experience.

The browser stores visitor preferences, cached tour content and saved content for local use. Google Maps and the user's AI service open separately. Tudela cannot observe or control what happens inside those services.

Local address: http://localhost:3220. Staff editing area: http://localhost:3220/cms. This specification and the plan are available through http://localhost:3220/mvp-guide.

## Every visitor working part

| Part | What the visitor sees and does | Implementation and dependencies |
| --- | --- | --- |
| Startup and onboarding | Sees branding and an introduction with a skip option | Existing splash and onboarding components; preferences are stored on the device |
| Discover | Searches cities, chooses a tour and filters interests | Bundled content works without a database; the shared catalogue replaces it after configuration |
| Country and city selection | Chooses a European city, initially Budapest | Existing city directory and translations; sample content needs editorial verification |
| Tour selection | Sees stops in order, summary and practical details | Existing tour model and stop-assignment logic; commercial access fields are not a functioning payment system |
| Stop details | Reads descriptions, historical context, facts and captions | Existing detail screens and translated content; image rights require separate review |
| Live walk | Chooses the next stop, sees progress and opens walking directions | Rebuilt around Google Maps links; no paid Routes API and no invented road-following route |
| Location permission | Can turn location on or off | Device browser permission; GPS is useful only while the app is running and allowed to access location |
| Distance | Sees proximity when real GPS is available | Local coordinate calculation is straight-line distance; Google Maps provides walking distance |
| Stop arrival | Can receive an arrival prompt and mark stops completed | Existing foreground GPS and progress logic; actual phone testing remains a pilot gate |
| Audio player | Plays a reviewed recording, or reads the transcript aloud | Existing recorded-audio playback and device speech; no paid generation service is used |
| Podcast mode | Explores tours as listening content | Existing listening interface; recording availability and device voice quality vary |
| Nearby places | Sees nearby catalogue places and can search Google Maps | Local distance filtering plus external Google Maps search; no live Places API call |
| Ask Benjamin | Writes a question, reviews a prompt, copies it and opens an AI website | Rebuilt external-service workflow; no AI credentials, background submission or automatic answer import |
| Research sources | Opens museum, library and archive links | Existing reference directory; inclusion does not imply fact-checking or endorsement |
| Saved content | Saves tours or stops, removes them and revisits them | Existing device saving; shared account saving requires configured accounts |
| Private notes | Adds notes associated with stops | Local device storage; account sync uses a dedicated owner-protected database row |
| Account access | Signs up, signs in, resets a password and signs out | Existing Supabase integration; unavailable until a local or free hosted Supabase project is configured |
| First sign-in setup | Chooses preferences such as interests and language | Existing setup wizard; account persistence needs configured accounts |
| Cloud sync | Saves the signed-in account's notes and saved IDs | New authenticated sync endpoint and database policy; guest sync is refused without losing local data |
| Ratings | Rates a completed tour | Existing community implementation; database and account required |
| Comments | Sends a tour or stop comment for moderation | Existing moderation workflow; database and account required |
| Likes and sharing | Likes a tour or shares a link | Sharing can work as a link; persistent likes require the database |
| Personal heritage stories | Contributes a story with review and publication | Existing story submission and moderation code; accounts and storage required |
| Offline content | Revisits cached or saved visitor content | Existing service worker and device caching; does not provide offline Google Maps, external AI or guaranteed saved audio |
| Settings | Adjusts language, audio, interests, location and onboarding | Existing settings; six language codes are supported by inherited content, new MVP screens initially use English with Hebrew layout direction |
| Information pages | Reads privacy, terms, support and AI disclosure | Updated MVP disclosure; legal review remains necessary before a public launch |
| Accessibility | Uses labeled buttons, readable controls and keyboard interaction | Existing and new interface controls; a complete accessibility audit remains pending |

## Every staff and publishing working part

The CMS is a separate route, not a secret URL that grants permission. The database and server check which role a signed-in person has.

| Part | Staff action | Dependency and acceptance condition |
| --- | --- | --- |
| Organizations | Separates the content and staff of different publishers | Existing organization records and membership policies; cross-organization tests must pass |
| Platform owner | Manages publishers and platform-level access | Existing super-admin role; bootstrap requires a local owner password entered securely |
| Administrator | Manages permitted staff and organization settings | Existing administrator role and server checks |
| Editor | Creates and revises city, tour and stop drafts | Existing forms; draft work requires a database |
| Reviewer | Approves content or requests changes | Existing review actions and audit history |
| Tour wizard | Builds a city, tour and ordered stop collection | Existing wizard; pilot review must check that editors cannot bypass approval |
| Stop order and reuse | Reorders stops or reuses a stop across tours | Existing stop-assignment model and migrations |
| Multiple languages | Edits descriptions and transcripts in each language | Existing translation fields; missing translations must not be presented as verified translations |
| Coordinates | Enters a stop's latitude and longitude | Manual verification using Google Maps; automatic geocoding is disabled |
| Image uploads | Adds a photograph with its rights information | Existing private upload and validation workflow; licensing is a human responsibility |
| Audio uploads | Adds reviewed narration files | Existing audio-format validation and approval; automated narration previews are disabled |
| Pronunciation notes | Records guidance for a human narrator | Existing guidance fields; automatic generated preview is disabled |
| Import and export | Imports structured tour drafts or exports catalogue data | Existing JSON workflow; imports must pass validation and review |
| Source register | Adds historical source citations and evidence | Existing source editor retained for editorial use, not an AI API knowledge pipeline |
| Revisions and publication | Revises a published item without immediately replacing it | Existing revision and approval migrations; needs database acceptance testing |
| Archive and recovery | Removes content from publication and restores permitted drafts | Existing lifecycle controls; backup restore must be tested before public rollout |
| Moderation | Reviews comments and stories; bans abusive accounts | Existing staff panels and database rules |
| Monitoring | Checks whether the server and database are available | Health reports the MVP's real modes; readiness distinguishes a visitor demo from connected shared services |

## AI use step by step

The visitor writes a question and selects ChatGPT, Gemini or Claude. Tudela prepares a visible text prompt naming the selected city and asking for sources and clear uncertainty. The visitor chooses Copy prompt, opens the selected service and pastes the prompt into their own conversation. Their service may require sign-in, impose a free-use limit or offer paid subscriptions.

Tudela does not transfer GPS, account credentials or private notes with the prompt. It does not automatically read the answer, save it or publish it. If AI-assisted material is later used to author a tour, a person must bring it back as a draft, check facts, confirm media rights and submit it to the normal review process.

The old AI and narration provider source files remain historical code in the recovered project; the running MVP does not expose a route that invokes them. Adding API keys does not enable AI calls in this server.

## Google Maps and cost choices

The default uses standard Google Maps URLs for a stop pin, walking navigation and nearby search. These URLs need no API key. Google receives the destination and, only when explicitly included for a directions link, the origin. The user can continue using Google Maps independently of Tudela.

An optional Maps Embed API map can display the current stop inside Tudela. Google lists Embed usage as no charge, but requires an API key and a billing-enabled project. It is off by default. Interactive custom maps, live place search, geocoding and route calculations are different products and can incur usage charges; they are not included in the zero-budget MVP. Spending alerts alone are not a guaranteed spending cap.

Official sources checked on 13 October 2026: [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Maps Embed billing](https://developers.google.com/maps/documentation/embed/usage-and-billing), and [Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

## Service budget and practical limits

| Service | Initial choice | Consequence |
| --- | --- | --- |
| Website and API | Existing computer, localhost | No new hosting bill; unavailable to other visitors unless separately hosted |
| Google Maps | External URLs | No platform API key; visitors switch apps or tabs for navigation |
| AI | Visitor's own account in an external service | Tudela has no AI API bill; the visitor's chosen service sets its own limits |
| Audio | Human recording or browser device voice | No generated-audio API bill; voice quality and offline behavior vary by device |
| Shared database and accounts | Local Supabase for development, or free hosted Supabase after configuration | Local requires running infrastructure; free hosting has storage, traffic, email and availability limits |
| Media | Existing cleared files and licensed uploads | Images and recordings can dominate storage and download limits; existing files are not automatically rights-cleared |
| Account email | Local development mail capture initially | Real password-reset delivery needs a sender setup; no paid mail service is activated |
| Public hosting | Not provisioned yet | A free plan must be selected only after checking its backend support, sleep behavior and commercial-use terms |
| Backups | Local exports initially | One computer is not a resilient backup; an independent copy is needed before a live pilot |

Supabase currently lists a free plan with a 500 MB database and 1 GB file storage, plus other usage caps. Free projects can pause after inactivity and do not include the same backup guarantees as paid plans. These limits are capacity ceilings, not a promise of free unlimited production operation. [Supabase pricing](https://supabase.com/pricing).

Docker software is installed here but its engine was not running during the initial inspection. Do not count the database stage as complete until it starts and its migrations and tests pass. Docker Desktop licensing depends on usage eligibility; verify applicable terms before using it for a business. [Docker licensing](https://docs.docker.com/subscription/desktop-license/).

## Data and permissions in plain language

An organization owns its cities, tours, stops, translations, files and publishing records. A membership gives an account a role in that organization. Visitor contributions record who submitted them. Review records identify who approved or rejected them. Published records are separated from drafts.

Private sync data is stored under the signed-in account ID. The database has an owner-only rule, and the server checks the token before reading or saving it. Anonymous users cannot read or write shared notes. This change replaces the old global memory store. Cross-device retrieval and conflict handling must be tested in the shared-service stage.

Local storage can be accessed by another person using the same browser profile. Do not use private notes for sensitive personal information on a shared device. Logout behavior and device-data removal are part of the pilot privacy checks.

## What counts as complete

A working screen is not the same as a verified service. The development plan records each stage as implemented, locally tested, awaiting configuration or pending. The visitor stage must build successfully and pass its applicable logic checks. The account and publishing stage must pass real database tests, including a test that one account and organization cannot access another's private data.

Phone testing must cover GPS denial, loss of connection, audio playback, Hebrew layout, large text, a completed tour and Google Maps handoff. A public pilot also needs reviewed content, media permission, a tested backup and a chosen hosting budget. No paid upgrade is assumed.
