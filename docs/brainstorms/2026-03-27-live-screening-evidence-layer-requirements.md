---
date: 2026-03-27
topic: live-screening-evidence-layer
---

# Live Screening Evidence Layer

## Problem Frame

The repo already has a stable seeded operational workflow for `anomaly -> incident -> task -> MRV report`, and Unit 1 now gives it regression protection. The next judging problem is not missing CRUD. It is missing credibility in the live ingest story.

Right now, live sync risks reading like a connectivity proof instead of a screening layer that helps an operator decide what deserves attention. That is weak for both CTO and pitch goals:

- technically, it encourages accidental coupling between live provider behavior and the seeded demo flow
- competitively, it sounds like “we connected to an API” instead of “we refreshed screening evidence and made operations more informed”

## Requirements

- R1. Live sync must update a distinct screening evidence state without destabilizing seeded incidents, tasks, reports, or audit flow.
- R2. The UI must show a visible before/after evidence change after sync, not just a status badge.
- R3. The evidence state must communicate operator-relevant meaning:
  - latest sync time
  - current signal vs baseline
  - delta
  - screening level
  - confidence/caveat note
  - recommended next step
- R4. Promotion into an incident must remain a separate human step after evidence refresh.
- R5. Live provider failures must degrade safely:
  - fresh evidence when available
  - previous/stale evidence when source is reachable but not fresh
  - unavailable state when the provider cannot be used
- R6. The demo must remain stage-safe:
  - no sync failure should break the seeded operational path
  - reset to seeded mode must still be possible

## Success Criteria

- A judge can immediately see what changed after sync and why the area now deserves attention.
- A presenter can say: “Satellite data updates screening evidence; a person promotes that evidence into an operational incident.”
- Seeded `incident -> task -> report` behavior remains stable before and after live sync.
- Tests cover fresh, stale, unavailable, and post-refresh promote flows.

## Scope Boundaries

- Do not build real anomaly auto-generation for this unit.
- Do not auto-create incidents from live sync.
- Do not add SQLAlchemy, PostGIS, jobs, or storage in this unit.
- Do not add flare ingestion in this unit.
- Do not add a map/chart layer unless the evidence block is already strong enough.

## Key Decisions

- Commit Unit 1 first: smoke coverage is a checkpoint and should not be mixed into the next uncommitted feature slice.
- Separate screening state from operational state: live evidence should enrich decision-making without mutating the core seeded workflow objects directly.
- Keep promotion manual: this reads more honestly and more enterprise-relevant than automatic escalation.
- Optimize for evidence readability, not infrastructure depth: the next winning move is a stronger evidence block, not a mini data platform.

## Dependencies / Assumptions

- Unit 1 tests exist and remain green before Unit 2 starts.
- Earth Engine remains the only live provider in this unit.
- The current frontend may need a focused reintroduction or strengthening of pipeline/evidence UI to make the sync effect visible again.

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] Should the evidence block live as a top-of-page pipeline card, a dedicated signal-step panel, or both?
- [Affects R5][Technical] Should stale evidence show the last successful snapshot inline or as a separate “previous evidence” section?
- [Affects R2][Needs research] Does the latest `main` branch preserve enough of the previous operational workspace UI, or does planning need to explicitly restore the missing live evidence controls first?

## Next Steps

→ /prompts:ce-plan for structured implementation planning
