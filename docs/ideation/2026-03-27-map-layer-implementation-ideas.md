# Map Layer Implementation Ideas

Date: 2026-03-27
Status: reviewed survivors
Focus: replace the current sketch-only map card with a real, demo-safe map layer

## Grounding

Codebase observations:
- The current UI renders a static sketch in [page.tsx](D:\oil\Duo-Galym-Dauren-Project\apps\web\app\page.tsx) using `anomaly.sitePosition.x/y`, not a real map projection.
- Real-looking location data already exists as a string field `coordinates` in [demo-data.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\demo-data.ts), so we are not starting from zero.
- The API contract in [api.ts](D:\oil\Duo-Galym-Dauren-Project\apps\web\lib\api.ts) does not yet expose structured `lat/lng` fields or GeoJSON.
- The intended stack mentions MapLibre, but [package.json](D:\oil\Duo-Galym-Dauren-Project\apps\web\package.json) does not include `maplibre-gl` yet.
- There are no existing `docs/solutions/` learnings to reuse for maps in this repo.

Hackathon filter:
- We need a map layer that strengthens `screening -> incident -> task -> report`.
- We do not need full GIS, raster processing, or plume science before submission.
- Judges need to see "real geospatial seriousness" without us overclaiming pinpoint source attribution.

## Candidate List

1. MapLibre basemap with real anomaly markers from parsed coordinates.
2. MapLibre plus a selected-anomaly evidence popup with `current / baseline / delta / promote`.
3. Backend-owned `lat/lng` normalization so the frontend stops parsing coordinate strings.
4. Region screening window overlay for Atyrau and Mangystau instead of plume polygons.
5. Toggle between `Sketch` and `Map` so demo fallback remains safe.
6. Mini trend sparkline or CH4 delta chip inside the map popup.
7. Nightfire flare markers as a second layer with an on/off toggle.
8. Heatmap or plume-like raster overlay.
9. Asset polygons / site footprints around demo facilities.
10. Side-by-side `live evidence map` and `operational incident panel`.

## Rejected Ideas

- Heatmap or plume-like raster overlay
  Rejected: too easy to overpromise spatial precision and too expensive for current repo shape.
- Asset polygons / site footprints
  Rejected: needs new geometry assets and invites questions we cannot answer credibly yet.
- Side-by-side `live evidence map` and `operational incident panel`
  Rejected: duplicates the existing workflow layout and burns screen real estate without increasing clarity.
- Purely keep the current sketch and restyle it
  Rejected: it does not solve the user's actual goal of seeing real dots on a map.

## Survivors

### 1. Lightweight MapLibre basemap with real anomaly markers

Description:
- Replace the sketch card with a real MapLibre map centered on western Kazakhstan.
- Render one marker per anomaly using real coordinates.
- Keep the current evidence strip and the current workflow unchanged.

Rationale:
- Strongest stage upgrade per unit of effort.
- Solves the user's direct complaint immediately: "I want real dots instead of a fake map."
- Makes the product look more enterprise-relevant without changing core workflow logic.

Downsides:
- Requires adding `maplibre-gl` and map CSS/runtime handling.
- Still only shows screening locations, not true source pinpointing.

Confidence: 0.92
Estimated complexity: Medium

### 2. Selected-anomaly popup on the real map

Description:
- Clicking a marker opens a compact popup with asset name, current CH4 context, delta, and `Promote to incident`.

Rationale:
- This ties the map directly into the demo loop instead of making it decorative.
- Judges can see the bridge from geospatial signal to operational action in one place.

Downsides:
- Slightly more UI state complexity.
- Needs careful wording to avoid clutter or overclaiming.

Confidence: 0.89
Estimated complexity: Medium

### 3. Backend-owned `lat/lng` normalization

Description:
- Add structured numeric latitude/longitude fields to the anomaly contract instead of relying on string parsing in the browser.

Rationale:
- Cleaner long-term path.
- Reduces frontend fragility and prepares for future GeoJSON / flare overlays.

Downsides:
- Not very visible by itself.
- Best as an enabling layer, not as the headline feature.

Confidence: 0.87
Estimated complexity: Low

### 4. Region screening overlay, not plume overlay

Description:
- Add one or two simple region/bounding overlays for pilot windows such as Atyrau and Mangystau.
- Use them to say "this is the screening area" rather than "this is the exact leak shape."

Rationale:
- Gives the map more credibility without false precision.
- Fits our positioning as a screening layer.

Downsides:
- Needs modest geometry or hand-authored bounds.
- Less immediately impressive than a plume, but much safer.

Confidence: 0.83
Estimated complexity: Medium

### 5. `Sketch / Map` toggle as a demo-safe fallback

Description:
- Keep the existing sketch as a fallback or comparison mode and add a toggle to switch between `Map` and `Sketch`.

Rationale:
- Protects the demo if the map tiles or library misbehave.
- Lets us preserve the current visual for low-risk playback while still showing the real map when ready.

Downsides:
- Slightly more UI complexity.
- Risks making the product feel indecisive if both modes are shown too often on stage.

Confidence: 0.8
Estimated complexity: Low to medium

### 6. Nightfire flare markers as a second layer

Description:
- Add a second toggled marker set for flare-context signals after the methane map is stable.

Rationale:
- Strengthens the "methane + flaring" story for judges.
- Gives a credible future-facing enhancement after the first real map ships.

Downsides:
- New source-integration work.
- Not the right first move if the base methane map is not already stable.

Confidence: 0.72
Estimated complexity: Medium to high

## Ranked Recommendation

### Best next idea

1. Lightweight MapLibre basemap with real anomaly markers
2. Selected-anomaly popup on the real map
3. Backend-owned `lat/lng` normalization

Why this bundle wins:
- CTO lens: fastest path to a real map with bounded risk.
- Pitch lens: immediately changes how serious the product looks from the room.
- Demo lens: preserves the current workflow while upgrading the weakest visual area.

## Suggested Scope Boundary

Do now:
- Add MapLibre.
- Normalize `lat/lng`.
- Render real anomaly markers.
- Keep the evidence strip and live sync marker emphasis.
- Optionally add a compact popup and a `Sketch / Map` fallback toggle.

Do later:
- Add flare layer.
- Add region overlay.
- Add richer popup content or trend chips.

Do not do for submission MVP:
- plume heatmaps
- operator site polygons
- heavy raster processing in the frontend
- full GIS toolbar behavior

## Decision

Recommended next step: brainstorm and then plan the bundle
- `MapLibre basemap + real anomaly markers + popup + backend lat/lng normalization`
