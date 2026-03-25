# TwinCity UI — Digital Twin Ops Console

> **Archived / Supporting repo**  
> The active operator-surface story now lives primarily in **AegisOps**, **ops-reliability-workbench**, and the manufacturing-facing control surfaces.  
> Keep this repo as historical proof for the spatial / digital-twin operations console lane.

[![CI](https://github.com/KIM3310/twincity-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/KIM3310/twincity-ui/actions/workflows/ci.yml)
![Node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

Next.js (React/TypeScript) operations console for spatial event management. Overlays zones and events on a floorplan, connecting the spatial view to the full operator workflow: ingest, normalization, triage, dispatch, SLA reporting, and shift handoff.

![Ops console screenshot](public/screenshots/ops_console.png)

## What I built

- End-to-end operator UX: live/history views, filters, detail panel, action timeline, list/map/detail sync
- Transport fallback chain: WebSocket -> SSE -> HTTP polling with auto-retry
- Event normalization: inconsistent provider payloads -> single `EventItem` schema
- Spatial mapping: percent/world/bbox -> normalized coordinates with camera homography support
- Reporting: SLA summary, dispatch board, shift handoff, export routes

## Quick start
```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:3000/events`.

## Review this first

If you only have a minute, use this order:

1. `/api/proof-route-map` — pick the right first proof lane before opening the full console
2. `/api/health` — confirm whether the console is in demo mode or attached to live ingest
3. `/api/meta` — read the trust boundary and evidence bundle
4. `/api/runtime-scorecard` — inspect ingest posture and SLA summary together
5. `/reports` — see the dispatch, handoff, and export surfaces that make the operator story concrete

## Verify
```bash
npm run test:proof
npm run verify
```

## Key routes

- `/events` - Main operator console
- `/reports` - SLA, dispatch, handoff, export
- `/api/health` - Ingest mode + readiness
- `/api/proof-route-map` - Front-door reviewer route chooser
- `/api/meta` - Trust boundary + evidence bundle
- `/api/runtime-scorecard` - Ingest posture + SLA snapshot
- `/api/reports/summary` - Deterministic SLA summary
- `/api/reports/dispatch-board` - Attention / dispatch / resolved queues
- `/api/reports/handoff` - Next-shift digest + overdue risk
- `/api/reports/export` - JSON / CSV report export

## Live sources (optional)

Create `.env.local` from `.env.local.example`:

```bash
NEXT_PUBLIC_EVENT_WS_URL=wss://example.com/events
NEXT_PUBLIC_EVENT_STREAM_URL=https://example.com/events/stream
NEXT_PUBLIC_EVENT_API_URL=https://example.com/events
NEXT_PUBLIC_EVENT_POLL_MS=5000
```

Without live sources, the app runs in demo mode with mock data.

## Mock endpoints
- `GET /api/mock/events?shape=a&count=4`
- `GET /api/mock/events?shape=b&count=4`
- `GET /api/mock/events?shape=single`
- `GET /api/mock/events?shape=edge&count=4`

## Docs
- `docs/LIVE_INTEGRATION.md` - Payload examples + transport fallbacks
- `docs/ops/RUNBOOK.md` - Operator/release guidance
- `docs/ops/POSTMORTEM_TEMPLATE.md` - Incident follow-up template

## Current limitations
- Demo mode doesn't cover auth, backpressure, or central persistence
- Reports summarize browser-local state, not a central store
- 3D routes are experimental, not production-grade

## Next
- Deeper report aggregation beyond handoff + replay
- More adapters for edge-device / VLM payload variants
- Better calibration tooling for camera homography
