# Review Guide - TwinCity UI — Digital Twin Ops Console

Updated: 2026-05-30

Use this page as the short path through the repository. It keeps the review grounded in the code, docs, commands, and boundaries that are already present.

## Summary

| Field | Notes |
|---|---|
| Lane | B2B spatial operations UX |
| Core idea | Supporting spatial console proof for incident zones, dispatch, SLA reporting, and shift handoff. |
| Primary reader | Facilities, city operations, industrial command centers, and spatial event teams. |
| Stack | TypeScript/JavaScript, Terraform, Cloudflare, Docker |

## Open First

1. Start with the README fast path and architecture section.
2. Open `docs/monetization-playbook.md` only when reviewing the product or service angle.
3. Check the commands below before making claims about quality.
4. Skim the CI workflows and fixture data before deeper implementation review.
5. Read the boundaries section before presenting the project externally.

## Checks

| Purpose | Command |
|---|---|
| Full local gate | `make verify` |
| Test suite | `make test` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Production build | `npm run build` |

## CI

- .github/workflows/architecture-blueprint.yml
- .github/workflows/ci.yml
- .github/workflows/dependency-review.yml
- .github/workflows/pages-auto-deploy.yml
- .github/workflows/production-smoke.yml
- .github/workflows/repository-health.yml
- .github/workflows/repository-surface.yml
- .github/workflows/secret-scan.yml

## Evidence

- package scripts and web/runtime checks
- infrastructure-as-code review surface
- edge deployment configuration
- containerized delivery path
- npm run verify passes
- Hosted runtime is documented
- Proof route map works

## Commercial Notes

| Possible offer | Working price assumption |
|---|---|
| Spatial ops cockpit prototype | $3k-$10k UX review |
| Digital twin UX review | $10k-$40k prototype |
| Dispatch/reporting starter | $2k-$8k/month reporting support |

## Boundaries

- Archived/supporting status clear
- Live ingest requires tenant controls
- Demo mode boundaries explicit

## Useful Metrics

- Dispatch clarity
- SLA report usefulness
- Event normalization coverage
