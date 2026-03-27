---
date: 2026-03-27
topic: real-map-layer
---

# Real Map Layer

## Problem Frame

The current map card is still a static sketch with fake dot positions. That weakens the strongest live part of the demo because judges can see evidence values changing after sync, but the geospatial surface still looks like a student placeholder instead of an operational MRV screen.

We do not need full GIS for submission. We need a real, credible map layer that makes the screening step look serious, keeps the workflow intact, and does not overclaim source precision.

## Requirements

- R1. Replace the sketch-first map card with a real interactive map centered on western Kazakhstan.
- R2. Render one marker per anomaly using real numeric latitude/longitude, not hand-placed `x/y` sketch positions.
- R3. Keep the current evidence strip visible in the map zone so the map remains tied to `current / baseline / delta / sync` evidence.
- R4. Selecting a marker must select the same anomaly as the rest of the workflow and keep `signal -> incident -> verification -> report` synchronized.
- R5. The selected marker must show a compact operational popup or detail affordance with at least asset name, region, screening context, and `Promote / Open incident`.
- R6. Live sync must visibly affect the real map layer without changing coordinates. The effect can be marker emphasis, status badge change, or popup freshness, but not fake relocation.
- R7. The product must stay honest about scope: the map must read as a screening and prioritization layer, not pinpoint leak attribution.
- R8. The anomaly contract should expose structured `lat` and `lng` fields so the frontend does not parse coordinate strings at render time.

## Success Criteria

- A user can open the app and see real markers on a real map instead of the current sketch.
- Clicking a marker updates the same selected anomaly state already used by the workflow.
- After `Sync latest evidence`, the lead signal visibly updates on the real map.
- The demo still supports manual promotion into incident workflow with no extra navigation friction.
- The map makes the product look more enterprise-relevant from the room without introducing false precision claims.

## Scope Boundaries

- No plume heatmaps or pseudo-raster overlays for submission MVP.
- No asset polygons, site footprints, or exact source geometry.
- No full GIS toolset, layer manager, measurement tools, or user drawing tools.
- No automatic incident creation from map interactions.
- No flare layer in the first map slice; methane map comes first.

## Key Decisions

- Real map replaces sketch as the primary surface: this solves the user's direct complaint and gives the strongest judging effect.
- Screening, not pinpointing: the map must reinforce our honest MRV positioning, not contradict it.
- Numeric `lat/lng` belongs in the contract: cleaner than parsing coordinates strings in the browser and safer for future flare/overlay work.
- No user-facing `Sketch / Map` toggle for submission: it adds decision noise on stage and weakens confidence. If fallback is needed, it should be an implementation fallback, not a primary product mode.
- Popup stays compact and operational: this is not a GIS explorer; it is a bridge into incident workflow.

## Dependencies / Assumptions

- Existing anomaly records already contain enough location information to derive numeric `lat/lng`.
- A lightweight tile basemap is acceptable for demo use.
- Marker count remains small in the MVP, so clustering is unnecessary for submission.

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] Which MapLibre basemap/style path is safest for the demo environment and least likely to fail in local runtime?
- [Affects R5][Technical] Should the operational detail appear as a true map popup, a pinned side detail card, or both?
- [Affects R6][Technical] What is the smallest visible live-refresh effect on the real map that is stable across fresh, degraded, and reset states?
- [Affects R8][Needs research] Should `lat/lng` be normalized only in the frontend fallback data first, or added to the backend API contract in the same slice?

## Next Steps

→ /prompts:ce-plan for structured implementation planning
