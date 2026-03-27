---
date: 2026-03-27
topic: real-map-layer
status: active
origin: docs/brainstorms/2026-03-27-real-map-layer-requirements.md
---

# Real Map Layer Plan

## Problem Frame

The current Signal-step map card is still a static sketch driven by hand-placed `sitePosition.x/y` values. That means the strongest live moment in the product, `Sync latest evidence`, still lands on a surface that looks staged rather than operational. For Kazakhstan Startup Challenge 2026, this is now the biggest remaining visual gap between "strong workflow demo" and "serious MRV product."

This plan implements a real map layer without turning the MVP into a GIS platform. The objective is a judging-grade geospatial surface that keeps the existing `screening -> incident -> task -> report` loop intact and stays honest about screening precision.

This plan is grounded in [2026-03-27-real-map-layer-requirements.md](D:\oil\Duo-Galym-Dauren-Project\docs\brainstorms\2026-03-27-real-map-layer-requirements.md).

## Scope Boundaries

- Do not add plume heatmaps, raster overlays, polygons, or exact source geometry.
- Do not add flare markers in the first map slice.
- Do not add a user-facing `Sketch / Map` mode switch for submission MVP.
- Do not change incident generation semantics; map interactions must still keep promotion manual.
- Do not remove the evidence strip or workflow controls already proven in the Signal step.

## Research Summary

### Repo patterns to follow

- The current map card lives in [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx) and already shares state with anomaly selection, live evidence, and promotion CTA.
- Seeded anomaly data already contains a human-readable `coordinates` field in [demo-data.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\demo-data.ts), so we can derive numeric `lat/lng` without inventing new content.
- The API normalization layer in [api.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\api.ts) already translates backend snake_case into frontend camelCase and is the correct place to normalize new anomaly contract fields.
- Backend anomaly payloads are defined in [models.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\models.py) and seeded in [demo_store.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\demo_store.py).
- Backend contract verification already lives in [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py) and [test_demo_store.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_demo_store.py).

### Planning decisions

- Proceed without external research for the plan itself. The repo shape is simple, the desired map behavior is clear, and the remaining uncertainty is implementation-level rather than product-level.
- Use backend-owned numeric `lat/lng` in the same slice as the map. This resolves the only real contract gap before the UI work lands.
- Use an isolated client-only map component so MapLibre's imperative runtime does not spread through [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx).
- Use a compact popup as a supplemental map affordance, while keeping the existing evidence strip and side details as the primary workflow context.
- Keep an internal sketch fallback inside the map component for demo safety, but do not expose it as a product mode.

## Requirements Trace

- R1 -> replace map sketch with a real interactive basemap centered on western Kazakhstan
- R2 -> add numeric `lat/lng` to anomaly contract across backend, API normalization, and fallback data
- R3 -> preserve the current map-zone evidence strip above the real map
- R4 -> marker selection reuses existing selected anomaly state and workflow synchronization
- R5 -> selected marker opens a compact operational popup with asset context and `Promote / Open incident`
- R6 -> fresh live sync changes marker emphasis/freshness, not coordinates
- R7 -> map note and popup language remain explicit that this is a screening layer
- R8 -> frontend stops relying on string parsing during render by consuming normalized numeric coordinates

## Key Decisions

- Keep `coordinates` string and `sitePosition` temporarily for compatibility while the real map lands. `lat/lng` becomes the new primary map input; old fields remain only until the slice stabilizes.
- Make the real map the default rendered surface once available. The old sketch survives only as a fail-soft implementation fallback inside the map component.
- Use a compact operational popup rather than building a second large side panel. The popup should confirm "this marker belongs to the current workflow," not create a new workflow.
- Treat live-refresh map change as styling/state, not geometry mutation. Fresh sync can pulse or badge the selected marker, but must never imply map relocation or precise plume boundaries.
- Keep the map slice methane-only for this unit. Flare can layer on later once the base map is stable.

## Implementation Units

- [x] **Unit 1: Normalize anomaly geolocation in the shared contract**
  Goal: make numeric `lat/lng` a first-class part of the anomaly payload for both seeded fallback and API-backed data.
  Files:
  - [models.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\models.py)
  - [demo_store.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\demo_store.py)
  - [test_demo_store.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_demo_store.py)
  - [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py)
  - [demo-data.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\demo-data.ts)
  - [api.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\api.ts)
  Approach:
  - add numeric `latitude` and `longitude` fields to anomaly models and frontend anomaly types
  - populate seeded anomalies with explicit numeric coordinates instead of deriving them on the fly in the UI
  - extend API normalization so backend anomalies and fallback anomalies share the same shape
  - keep existing `coordinates` string for display copy and report export
  Patterns to follow:
  - reuse the existing backend Pydantic contract pattern in [models.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\models.py)
  - reuse the snake_case -> camelCase normalization path in [api.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\api.ts)
  Execution note:
  - test-first on backend contract changes; this is the safest place to lock the map slice before UI work
  Test files:
  - [test_demo_store.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_demo_store.py)
  - [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py)
  Verification:
  - dashboard API returns numeric `latitude` and `longitude`
  - fallback dashboard state exposes the same fields
  - no existing dashboard or incident contract fields regress

