---
date: 2026-03-27
topic: map-evidence-visibility
---

# Map Evidence Visibility

## Problem Frame

The live `Sync latest evidence` flow already refreshes the methane screening evidence layer, but the location sketch still looks static and visually disconnected from that change. From a judging perspective, this weakens the live-ingest moment: the operator sees new evidence values, but the geographic panel does not visibly react, which makes the sync feel smaller than it really is.

The goal is not to fake a live satellite map. The goal is to make the signal-step geography panel visibly acknowledge the screening update while staying honest that geometry remains sketch-level and manually interpreted.

## Requirements

- R1. After a successful `gee` sync on the Signal step, the map card must show a visible post-sync state that makes the screening refresh legible without changing anomaly coordinates.
- R2. The map card must include a compact evidence strip tied to the current `screeningSnapshot`, showing current CH4, baseline CH4, delta, and sync timestamp in one concise line or cluster.
- R3. The map note must become contextual after sync and explicitly explain that the geography is still a sketch while the screening evidence was refreshed live.
- R4. The lead anomaly dot must receive a temporary visual emphasis after a successful fresh live sync so the map area visibly reacts to the operator action.
- R5. Degraded or unavailable live states must not pretend a stronger geographic update than actually exists. Their map-card copy must remain honest and screening-focused.
- R6. Seeded reset must return the map card to its baseline non-live posture cleanly, without stale live copy or visual emphasis lingering.

## Success Criteria

- A presenter can click `Sync latest evidence` and point to a clear visual change inside the map card within 2-3 seconds.
- The map card now reads as part of the screening workflow rather than a static decorative sketch.
- A judge cannot reasonably interpret the map reaction as precise asset-level satellite localization.
- The existing `signal -> incident -> verification -> report` loop remains unchanged and demo-safe.

## Scope Boundaries

- Do not change anomaly coordinates or `sitePosition` as a result of sync.
- Do not introduce a real geospatial or MapLibre live layer in this iteration.
- Do not auto-create incidents from sync results.
- Do not add charting or trend widgets to the map card in this iteration.
- Do not make the map card the primary evidence surface; the main evidence card remains primary.

## Key Decisions

- Keep the map reaction representational, not geospatially precise: this protects trust and fits current backend truth.
- Use the existing `screeningSnapshot` as the only live source for map-card evidence messaging: no new fake geometry layer.
- Treat the lead-dot emphasis as a short-lived interaction effect, not a persistent new map state.
- Restrict the strongest emphasis to successful fresh live sync. Degraded or unavailable states should update note/strip copy but not create a celebratory pulse.

## Dependencies / Assumptions

- The Signal step continues to have access to `pipelineStatus.screeningSnapshot`.
- The selected or strongest anomaly remains the visual anchor for the sketch.
- Existing sync success/failure semantics from the live evidence layer remain unchanged.

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Technical] Decide the exact duration and style of the lead-dot emphasis so it reads clearly on stage without feeling gimmicky.
- [Affects R2][Technical] Decide whether the compact evidence strip reuses the existing metric-card styling or introduces a smaller custom map-card format.
- [Affects R3][Copy] Finalize the exact localized EN/RU wording for the contextual map note.

## Next Steps

→ `/prompts:ce-plan` for structured implementation planning
