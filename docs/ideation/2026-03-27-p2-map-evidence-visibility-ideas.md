---
date: 2026-03-27
topic: p2-map-evidence-visibility
status: proposed
---

# P2 Ideation: Map and Evidence Visibility

Where we are: live sync already refreshes the screening evidence layer, but the location sketch remains static because it renders seeded anomaly positions only.  
Nearest goal: improve the before/after effect of `Sync latest evidence` without pretending we have a live geospatial localization engine.  
Main risk: adding fake map behavior that looks impressive for 5 seconds but weakens trust with judges once questioned.

## Grounding

### Codebase context

- The signal step already has a strong evidence block with current CH4, baseline, delta, freshness, and recommendation in `apps/web/app/page.tsx`.
- The map section is explicitly framed as a sketch, not a live satellite map, and it renders from static `anomaly.sitePosition`.
- The backend `apply_fresh_screening_evidence()` path updates `screening_snapshot`, not anomaly coordinates or geometry.
- The current live story is honest: Earth Engine updates screening evidence, while incident creation remains manual.

### Constraint that matters most

We should not make the map appear to be a precise live geospatial layer when the backend does not actually supply fresh geometry.  
The right improvement is a stronger *visual consequence* of live sync, not a fake “moving satellite map.”

## Candidate Ideas

### 1. Lead-dot live pulse

After successful sync, add a visible pulse/halo on the selected or strongest anomaly dot with a short label like `Live evidence refreshed`.

- Why it matters:
  Makes the map area react to sync without pretending the coordinates changed.
- Grounding:
  The dot already exists and is tied to the anomaly card; this is a low-risk UI addition.
- Risks:
  If over-animated, it can feel gimmicky.

### 2. Before/after evidence strip attached to the map card

Add a compact strip directly under the map title:
`Current 1884.6 ppb | Baseline 1822.4 ppb | +3.41% | Synced 08:00 UTC`

- Why it matters:
  Connects the static sketch to the live evidence in one place.
- Grounding:
  The data already exists in `screeningSnapshot`.
- Risks:
  Could duplicate the evidence card if not compact enough.

### 3. Dynamic map note that changes after sync

Replace the fixed `This is a simple position sketch...` note with a contextual note after live sync:
`Position sketch is static. Screening evidence was refreshed from Google Earth Engine for the selected Kazakhstan window.`

- Why it matters:
  Turns the current weakness into honest positioning.
- Grounding:
  The map note already exists and is the clearest place to set expectations.
- Risks:
  Low wow factor by itself.

### 4. Sketch overlay band for the refreshed screening area

Add a translucent, non-precise overlay region or band behind the dots when live sync succeeds, labeled `Methane screening window refreshed`.

- Why it matters:
  Gives a visible “geographic change” without claiming exact pinpointing.
- Grounding:
  This can be entirely frontend-driven using the existing sketch board.
- Risks:
  Easy to overdesign and accidentally imply real geometry precision.

### 5. Sync event anchor in the activity/audit layer

After sync, show a recent event chip on the signal step:
`GEE sync verified for Kazakhstan methane screening window`

- Why it matters:
  Strengthens the MRV story by tying live ingest to evidence traceability.
- Grounding:
  Backend activity already records `gee_sync_verified`.
- Risks:
  Improves trust, but not the map itself.

### 6. Temporary compare mode in the evidence card

For 5-8 seconds after sync, visually highlight the delta and freshness state in a “just changed” compare state.

- Why it matters:
  Makes the change more obvious even if the map stays static.
- Grounding:
  The evidence card already holds the relevant fields.
- Risks:
  If too subtle, judges won’t notice it.

### 7. Auto-focus the synced anomaly and suppress all other dots

After sync, fade other dots and spotlight only the lead anomaly.

- Why it matters:
  Makes the sketch read more like prioritization and less like a dead mini-map.
- Grounding:
  The UI already tracks selected/strongest anomaly.
- Risks:
  Can look like the map changed even though only emphasis changed.

### 8. Real MapLibre screening layer

Replace the sketch with a real geospatial layer, tiles, and dynamic methane overlay.

- Why it matters:
  Strongest possible visual improvement.
- Grounding:
  Aligns with the intended stack.
- Risks:
  Wrong scope for current deadline, highest break risk, and easiest way to overpromise precision.

## Rejected Ideas

- `Real MapLibre screening layer`
  Rejected for now: too expensive and too risky before the submission/final demo loop is fully rehearsed.
- `Move anomaly coordinates after sync`
  Rejected: current backend does not provide fresh geometry, so this would be fake precision.
- `Auto-create incident on successful sync`
  Rejected: weakens the strong manual-promotion positioning.
- `Trend chart inside map card`
  Rejected: adds visual noise before the core live consequence is solved.

## Survivors

### 1. Lead-dot live pulse

- Description:
  Add a sync-triggered pulse/halo to the lead anomaly dot and optionally a small `Live` or `GEE verified` badge.
- Rationale:
  Best cost-to-impact ratio. It makes the sketch visibly react without changing geometry.
- Downsides:
  Needs tasteful motion restraint.
- Confidence:
  0.90
- Estimated complexity:
  Low

### 2. Dynamic map note that explains static geometry + live evidence

- Description:
  Change the map note after successful sync to explicitly say the sketch is static while evidence is live.
- Rationale:
  This strengthens trust with judges and preempts the exact confusion you just hit.
- Downsides:
  Mostly credibility, not visual wow.
- Confidence:
  0.95
- Estimated complexity:
  Low

### 3. Before/after evidence strip attached to the map card

- Description:
  Add one compact line under the map header with current vs baseline, delta, and synced-at.
- Rationale:
  Couples the geography panel with the evidence layer so the user no longer reads them as separate unrelated widgets.
- Downsides:
  Must stay compact or it duplicates the main evidence card.
- Confidence:
  0.87
- Estimated complexity:
  Low

### 4. Sketch overlay band for refreshed screening area

- Description:
  Add a translucent “screening window refreshed” overlay shape behind the dots after sync.
- Rationale:
  Gives the clearest geographic consequence while still being honest if labeled correctly.
- Downsides:
  Requires careful copy and visual design to avoid implying precise localization.
- Confidence:
  0.68
- Estimated complexity:
  Medium

### 5. Sync event anchor in the signal-step evidence zone

- Description:
  Surface the `gee_sync_verified` event near the sketch/evidence block, not just in downstream audit.
- Rationale:
  Reinforces MRV maturity and makes the live step feel operational, not cosmetic.
- Downsides:
  Strong trust effect, weaker visual effect.
- Confidence:
  0.82
- Estimated complexity:
  Low

## Recommended Direction

Best next move is a combined mini-package:

1. `Lead-dot live pulse`
2. `Dynamic map note`
3. `Before/after evidence strip`

Why this combination wins:

- Technically:
  It fits the current architecture and uses fields already present in `screeningSnapshot`.
- For judging:
  The map area finally reacts to sync, but still tells an honest story: live screening evidence, static sketch geometry, human promotion to operations.
- For deadline:
  This is small enough to implement and rehearse quickly.

## What Not To Do

- Do not animate dots moving to new coordinates.
- Do not imply Earth Engine is giving exact asset geometry.
- Do not replace the current workflow emphasis with map spectacle.
- Do not start MapLibre work before this smaller evidence-visibility package is proven insufficient.

## Session Note

This ideation was grounded in:

- `apps/web/app/page.tsx`
- `apps/web/lib/api.ts`
- `apps/api/app/services/demo_store.py`
- current live evidence semantics and the reviewed P2 observation that the map does not visibly react to sync