- [x] **Unit 2: Introduce an isolated MapLibre surface with fail-soft fallback**
  Goal: replace the sketch-first card with a real map surface while keeping the app demo-safe if the map runtime or tiles fail.
  Files:
  - [package.json](D:\oil\Duo-Galym-Dauren-Project\apps\web\package.json)
  - [layout.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\layout.tsx) or the new map component if CSS is imported locally
  - [anomaly-map.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\components\anomaly-map.tsx)
  - [globals.css](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\globals.css)
  Approach:
  - add `maplibre-gl` as a web dependency
  - build a client-only `AnomalyMap` component responsible for map creation, marker rendering, cleanup, and fallback rendering
  - use a lightweight raster basemap style configured in code and easy to swap if tile access changes
  - keep a component-local fallback that renders the current sketch-style board only if map initialization fails
  Patterns to follow:
  - isolate new view complexity in a focused component rather than growing [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx) further
  - follow the existing restrained motion language from [globals.css](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\globals.css)
  Execution note:
  - UI-first after Unit 1; prefer the simplest map initialization path that is stable on local dev
  Test files:
  - none in this unit; see Verification
  Verification:
  - app builds with MapLibre dependency present
  - map loads in local dev and centers on western Kazakhstan
  - if the map fails to initialize, the Signal step still renders a safe fallback instead of breaking

- [x] **Unit 3: Bind marker selection, popup, and live evidence reaction to the workflow**
  Goal: make the real map part of the operational loop rather than a decorative surface.
  Files:
  - [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx)
  - [anomaly-map.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\components\anomaly-map.tsx)
  - [globals.css](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\globals.css)
  Approach:
  - move current sketch-card responsibilities into props/state passed to the new map component
  - clicking a marker must call the same anomaly selection path the sketch used
  - render a compact popup with asset name, region, screening level/evidence cue, and `Promote / Open incident`
  - preserve the current evidence strip and note above the map so sync posture remains obvious
  - apply the existing live-refresh emphasis logic to the selected marker instead of the sketch dot
  Patterns to follow:
  - reuse current `selectedAnomaly`, `activeIncident`, and promotion handlers in [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx)
  - reuse the current `mapCardTone`, note, and evidence-strip derivation rather than creating a second evidence model
  Execution note:
  - characterization-first on degraded/reset flows; these are the easiest places to accidentally overpromise or leave stale styling
  Test files:
  - none in this unit; see Verification
  Verification:
  - marker click changes the selected anomaly everywhere on the Signal step
  - popup CTA respects existing `Promote / Open incident` behavior
  - fresh sync visibly updates selected marker posture
  - degraded/unavailable/reset paths stay honest and keep coordinates fixed

- [x] **Unit 4: Align demo script with the real map story**
  Goal: make the narrated pitch explicitly use the real map as screening proof without overclaiming precision.
  Files:
  - [demo-script.md](D:\oil\Duo-Galym-Dauren-Project\docs\demo-script.md)
  - [README.md](D:\oil\Duo-Galym-Dauren-Project\README.md)
  Approach:
  - update the Signal-step script to point at real marker selection, map evidence, and popup CTA
  - keep the phrasing explicit that this is a screening layer and operational prioritization surface
  - document any demo-safety note if the map falls back internally
  Execution note:
  - docs-only follow-through after UI behavior is stable
  Test files:
  - none
  Verification:
  - script language matches shipped map behavior and does not imply pinpoint leak detection

## Test Scenarios

### Contract and Data Scenarios

- Dashboard payload includes numeric `latitude` and `longitude` for every anomaly.
- Seeded fallback state includes numeric `latitude` and `longitude` for every anomaly.
- Existing `coordinates`, `linkedIncidentId`, and evidence fields remain intact.

### Map Interaction Scenarios

- Default Signal step shows a real map with markers instead of the sketch.
- Clicking each marker updates selected anomaly details, evidence strip, and workflow CTA.
- Selected marker popup shows the correct asset and action affordance.
- Existing `Promote to incident` flow still works after selecting through the map.

### Live Evidence Scenarios

- Fresh `gee` sync keeps coordinates fixed but changes marker emphasis and evidence freshness.
- Degraded or unavailable sync preserves the map and updates note/posture honestly.
- Seeded reset clears live-specific marker emphasis and returns to seeded posture.

### Failure and Layout Scenarios

- If map initialization or tiles fail, the Signal step remains usable through the internal fallback.
- Desktop and mobile widths do not cause popup or evidence strip overflow.
- EN and RU copy remain readable in the map note, popup, and report/export paths.

## Verification

- `py -m pytest` in [apps/api](D:\oil\Duo-Galym-Dauren-Project\apps\api)
- `cmd /c npm.cmd run build --workspace=@duo/web` in [Duo-Galym-Dauren-Project](D:\oil\Duo-Galym-Dauren-Project)
- manual browser rehearsal with local backend:
  - open Signal step
  - verify real markers render
  - select a marker
  - run `gee` sync
  - verify marker emphasis and popup/evidence updates
  - promote to incident
  - reset to seeded mode

## Risks and Mitigations

- Risk: tile access fails during a demo
  - Mitigation: keep a component-local sketch fallback and do not remove the current safe rendering path until the real map is proven

- Risk: map upgrade makes the UI look like a generic GIS screen instead of an MRV workflow
  - Mitigation: keep evidence strip, popup CTA, and workflow coupling stronger than map controls

- Risk: marker popup creates duplicate action paths and state bugs
  - Mitigation: reuse existing selection and promotion handlers instead of introducing a second incident workflow path

- Risk: contract drift between fallback data and API payload
  - Mitigation: change both in Unit 1 and lock with backend tests before map UI work starts

- Risk: map suggests pinpoint precision
  - Mitigation: keep note/popup copy explicit that this is a screening and prioritization layer

## Dependencies / Assumptions

- Numeric coordinates already available in current seeded anomalies are sufficient for the first real map slice.
- Marker count remains small enough that clustering is unnecessary.
- A lightweight raster basemap is sufficient for submission and easier to stabilize than a richer GIS setup.
- There is still no repo-owned frontend test harness; build plus manual rehearsal is acceptable for this deadline.

## Next Steps

→ `ce:work` on this plan
