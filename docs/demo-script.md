# Saryna MRV Demo Script

Where we are: the MVP already supports `signal -> incident -> verification -> report`, live GEE proof, audit evidence, and reset to seeded mode.  
Nearest goal: make the 90-second screencast repeatable without improvisation.  
Main risk: adding too much narration and losing the clean workflow story.

## 90-Second Path

### 0:00-0:15
Screen:
- Stay on the Signal step.
- Keep the strongest anomaly selected.

Say:
- "Saryna is not another dashboard. It is an MRV workflow for methane and flaring visibility in Kazakhstan."
- "We start with a short, defensible signal queue and focus on one anomaly worth operational attention."

Point to:
- strongest anomaly
- signal score
- potential impact
- region/facility context

### 0:15-0:30
Screen:
- In the screening evidence block, click `Sync latest evidence`.
- Wait for the evidence card to refresh.

Say:
- "Here we prove the live CH4 screening path through Google Earth Engine."
- "The product does not auto-create an incident. It refreshes screening evidence and lets a human decide when to promote."

Point to:
- evidence source
- latest observation / sync timestamp
- current CH4 vs baseline
- delta badge

### 0:30-0:45
Screen:
- Click `Promote to incident` or open the linked incident.
- Move to the Incident step.

Say:
- "This is where the product stops looking like a map and starts looking operational."
- "A human promotion creates the incident after reviewing screening evidence."

Point to:
- owner
- priority
- verification window

### 0:45-1:05
Screen:
- Go to the Verification step.
- Show tasks, owners, and short ETAs.
- If needed, click `Create task` or mark one task done.

Say:
- "We do not claim to replace field verification."
- "We help teams prioritize where to look first and convert screening into accountable work."

Point to:
- human owner on each task
- ETA
- progress bar

### 1:05-1:25
Screen:
- Open the Report step.
- Show MRV sections and audit timeline.
- Mention `Download HTML` and `Open print view`.

Say:
- "The differentiator is the closed loop: anomaly, incident, task, MRV report."
- "This gives ESG, compliance, and operations one defensible workflow rather than disconnected tools."

Point to:
- report sections
- audit timeline
- export / print actions

### 1:25-1:30
Screen:
- Click `Return to seeded mode`.

Say:
- "We can return to seeded playback at any time, so the demo stays stable even after proving the live evidence layer."

## One-Line Story

Use this if time is tight:

`Saryna is an MRV workflow layer that turns methane screening into owned incidents, verification tasks, and exportable evidence for Kazakhstan oil and gas teams.`

## Safe Positioning

Always say:
- screening layer
- operational prioritization
- pre-LDAR intelligence
- MRV evidence flow

Do not say:
- exact leak pinpointing
- full LDAR replacement
- magical AI
- real-time plant truth

## Fallback Plan

If live sync is slow or unavailable:
- stay in seeded mode
- keep the same anomaly-to-report path
- say: `The workflow remains stable even when live screening is unavailable. For the final pilot, the same loop will sit on top of real screening adapters.`

## Exact Click Path

1. Open app on Signal.
2. Click `Sync latest evidence`.
3. Click `Open incident` or `Promote to incident`.
4. Click `Go to verification`.
5. Click `Generate MRV preview` if needed.
6. Click `Open print view` or `Download HTML`.
7. Click `Return to seeded mode`.
