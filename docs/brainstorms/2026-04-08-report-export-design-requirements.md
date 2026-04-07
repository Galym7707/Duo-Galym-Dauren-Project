---
date: 2026-04-08
topic: report-export-design
---

# Report Export Design Refresh

## Problem Frame
The current PDF and Word exports are functional and Unicode-safe, but they still read like generated operational tables rather than a polished MRV briefing artifact. That weakens the final stage of the demo loop, because the export should help the product feel boardroom-ready for judges and decision-makers, not just technically correct.

The highest-value improvement is not adding more content. It is making the first page easier to scan, clarifying hierarchy between management-level summary and operational evidence, and giving the audit trail a more intentional visual form without risking export reliability.

## Requirements
- R1. The export must open with an executive-first summary block that can be understood in under 10 seconds.
- R2. The first page must foreground incident status, recommended action, key methane/task metrics, and generation context before deeper operational sections.
- R3. Export content must be visually split into two tiers:
  - management snapshot
  - operational evidence
- R4. The management snapshot must feel intentionally lighter and faster to scan than the detailed evidence sections.
- R5. The audit/history portion must be presented as a clear workflow sequence `screening -> incident -> task -> report`, not only as a plain list of events.
- R6. PDF and DOCX outputs must share the same visual hierarchy and information order even if exact styling differs by format.
- R7. The export must include print-aware metadata such as document ID, generation timestamp, and page context in a consistent header/footer or equivalent framing treatment.
- R8. The redesign must preserve readable Cyrillic output in Russian and must not reintroduce silent font fallbacks or corrupted exports.
- R9. The redesign must preserve current report substance: no existing critical facts, task data, or methodology context should disappear unless it is clearly redundant and intentionally de-emphasized.
- R10. The artifact should look appropriate for a regulator, ESG lead, or operations manager reviewing a screening-based MRV report, not like a consumer document or decorative pitch slide.

## Success Criteria
- The first page clearly communicates what happened, why it matters, and what should happen next without needing the rest of the report.
- PDF and DOCX both feel like the same report product, not two unrelated export styles.
- The report is more visually intentional while staying stable in EN and RU.
- The audit trail reinforces the product differentiator of a closed MRV workflow.
- The exported artifact is strong enough to show directly in the demo or share after the pitch without apology.

## Scope Boundaries
- No new analytics, charts, or comparison views in this slice.
- No embedded live map snapshot or satellite imagery in this slice.
- No PowerPoint export or new file format support.
- No major change to the underlying report data model in this slice.
- No legal/approval/signature workflow blocks in this slice.

## Key Decisions
- Executive readability comes first: the redesign optimizes the first page before deep-detail polish.
- Visual hierarchy is more important than adding more content.
- PDF and DOCX should be aligned by structure and tone, not forced into pixel-identical rendering.
- Reliability is a hard constraint: Unicode safety and predictable export behavior outrank aggressive visual experimentation.
- The audit sequence should be elevated because it is the strongest MRV differentiator in the product story.

## Dependencies / Assumptions
- The current report already contains enough data to support a stronger executive summary without requiring new backend fields.
- Existing export generation paths for PDF and DOCX remain the authoritative export mechanisms.
- Current EN/RU copy can be reordered or relabeled as needed for stronger hierarchy.

## Outstanding Questions

### Deferred to Planning
- [Affects R6][Technical] How far styling parity between PDF and DOCX can realistically go without introducing fragile format-specific hacks.
- [Affects R7][Technical] Whether footer/header treatment should be true repeated page furniture in both formats or a simpler top/bottom metadata convention.
- [Affects R5][Technical] What timeline visualization is simplest to maintain in DOCX while still feeling intentional.

## Next Steps
→ /prompts:ce-plan for structured implementation planning
