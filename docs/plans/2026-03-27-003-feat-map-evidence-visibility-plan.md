---
date: 2026-03-27
topic: map-evidence-visibility
status: active
origin: docs/brainstorms/2026-03-27-map-evidence-visibility-requirements.md
---

# Map Evidence Visibility Plan

## Problem Frame

The live screening evidence flow already works, but the map card still looks static and disconnected from `Sync latest evidence`. This weakens the live-ingest moment for judges because the strongest visual panel on the Signal step does not visibly acknowledge the refresh. The fix should make the map card react clearly while staying honest that geometry remains sketch-level, not live satellite localization.

This plan is grounded in [2026-03-27-map-evidence-visibility-requirements.md](D:\oil\Duo-Galym-Dauren-Project\docs\brainstorms\2026-03-27-map-evidence-visibility-requirements.md).

## Scope Boundaries

- Do not change anomaly coordinates or `sitePosition`.
- Do not introduce MapLibre or any real geospatial layer in this unit.
- Do not change backend sync semantics or incident promotion logic.
- Do not make the map card the primary evidence surface; the existing evidence card stays primary.

## Research Summary

### Repo patterns to follow

- The Signal step already keeps all live evidence in `pipelineStatus.screeningSnapshot` in [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx).
- The map card is a simple sketch with dot markers in [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx).
- The current map copy and FAQ positioning live in [site-content.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\site-content.ts).
- Existing map and dot styling lives in [globals.css](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\globals.css).

### Planning decision

Proceed without external research. The codebase already has the live evidence state, the map sketch, localized copy infrastructure, and animation-ready CSS. This is a repo-shaped UX integration problem, not a framework or API unknown.

## Requirements Trace

- R1 -> map card gets a post-sync visible state without coordinate changes
- R2 -> add compact evidence strip sourced from `screeningSnapshot`
- R3 -> contextual map note explains static sketch + live evidence
- R4 -> lead anomaly dot gets temporary emphasis only on successful fresh sync
- R5 -> degraded/unavailable states remain visually honest
- R6 -> seeded reset clears all live-specific map-card state

## Key Decisions

- Use `screeningSnapshot` and current sync state as the only inputs for the map-card reaction. No parallel state model should be introduced.
- Treat the “live reaction” as view state, not data mutation. The anomalies remain seeded; only the map card presentation changes.
- Keep the lead-dot emphasis transient and modest. This should read as operator feedback, not as fake telemetry.
- Reuse the existing localized copy system for map note text rather than hardcoding strings in the component.
- Do not add a frontend test harness in this unit. The repo currently has no web test runner, so verification stays at build + manual live rehearsal.

## Implementation Units

- [x] **Unit 1: Derive map-card live posture from existing evidence state**
  Goal: make the Signal-step map card compute a contextual note, compact evidence strip, and dot-emphasis trigger from existing sync/evidence state.
  Files:
  - [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx)
  - [site-content.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\site-content.ts)
  Approach:
  - derive a small map-card presentation model from `pipelineStatus.screeningSnapshot`, `pipelineStatus.state`, `pipelineStatus.source`, and the selected/strongest anomaly
  - add localized contextual map-note variants for seeded, fresh live, degraded, and unavailable states
  - render a compact evidence strip inside the map card using current/baseline/delta/synced values when available
  - only show the strongest transient “fresh live” reaction when the sync completed successfully and evidence is fresh
  Patterns to follow:
  - reuse the existing `screeningText` / `copy` localization pattern
  - reuse existing `formatPpb()` and `formatDelta()` helpers instead of inventing a second formatter path
  Execution note:
  - UI-first; keep state derivation simple and colocated with the Signal step unless duplication forces extraction
  Test files:
  - none in this unit; see Verification
  Verification:
  - build passes
  - map note changes between seeded and live states
  - evidence strip shows live values when present and honest fallbacks when not
  - no coordinate movement occurs

- [x] **Unit 2: Add stage-safe visual emphasis to the lead dot and map card**
  Goal: create a visible but honest “sync happened here” reaction inside the sketch card.
  Files:
  - [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx)
  - [globals.css](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\globals.css)
  Approach:
  - add a transient class/state for the lead anomaly dot after successful fresh sync
  - style a restrained pulse/halo or refreshed badge anchored to the lead dot or map-card header
  - ensure degraded/unavailable states do not reuse the celebratory pulse
  - ensure seeded reset removes all live emphasis immediately
  Patterns to follow:
  - match the existing `map-dot` / `map-dot-active` styling
  - keep motion consistent with current page transitions and avoid adding a second strong animation language
  Execution note:
  - characterization-first on the reset/degraded paths; preserve current static sketch as the safe baseline
  Test files:
  - none in this unit; see Verification
  Verification:
  - successful fresh sync visibly changes the map card within 2-3 seconds
  - degraded/unavailable states update copy but do not pulse
  - seeded reset clears note, strip posture, and emphasis

- [x] **Unit 3: Align demo narration with the new map reaction**
  Goal: make the scripted pitch explicitly use the new map-card reaction instead of only the evidence card.
  Files:
  - [demo-script.md](D:\oil\Duo-Galym-Dauren-Project\docs\demo-script.md)
  Approach:
  - update the live-proof step so the presenter points to the map-card reaction as well as the main evidence block
  - keep the narration explicit that the sketch is static and evidence is live
  Execution note:
  - docs-only follow-through after UI shape is final
  Test files:
  - none
  Verification:
  - script language matches shipped UI behavior and does not overclaim precision

## Test Scenarios

### Manual Signal-Step Scenarios

- Seeded baseline:
  - map note remains baseline/static
  - no live evidence strip emphasis beyond seeded posture
  - no pulse on any dot

- Fresh live sync:
  - evidence strip shows current/baseline/delta/synced
  - contextual note explains static sketch + live evidence
  - lead dot visibly reacts

- Degraded live sync with previous live evidence:
  - evidence strip remains populated from last good snapshot
  - note explains fallback honestly
  - no celebratory pulse

- Unavailable live sync with no previous live evidence:
  - evidence strip stays honest with unavailable values
  - note explains fallback to seeded workflow
  - no pulse

- Seeded reset after live sync:
  - contextual live note disappears
  - evidence strip returns to seeded posture
  - pulse/emphasis clears

### Regression Scenarios

- `Promote to incident` still works from the Signal step
- signal selection by clicking map dots still works
- EN/RU localization remains coherent for the new note and strip copy
- no layout break on mobile widths

## Verification

- `cmd /c npm.cmd run build --workspace=@duo/web`
- manual browser rehearsal with local FastAPI backend:
  - successful `gee` sync
  - degraded or unavailable path if reproducible
  - seeded reset
- visual check on desktop and narrow/mobile width

## Risks and Mitigations

- Risk: the pulse looks gimmicky
  - Mitigation: keep it brief, restrained, and tied only to successful fresh live sync

- Risk: the map card starts implying live precision
  - Mitigation: keep the contextual note explicit that geometry is still a sketch

- Risk: the evidence strip duplicates the main evidence card too heavily
  - Mitigation: keep the strip compact and map-contextual, not a second full detail grid

- Risk: reset/degraded states leave stale live styling
  - Mitigation: make reset/degraded behavior first-class verification scenarios, not visual afterthoughts

## Dependencies / Assumptions

- `pipelineStatus.screeningSnapshot` remains available on the Signal step
- the live evidence semantics merged in `main` remain unchanged
- there is no repo-owned frontend test harness for this unit; build + manual verification is acceptable for this deadline

## Next Steps

→ `ce:work` on this plan
