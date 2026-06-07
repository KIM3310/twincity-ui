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

Technical walkthrough pack: [`docs/technical-review-pack.md`](docs/technical-review-pack.md)

![Ops console screenshot](public/screenshots/ops_console.png)

## Product and Review Surface

| Lens | Decision signal |
|---|---|
| Reviewer | Facilities, city operations, and industrial command centers that need spatial incidents, dispatch, and SLA evidence in one console. |
| Product proof | The demo, workflow loop, and static proof surface show the current product direction without extra claims. |
| Reviewer proof | `/api/proof-route-map`, `/api/health`, `/api/meta`, runtime scorecard, reports, and screenshot evidence create a fast evaluation path. |
| Safety posture | Demo-mode defaults, trust-boundary metadata, normalized ingest, and explicit fallback behavior keep the archived surface understandable and low-risk. |

## Reviewer Fast Path

- **First minute:** Use `/api/proof-route-map`, then open `/events` and `/reports`.
- **Local demo:** Run `npm ci && npm run dev`, then open `http://127.0.0.1:3000/events`.
- **Verification:** Run `npm run test:proof` for proof routes or `npm run verify` for the full gate.

## Service Launch Playbook

- [Service launch playbook](docs/service-launch-playbook.md) maps the repository to review audiences, proof gates, operating boundaries, and risk controls.

## Review Notes

- [Review guide](docs/reviewer-evidence-map.md) summarizes the project angle, first files to inspect, verification commands, and known boundaries.
- [Quality notes](docs/quality-gate.md) lists the local checks, CI surface, and release expectations for this repository.
- [Enterprise readiness notes](docs/enterprise-readiness.md) outlines security, data, operations, integration, and handoff expectations.

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

## Walk Through This First

If you only have a minute, use this order:

1. `/api/proof-route-map` — pick the right first proof lane before opening the full console
2. `/api/health` — confirm whether the console is in demo mode or attached to live ingest
3. `/api/meta` — read the trust boundary and evidence bundle
4. `/api/runtime-scorecard` — inspect ingest posture and SLA summary together
5. `/reports` — see the dispatch, handoff, and export surfaces that make the operator story concrete

## Hosted runtime

- Live runtime: `https://twincity-ui-app-811356341663.asia-northeast3.run.app`
- Public Pages front door: `https://twincity-ui.pages.dev` → redirects to the live runtime

## Verify
```bash
npm run test:proof
npm run verify
```

## Key routes

- `/events` - Main operator console
- `/reports` - SLA, dispatch, handoff, export
- `/api/health` - Ingest mode + readiness
- `/api/proof-route-map` - Front-door operator route chooser
- `/api/meta` - Trust boundary + evidence bundle
- `/api/runtime-scorecard` - Ingest posture + SLA snapshot
- `/api/public-apis` - Korean public API enrichment readiness
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

Optional Korean public-data enrichment is exposed through `/api/public-apis`.
The readiness registry is aligned with [public-apis-4Kr](https://github.com/yybmion/public-apis-4Kr) and checks for server-side provider secrets such as `SEOUL_OPEN_DATA_API_KEY`, `KMA_API_KEY`, `AIRKOREA_API_KEY`, and `PUBLIC_SAFETY_API_KEY` without returning secret values.

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

## Cloud + AI Architecture

This repository includes a neutral cloud and AI engineering blueprint that maps the current proof surface to runtime boundaries, data contracts, model-risk controls, deployment posture, and validation hooks.

- [Cloud + AI architecture blueprint](docs/cloud-ai-architecture.md)
- [Machine-readable architecture manifest](docs/architecture/blueprint.json)
- Validation command: `python3 scripts/validate_architecture_blueprint.py`

## Enterprise Productization

- [Product operating model](docs/product-operating-model.md) defines the reviewer, trust boundary, trust boundary, operating checks, and service path for this repository.

## Service Architecture

- [Service architecture](docs/service-architecture.md) defines the cloud resources, account information, cost controls, and production guardrails needed to turn this repo into a scoped service without publishing public financial assumptions.
