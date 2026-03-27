---
date: 2026-03-28
topic: kazakhstan-wide-map-coverage
---

# Kazakhstan-Wide Map Coverage

## Problem Frame
Current map credibility improved after the real MapLibre slice, but the visual story is still too narrow for a hackathon jury. From the stage, the product still reads like a western pilot cluster rather than a Kazakhstan-wide MRV screening layer.

The next improvement should expand visible territory coverage so the presenter can immediately show:
- the whole Kazakhstan map in one view
- multiple oil and gas regions
- areas with stronger and weaker methane signals

This is a demo and positioning upgrade, not a request for comparison tooling, GIS analytics, or a new workflow step.

## Requirements
- R1. The default map view must open with a Kazakhstan-wide framing instead of a narrow local window.
- R2. The map must include seeded anomaly markers across multiple Kazakhstan regions, not only the current western pilot cluster.
- R3. The user must be able to switch the map focus quickly between `All Kazakhstan` and a small set of named regional presets suitable for demo narration.
- R4. Region switching must only change map focus and visible screening context. It must not change the underlying incident, verification, or report workflow model.
- R5. The selected anomaly and operational workflow state must stay connected when the map focus changes.
- R6. The expanded map must still work in a demo-safe mode when the live map surface fails, preserving a fallback presentation path.
- R7. The UI must keep the map interaction simple enough for a 60-90 second screencast. No extra compare mode, charting mode, or analytics panel is required in this slice.

## Success Criteria
- The opening map view clearly reads as Kazakhstan-wide from the first screen.
- The presenter can jump between at least one stronger-signal region and one lower-signal region in a few seconds.
- The product looks more like a national screening and prioritization layer than a local dashboard.
- The existing `signal -> incident -> task -> report` demo loop remains intact.
- The map expansion does not introduce fragile interactions that make the stage demo riskier.

## Scope Boundaries
- No region-to-region comparison tool.
- No methane heatmaps, plume rendering, or choropleth overlays.
- No polygon boundary system for oblasts in this slice.
- No flare-specific second layer in this slice.
- No new workflow step or analytics mode.

## Key Decisions
- Nationwide first, not region-first: the map should open on Kazakhstan-wide coverage because this creates the strongest immediate judging impression.
- Presets over filters: region jumping should use a small set of explicit presets rather than a complex filtering UI.
- Seeded expansion first: for MVP, broader map coverage should come from more seeded anomalies with credible geography rather than waiting for a country-scale live ingest engine.
- Workflow remains primary: map expansion must support the existing MRV loop, not compete with it.
- Simplicity beats comparison: the user explicitly does not need comparison tools, so this slice should focus on geographic coverage and switching only.

## Dependencies / Assumptions
- The current real-map slice already supports marker rendering, marker selection, and fallback behavior.
- Seeded anomaly expansion is acceptable for submission-level MVP as long as the live screening positioning stays honest.
- A small set of oil-and-gas-relevant regional presets is enough for the demo. A full administrative navigation system is not required.

## Outstanding Questions

### Deferred to Planning
- [Affects R2][Technical] What exact seeded region set gives the best nationwide coverage while staying relevant to Kazakhstan oil and gas operations?
- [Affects R2][Technical] How many new anomalies are enough to make the country view feel real without cluttering the screen?
- [Affects R3][Technical] Should presets be implemented as named bounds, camera states, region filters, or a combination of region focus plus marker visibility?
- [Affects R6][Needs research] How should the fallback sketch evolve so it still makes sense once nationwide coverage is introduced?

## Next Steps
→ /prompts:ce-plan for structured implementation planning
