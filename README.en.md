# TwinCity UI — English Architecture Entry

If you only read one repo-side document, start with:
- `README.md`
- `docs/architecture-pack.md`

TwinCity UI is a **product-focused digital twin / operations control tower** built with Next.js, React, and TypeScript. The repo is strongest when inspected as an operator system that makes the full loop inspectable:

`ingest posture -> payload normalization -> triage -> dispatch -> SLA/report -> shift handoff`

## Product and System Surface

A digital-twin operations surface that preserves spatial, real-time, and control-room UI craft as a focused interface study.

| Lens | Definition |
|---|---|
| Technical stack | Next.js, React, TypeScript, realtime event ingestion, report export, dispatch workflow, and runtime metadata APIs. |
| Architecture path | Validate the demo, README, architecture notes, and quality gate before deeper workflow architecture. |
| System signal | Next.js/React surface, digital-twin framing, realtime posture, and spatial-computing interaction notes. |
| Safety boundary | Treat as a UI concept unless connected to approved telemetry, authentication, and incident workflows. |
| Fast path | Run the local app/build and inspect the first screen for operator clarity and responsive behavior. |

## Fast architecture path
1. `/api/health`
2. `/api/meta`
3. `/api/runtime-scorecard`
4. `/api/reports/handoff`
5. `/reports`
6. `/events`

## Why it is architecture-relevant
- **AI / systems engineering:** heterogeneous payloads are normalized into one operator-facing contract.
- **Product / platform engineering:** runtime posture is visible before the UI walkthrough.
- **Solution architecture:** dispatch, handoff, export, and docs line up into one explainable operating model.
- **Credibility:** demo mode is explicit instead of being disguised as production.

## High-signal files
- `src/lib/eventAdapter.ts`
- `tests/eventAdapter.test.ts`
- `tests/runtimeRoutes.test.ts`
- `docs/architecture-pack.md`
- `docs/LIVE_INTEGRATION.md`
- `docs/ops/RUNBOOK.md`
- `public/screenshots/ops_console.png`

## Verification
```bash
npm ci
npm run test:proof
npm run verify
```

## Live source configuration (optional)
```bash
NEXT_PUBLIC_EVENT_WS_URL=wss://example.com/events
NEXT_PUBLIC_EVENT_STREAM_URL=https://example.com/events/stream
NEXT_PUBLIC_EVENT_API_URL=https://example.com/events
NEXT_PUBLIC_EVENT_POLL_MS=5000
```

If nothing is configured, the app remains inspectable in demo mode.

## Honest limits
- Demo mode does not prove backend auth, noisy live traffic handling, or central persistence.
- Reports summarize browser-local runtime state rather than a central incident store.
- 3D routes are probe/architecture surfaces, not production rendering claims.
