# Saryna MRV Final Submission Pack

Where we are: as of March 27, 2026, the MVP, demo script, and jury Q&A are already in the repo.  
Nearest goal: make the submission for April 3, 2026 and the final on April 9, 2026 feel controlled, serious, and repeatable.  
Main risk: showing too much and losing the clean `signal -> incident -> task -> MRV report` story.

## North Star

Say this first:

`Saryna is an MRV workflow layer for methane and flaring visibility that turns screening signals into incidents, verification tasks, and exportable evidence for Kazakhstan oil and gas teams.`

## Submission Must-Haves

These are the minimum assets that should be ready before April 3, 2026:

- working web demo with the full workflow
- visible signal queue and strongest anomaly
- incident workspace with owner, priority, and verification window
- verification step with tasks and progress
- MRV report preview with audit trail
- export or print-ready report action
- short screencast path that can be recorded in one take
- short pitch opening and 3-5 clean Q&A answers

## Demo Preflight

Before recording or presenting, check these in order:

1. Frontend opens without layout issues.
2. Strongest anomaly is selected on the Signal step.
3. `Run GEE sync` works if the backend is available.
4. `Return to seeded mode` works, so stage playback can recover.
5. Incident opens correctly from the lead signal.
6. Verification tasks are visible and at least one action can be shown.
7. Report screen renders with audit timeline.
8. `Download HTML` or `Open print view` works.

## If Backend Is Available

Use this full path:

1. Open Signal step.
2. Click `Run GEE sync`.
3. Show the `GEE verified` marker in the queue.
4. Open the incident.
5. Show verification ownership.
6. Open report and audit timeline.
7. Mention export.
8. Click `Return to seeded mode`.

## If Backend Is Not Available

Use this fallback path:

1. Stay in seeded mode.
2. Keep the same anomaly-to-incident-to-report flow.
3. Say:

`The workflow remains stable even when live ingest is unavailable. The same MRV loop sits on top of live screening adapters when the backend is connected.`

## What To Show On Screen

Priority order:

1. strongest anomaly
2. incident ownership
3. verification task discipline
4. audit timeline
5. exportable MRV output

If time is tight, cut:

- extra anomaly browsing
- repeated KPI explanation
- detailed map discussion

Do not cut:

- incident ownership
- verification tasks
- MRV report

## What To Say

- screening layer
- operational prioritization
- pre-LDAR intelligence
- MRV evidence flow
- ESG / compliance / operations bridge

## What Not To Say

- exact source pinpointing from satellite data
- full LDAR replacement
- magical AI
- real-time plant truth
- full enterprise deployment

## Jury Language

Translate benefits into:

- faster time to triage
- lower regulatory exposure
- better ESG reporting readiness
- clearer verification ownership
- better prioritization before field dispatch

## Likely Weak Questions

If asked about precision:

`We do not claim equipment-level pinpointing. We help teams know where to investigate first.`

If asked why not just use raw open data:

`Open data is not the product. The product is the workflow that converts signals into action and evidence.`

If asked why this matters in Kazakhstan:

`Because methane, flaring, MRV readiness, and auditability are becoming strategically important at the same time for Kazakhstan oil and gas.`

## Final 30-Second Close

`Saryna helps Kazakhstan oil and gas teams move from methane visibility to accountable action and MRV-ready evidence with a workflow they can actually pilot.`

## Repo Map

Use these files during prep:

- `docs/demo-script.md`
- `docs/pitch-qna-pack.md`
- `docs/backend-live-sync.md`
- `docs/project-brief.md`

## Last Rule

If you must choose between more analytics and a cleaner workflow story, choose the workflow story.
