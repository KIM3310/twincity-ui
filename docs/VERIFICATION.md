# TwinCity UI — implementation and verification

Reviewed 2026-09-07. The repository and linked tests define the evidence; a preview alone does not establish production readiness.

### One active transport

A connection generation invalidates callbacks from older attempts. Failed connections advance to the next configured transport; polling waits for the prior response before scheduling again.

### Share the UI, keep the scope visible

The static preview imports the production React console. Its synthetic mode is identified on screen; Next.js remains the server-backed application.

### Load 3D on demand

Three.js loads when the user selects the 3D view, keeping the initial 2D console lighter.

## Reproduce

```sh
npm ci
npm run verify
npm run dev:preview
```

157 tests passed, including transport failure, stale callback rejection, slow-poll ownership and real HTTP recovery. Both the Next.js app and a static interactive preview build from the same console components.

## Boundaries

The public preview uses synthetic events and checked-in spatial assets. It has no external event source or server-side report API. Source links explain server-only routes. The streaming failure test injects SSE unavailability; it is not a deployed SSE integration or a production reliability measurement.

## Attribution

This page describes capabilities visible in the repository. It does not independently establish which lines were written manually, with AI assistance, or by collaborators. The commit history and pull-request diffs preserve the implementation trail; individual/team contribution percentages have not been inferred.

[Back to the project](../README.md)
