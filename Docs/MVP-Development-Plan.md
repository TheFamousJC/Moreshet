# Moreshet MVP staged development plan

Version 1, 13 October 2026. First pilot: Budapest. Budget target: zero new service spending during local development. Each stage updates the technical specification and verification log before being called complete.

## Starting position

Build 1.zip contains a substantial React visitor app, an Express server, a staff CMS, Supabase migrations and feature checks. It is ahead of a blank prototype. Previous production documents and test reports describe the earlier build and are not proof that this restored copy is deployed or verified.

The rebuild keeps that investment and changes three architectural choices: AI opens the visitor's own service, Google Maps navigation uses external links, and account sync is authenticated and private. Do not estimate completion from source-file count.

## Stage 1 Restore and establish the baseline

Deliverables: isolated Moreshet project, locked dependencies, feature inventory, local start command, a build result and a first verification log. Keep SubFinder and its GitHub repository separate. Do not run archived deployment or backup scripts as part of extraction.

Completion gate: the restored app builds and its source can be inspected without live keys. Identify any baseline failures and database-dependent tests separately.

## Stage 2 Apply the zero budget operating model

Deliverables: copy-and-open personal AI workflow; Google Maps stop search and walking navigation; disabled AI, generated narration, paid Routes, paid Places and automatic geocoding endpoints; owner-protected visitor sync; updated privacy disclosure and service budget.

Completion gate: automated checks prove AI endpoints cannot generate responses, no paid map request is made, malformed coordinates are rejected, and anonymous sync cannot read or write notes. A test must confirm that adding legacy AI keys does not activate the old runtime.

## Stage 3 Demonstrate the visitor MVP

Deliverables: Budapest discovery and ordered tour stops; stop details; saved content and notes; recorded or device audio; location controls; offline behavior; personal AI handoff; clear demonstration-content labels. Keep the existing cities available.

Completion gate: run a tour from selection to completion on desktop and a phone. Confirm GPS permission denial is handled, simulated GPS is labeled, Google Maps opens the correct stop, and audio can be paused. Offline mode must not claim offline maps or AI. List any unverified phone behavior.

## Stage 4 Connect accounts and the shared database

Deliverables: configured local Supabase, applied migrations including visitor_state, owner bootstrap, sign-up and login, password-recovery development flow, private sync, published catalogue and media storage. If local infrastructure is impractical, discuss the free hosted plan's limits before provisioning it.

Completion gate: database migrations and row-permission tests pass. Two test accounts must be isolated; two organizations must be isolated. Guest access must expose published content only. Demonstrate save and retrieve using a real account. Document credentials setup without publishing secrets.

Current external dependency: Docker Desktop's engine is not running. It is not a code-completion gate for visitor demos, but it blocks verification of a local shared database.

## Stage 5 Verify content authoring and publishing

Deliverables: city, tour and stop editing; multilingual transcripts; manual coordinates; image and recording uploads; source records; draft import; review, revisions, publish, archive and restore. Visitor suggestions must become drafts for review rather than publishing themselves.

Completion gate: an editor creates a Budapest tour, a reviewer requests and approves a correction, and permitted staff publish it. The visitor sees only the approved version. An editor must not gain reviewer permissions by changing a request. Check file type, size and rights metadata.

## Stage 6 Verify community and offline behavior

Deliverables: ratings, moderated comments, likes, share links, heritage stories, banning, saved-tour recovery, device preferences and account isolation. Implement or correct any gaps revealed by real database tests.

Completion gate: comments and stories are not public before approval; account restrictions apply; cached content remains useful after connection loss. Sync conflicts and deletion have a documented behavior. No hidden global notes store remains.

## Stage 7 Prepare a small real visitor pilot

Deliverables: historical and coordinate review, cleared media, translated revised screens, accessible mobile testing, privacy and support wording, backups and one pilot tour. Validate practical venue information with current official sources.

Completion gate: at least one complete on-location pilot is reviewed, critical issues are corrected and a restore test succeeds. Update the guide so a nontechnical tester can run the tour without developer assistance.

## Stage 8 Choose public hosting only when needed

Deliverables: an explicit hosting decision and budget, HTTPS, provider configuration, health monitoring and deployment procedure. No migration to paid services without a cost discussion. Public availability is a separate deliverable from pushing source to GitHub.

Completion gate: confirm free-plan eligibility and actual caps, sleep behavior, account-email delivery and storage growth. If a free plan cannot support the agreed pilot, record the limitation and cheapest viable alternative before changing the operating model.

## Order and progress reporting

Work through Stages 1–3 immediately using local and bundled data. Stages 4–6 reuse the archived schema and CMS instead of rewriting them. Stage 7 follows once shared service behavior is verified. Stage 8 is a budget decision, not an automatic action.

After each meaningful change, update MVP-Technical-Spec.md, MVP-Verification.md and the feature inventory. State what passed, what needs keys or infrastructure, and what a tester can try now. There is no fixed completion percentage until all gates have evidence.
