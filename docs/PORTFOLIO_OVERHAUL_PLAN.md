# Portfolio Overhaul Plan

## Starting point
- Use the existing cleanup/handoff audit thread in `.omx/plans/twincity-ui-cleanup-handoff-plan.md` as the baseline.
- Preserve the current strengths: demo-first honesty, reviewable API surfaces, deterministic route contracts, and the dispatch/handoff/report story.

## Scope
1. Tighten the portfolio narrative in repo entry points (`README*`, docs).
2. Make the landing / proof surface easier for recruiters and reviewers to scan by role.
3. Improve repo/devex hygiene with low-risk metadata and verification affordances.
4. Remove small metadata drift so evidence counts and proof artifacts stay in sync.

## Planned passes
1. **Docs / proof framing**
   - Add a concise portfolio review guide for AI engineer / systems / solution architect lenses.
   - Refresh README entry points so the fastest proof path is obvious.
2. **Landing / review UX**
   - Add recruiter-friendly role-signal cards and a compact reviewer kit on `/`.
   - Preserve the existing route order (`health -> reports -> events`).
3. **Metadata / hygiene cleanup**
   - Add a first-class verification script and explicit Node engine metadata.
   - Strengthen app metadata for cleaner share / public presentation.
4. **Low-risk code cleanup**
   - Derive evidence counts from a shared evidence registry instead of hardcoding them.
   - Add regression coverage for proof-surface metadata and landing-page copy anchors.

## Acceptance criteria
- A reviewer can identify the repo’s role, strongest proof path, and hiring-signal story within ~2 minutes.
- The landing page exposes role-specific proof cues without changing existing route behavior.
- README/docs clearly point to the fastest review path and verification commands.
- Service metadata stays internally consistent without manual evidence-count updates.
- Relevant checks pass: targeted tests during cleanup, then lint, typecheck, test, build.

## Risks / watchouts
- Over-marketing the project would weaken credibility; keep claims concrete and route-backed.
- Hardcoded counts or links can drift as artifacts change; prefer derived metadata.
- Homepage copy changes can regress scanability; keep sections compact and test for anchor text.
