# Moreshet MVP

Recreated from Build 1.zip in an isolated project. Budapest is the first pilot. The visitor app and CMS are retained; built-in AI and paid map / narration calls are disabled.

## Start the visitor MVP

Node.js 22 or newer is required. Dependencies are already installed in the current workspace.

```powershell
npm ci
npm run dev
```

Open http://localhost:3220. Or double-click **Start Moreshet MVP.cmd**. Keep the command window open while using the app. No cloud keys or paid account are needed for bundled demonstration tours, reading, device narration, Google Maps navigation links or the personal AI prompt workflow.

The separate editable Word specification and development plan are in **Project Documents/Moreshet Specification and Development Plan.docx**. The separate Israeli-cost budget is in **Project Documents/Moreshet Israeli Build Growth and Operating Budget.docx**. These files are not part of the app and remain local until sharing is requested. Earlier Docs/MVP-Guide.html is retired.

## Shared accounts and CMS

The `/cms` interface is restored but requires a configured Supabase database, memberships and staff login. Do not treat the source as a verified live publishing service. The inherited database has an additional private visitor-sync migration. Docker's engine was not running at inspection; database tests remain pending.

Use local Supabase for development or discuss the free hosted plan before provision. Never paste service keys into chat or commit them. Copy `.env.example` to `.env.local` only when configuring the chosen service.

The local helper has been isolated from previous Moreshet containers using project ID `moreshet_mvp_rebuild` and ports in the 544xx range. 
pm run db:start` downloads and starts local containers; it can consume substantial disk space and RAM. It does not create a paid cloud project. Docker Desktop license eligibility must be checked for the intended organization. 
pm run db:status` prints development credentials; do not share its output. Apply migrations and run 
pm run db:test` before using shared features. Owner bootstrap is a separate step, with a password chosen locally.

## Verify

```powershell
npm run lint
npm run build
npm run test:mvp
npm run test:discovery-tours
npm run test:interest-filter
npm run test:licensed-media-import
npm run test:narration-playback
npm run test:multilingual-stops
```

Some archived checks assert the old AI / Leaflet architecture and are not acceptance tests for this revised MVP. Database-dependent tests require a real local test database. Build success does not imply media rights clearance, historical accuracy, mobile GPS acceptance or production readiness.

## Budget

No paid services are enabled. Google Maps links need no API key. Optional Maps Embed has no usage charge but needs a billing-enabled Google Cloud project and a restricted browser key; it is off. No AI API credentials or generated audio worker are needed. Existing browser read-aloud may depend on the device's voice service. Public hosting, mail delivery and shared accounts require separate setup and a capacity discussion.

See the guide for the eight development stages, every visitor and CMS working part, operating limits and remaining verification.


## Online frontend preview

Run npm run build:frontend to build the sample-tour frontend into frontend-dist. GitHub Actions publishes only that directory to GitHub Pages. Account login and shared publishing are clearly marked as unavailable in this preview. Private project documents and server code are excluded from the site. The regular local server build remains available for backend development.

