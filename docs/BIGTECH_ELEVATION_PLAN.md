# Big-Tech Elevation Plan

## Hiring Thesis

Turn `twincity-ui` into a `spatial operations console` proof rather than a strong digital twin demo. The hiring story should be: this repo handles stateful operations, replay, dispatch, and handoff in a complex UI without losing system clarity.

## 30 / 60 / 90

### 30 days
- Add a first-class replay mode that lets reviewers scrub through event history and operator decisions.
- Add permissioned operator actions so assignment, escalation, and resolution routes have role boundaries.
- Add one canonical dispatch drill that shows payload normalization, queue impact, and handoff output together.

### 60 days
- Add a spatial action engine that links zones, incidents, and recommended next actions.
- Add richer timeline annotations for operator notes, escalations, and shift changes.
- Add a route-level runtime contract for event replay, report export, and assignment history.

### 90 days
- Add one case study that starts with noisy event intake and ends with shift-ready handoff proof.
- Add a design/architecture note explaining how the UI avoids becoming a map-only toy.
- Add a mobile/tablet operator mode if it can be shown without degrading the system narrative.

## Proof Surfaces To Add

- `GET /api/replay-board`
- `GET /api/action-center`
- `GET /api/assignment-history`
- `GET /api/shift-drill`

## Success Bar

- The repo demonstrates operational UX under real state pressure.
- The map is clearly subordinate to operator outcomes.
- Big-tech frontend and systems reviewers can both find a hard problem worth discussing.
