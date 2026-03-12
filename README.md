# TwinCity UI — Digital Twin Ops Console

TwinCity UI is a Next.js (React/TypeScript) operations console that overlays **Zones (polygons)** and **Events (points)** on a floorplan, so an operator can triage alerts faster by combining:

- Spatial context (where it happened)
- Event context (what happened, severity, status)
- Workflow context (acknowledge, dispatch, resolve + timeline)
- Dispatch board context (attention / dispatch / resolved queue posture)
- Shift handoff context (next-shift digest, overdue ACK/resolve risk, copy-ready handoff brief)

The repo is already **reviewable end-to-end without external infrastructure**, and the feature surface keeps expanding through the same operator workflow:
- Demo mode includes local mock feeds + replay tools.
- Live sources can be wired via WebSocket / SSE / HTTP polling (with graceful fallback).

![Ops console screenshot](public/screenshots/ops_console.png)

## Portfolio posture
- Read this repo like a physical-ops control tower with a demo-first feed, not like a map-only digital-twin showcase.
- The strongest proof is the full operator loop: health/meta -> event triage -> dispatch board -> handoff/export.

## Role signals
- **AI / systems engineer:** real-time normalization, spatial mapping, and bulk operator actions all matter here.
- **Solution / cloud architect:** live/demo feed modes, dispatch board, and reporting surfaces make the ops boundary easy to explain.
- **Field / solutions engineer:** map -> queue -> report 흐름이 자연스러워서 digital-twin 데모를 빠르게 보여줄 수 있습니다.

## Runtime vs review/site surfaces
- Primary runtime: the Next.js app in `src/` powers `/events`, `/reports`, and the `src/app/api/*` routes.
- Review/site surfaces: `/about` plus the policy/compliance pages are public-facing review surfaces; `docs/` is supporting integration guidance.
- Repo map: `public/` stores static assets, `tests/` covers verification, and `tools/` contains mock/replay helpers.

## What I Owned (Team Project)
- End-to-end operator UX: Live/History views, filters, detail panel, action timeline, settings, and list ↔ map ↔ detail sync
- Reliability work: WS → SSE → HTTP polling fallback, connection state + auto-retry, demo-first mock feeds + replay
- Normalization layer (“ontology adapter”): unify inconsistent provider payload shapes into a single `EventItem` schema
- Spatial mapping: percent/world/bbox → normalized 0..1, optional camera homography, and snap-to-walkable zones (holes supported)

## Quickstart
```bash
npm ci
npm run dev
```
Open `http://127.0.0.1:3000/events`.

## Current Demo Scope (Works Today)
- Demo-first: runs locally with mock feeds (no backend required)
- Operator workflow: list/map selection sync, timeline actions (ACK/dispatch/resolve), local state restore, keyboard navigation
- Shift handoff workflow: deterministic next-shift digest, overdue queue posture, and copy-ready handoff brief
- Payload normalization: multiple provider shapes → one `EventItem` schema (adapter)
- Coordinate mapping + snapping: percent/world/bbox → normalized (0..1) and snapped to valid walkable areas
- Engineering rigor: CI (lint/test/build), runbook, postmortem template

## Next (In Progress)
- Expand “Reports” view beyond handoff + replay into deeper aggregation
- More adapters for edge-device/VLM payload variants
- Additional calibration tooling for camera homography

## Live Sources (Optional)
Create `.env.local` from `.env.local.example` and set one or more:
```bash
# Priority: WS -> SSE -> HTTP polling
NEXT_PUBLIC_EVENT_WS_URL=wss://example.com/events
NEXT_PUBLIC_EVENT_STREAM_URL=https://example.com/events/stream
NEXT_PUBLIC_EVENT_API_URL=https://example.com/events
NEXT_PUBLIC_EVENT_POLL_MS=5000

# Community integrations (optional)
NEXT_PUBLIC_FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxxx
NEXT_PUBLIC_DISQUS_SHORTNAME=your-shortname
NEXT_PUBLIC_DISQUS_IDENTIFIER=twincity-about
NEXT_PUBLIC_GISCUS_REPO=owner/repo
NEXT_PUBLIC_GISCUS_REPO_ID=R_kgxxxx
NEXT_PUBLIC_GISCUS_CATEGORY=General
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_kwxxxx

# AdSense (optional)
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADSENSE_SLOT=1234567890
```

## Local Mock Endpoint (Demo)
- `GET /api/mock/events?shape=a&count=4`
- `GET /api/mock/events?shape=b&count=4`
- `GET /api/mock/events?shape=single`
- `GET /api/mock/events?shape=edge&count=4`

## Key Routes
- `/events`: main operator console
- `/reports`: replay + aggregation view
- `/api/health`: ingest mode + readiness links
- `/api/runtime-brief`: review-first contract for exports, live source posture, and route count
- `/api/meta`: control tower trust boundary + evidence surface
- `/api/schema/report`: report contract for CSV/summary exports
- `/api/reports/dispatch-board`: compact triage queue board for attention / dispatch / resolved lanes
- `/about`: product intro + community + sponsored slot
- `/about`, `/privacy`, `/terms`, `/contact`, `/compliance`: policy/compliance pages for review

AdSense crawl helpers are provided in `public/ads.txt`, `public/robots.txt`, `public/sitemap.xml`, and `public/_headers`.

## Docs
- English: `README.en.md`
- Korean: `README.ko.md`
- Live integration (API contract + payload examples + fallbacks): `docs/LIVE_INTEGRATION.md`

## Key Endpoints
- `docs/ops/RUNBOOK.md`
- `docs/ops/POSTMORTEM_TEMPLATE.md`
- `src/app/api/meta/route.ts`
- `src/app/api/schema/report/route.ts`
- `.github/workflows/ci.yml` (CI: lint + test + build)

## Service-Grade Surfaces
- `Control Tower Readiness` board on `/`, `/brand`, `/reports`
- `GET /api/runtime-brief` for ingest/export posture
- `GET /api/reports/dispatch-board` for compact unresolved queue posture before export
- `ops-envelope-v1` ingest contract surfaced through `/api/health` and `/api/meta`
- `twincity-report-v1` report schema surfaced through `/api/schema/report`
- reviewer flow: `health -> runtime brief -> meta -> dispatch board -> events -> reports`

## Review Flow

1. Open `/api/health` to confirm whether the control tower is demo-first or live-wired.
2. Read `/api/meta` for trust boundary, stage ownership, and review artifacts.
3. Use `/api/reports/dispatch-board` to confirm unresolved queue posture.
4. Open `/reports` to validate SLA proof and export posture.
5. Use `/events` to inspect one alert through triage, dispatch, and timeline state.

## Supporting Files

- `/api/health`
- `/api/meta`
- `/api/reports/dispatch-board`
- `/reports`
- `public/screenshots/ops_console.png`

## Glossary (first-time readers)
- WS: WebSocket
- SSE: Server-Sent Events
- SLA: Service Level Agreement (time-to-ack / time-to-resolve targets)

## Local Verification
```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Repository Hygiene
- Keep runtime artifacts out of commits (`.codex_runs/`, cache folders, temporary venvs).
- Prefer running verification commands above before opening a PR.
