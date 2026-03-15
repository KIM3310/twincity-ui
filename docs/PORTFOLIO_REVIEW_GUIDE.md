# TwinCity UI Portfolio Review Guide

Use this repo as a **proof-first digital twin / control tower** example, not as a map-only visual demo.

## What this repo is strongest at
- Turning messy event feeds into a consistent operator-facing contract.
- Making runtime posture, dispatch state, handoff risk, and export surfaces reviewable without external infrastructure.
- Showing a product story that connects **ingest -> normalization -> triage -> dispatch -> report -> handoff**.

## Fastest 2-minute review path

| Step | Open | What it proves |
| --- | --- | --- |
| 1 | `/api/health` | Whether the repo is demo-first or live-wired, and which review-safe routes exist |
| 2 | `/api/meta` | Trust boundary, stage ownership, evidence bundle, and review flow |
| 3 | `/api/runtime-scorecard` | Runtime posture, export governance, and deterministic SLA snapshot |
| 4 | `/api/reports/handoff` | Next-shift priorities, overdue queue risk, and operator continuity |
| 5 | `/reports` | Human-readable control-tower surface that matches the route contracts |
| 6 | `/events` | End-user operator console with queue, map, detail, and timeline behavior |

## Role-fit evidence map

### Frontier / LLM / AI engineer
Look for:
- `src/lib/eventAdapter.ts`
- `tests/eventAdapter.test.ts`
- `/api/reports/summary`
- `/api/schema/report`

Why it matters:
- The repo does real schema normalization work instead of hand-wavy AI copy.
- Provider payload variability is made explicit and testable.
- Output contracts are reviewer-safe and deterministic.

### Systems / product engineer
Look for:
- `/api/health`
- `/api/meta`
- `/api/runtime-brief`
- `/api/runtime-scorecard`
- `tests/runtimeRoutes.test.ts`

Why it matters:
- Runtime posture is inspectable before touching the UI.
- Demo vs live trust domains are separated instead of blurred.
- Reviewers can validate behavior through contracts, not screenshots alone.

### Solution architect / field architect
Look for:
- `/api/reports/dispatch-board`
- `/api/reports/handoff`
- `/api/reports/export`
- `/reports`
- `docs/LIVE_INTEGRATION.md`
- `docs/ops/RUNBOOK.md`

Why it matters:
- The project exposes an explainable operating model: ingest, triage, SLA posture, handoff, export.
- Integration and ops surfaces are concrete enough to discuss rollout, ownership, and risk.
- The system is honest about what is local/demo versus production-shaped.

## Repo evidence bundle
- `README.md` — repo entry point and fastest proof path
- `docs/LIVE_INTEGRATION.md` — transport / payload contract details
- `docs/ops/RUNBOOK.md` — operator and release guidance
- `docs/ops/POSTMORTEM_TEMPLATE.md` — downstream incident follow-up artifact
- `public/screenshots/ops_console.png` — operator UI proof

## Honest limits to mention in interviews
- Demo mode is intentionally strong, but it does not replace backend auth, noisy live traffic, or multi-tenant persistence concerns.
- Reports summarize browser-local demo/runtime state rather than a central incident store.
- 3D asset routes are review/probe surfaces, not a production rendering claim.

## Local verification
```bash
npm ci
npm run test:proof
npm run verify
```

## One-sentence positioning
**TwinCity UI is a demo-first but review-serious digital twin ops console that makes runtime posture, operator decisions, dispatch lanes, and shift handoff proof readable in one pass.**
