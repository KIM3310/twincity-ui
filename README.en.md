# TwinCity UI — English Review Entry

If you only read one repo-side document, start with:
- `README.md`
- `docs/PORTFOLIO_REVIEW_GUIDE.md`

TwinCity UI is a **product-focused digital twin / operations control tower** built with Next.js, React, and TypeScript. The repo is strongest when reviewed as an operator system that makes the full loop inspectable:

`ingest posture -> payload normalization -> triage -> dispatch -> SLA/report -> shift handoff`

## Fast review path
1. `/api/health`
2. `/api/meta`
3. `/api/runtime-scorecard`
4. `/api/reports/handoff`
5. `/reports`
6. `/events`

## Why it is portfolio-relevant
- **AI / systems engineering:** heterogeneous payloads are normalized into one operator-facing contract.
- **Product / platform engineering:** runtime posture is visible before the UI walkthrough.
- **Solution architecture:** dispatch, handoff, export, and docs line up into one explainable operating model.
- **Credibility:** demo mode is explicit instead of being disguised as production.

## High-signal files
- `src/lib/eventAdapter.ts`
- `tests/eventAdapter.test.ts`
- `tests/runtimeRoutes.test.ts`
- `docs/PORTFOLIO_REVIEW_GUIDE.md`
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

If nothing is configured, the app remains reviewable in demo mode.

## Honest limits
- Demo mode does not prove backend auth, noisy live traffic handling, or central persistence.
- Reports summarize browser-local runtime state rather than a central incident store.
- 3D routes are probe/review surfaces, not production rendering claims.
