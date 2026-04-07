---
date: 2026-04-08
topic: report-export-design-refresh
status: active
origin: docs/brainstorms/2026-04-08-report-export-design-requirements.md
---

# Report Export Design Refresh Plan

## Problem Frame

The current export stack is stable and Unicode-safe, but the generated PDF and DOCX still read more like operational tables than a polished MRV briefing artifact. That weakens the final step of the demo loop because the exported report should help the product feel credible to regulators, ESG leads, and oil-and-gas executives, not merely technically correct.

This plan upgrades the report presentation without changing the underlying report data model or destabilizing the hardened PDF/DOCX font path. The target is a boardroom-ready artifact that preserves the current facts and workflow evidence while becoming much faster to scan on page 1.

This plan is grounded in [2026-04-08-report-export-design-requirements.md](D:\oil\Duo-Galym-Dauren-Project\docs\brainstorms\2026-04-08-report-export-design-requirements.md).

## Scope Boundaries

- Do not add new analytics, charts, or region-comparison content.
- Do not add embedded maps or satellite imagery in this slice.
- Do not change export formats or introduce a PowerPoint/export-to-slide path.
- Do not weaken or bypass the current Unicode-safe font resolution path.
- Do not require new backend report fields to land this redesign.
- Do not turn the report into a decorative pitch handout; it must remain an operational MRV artifact.

## Research Summary

### Repo patterns to follow

- Export generation is centralized in [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py), with a single `PreparedReport` object feeding `render_html`, `render_pdf`, and `render_docx`.
- The current export stack already has a stable localization layer via `_labels(...)` and translation helpers in [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py).
- Recent hardening work already established explicit Unicode-capable font handling through `_resolve_export_fonts()` and `_apply_docx_font(...)` in [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py).
- Route-level export behavior is already covered in [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py), so visual-refresh regressions should extend that path rather than invent a parallel export API.
- The live demo also uses the print-view/HTML report path, so structure changes in `PreparedReport` should keep [render_html](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py) aligned with PDF and DOCX.

### Planning decisions

- Proceed without external research. The work is a repo-owned presentation refinement on a stable internal export stack, and the meaningful constraints are local: ReportLab/DOCX parity, Unicode safety, and report hierarchy.
- Treat `PreparedReport` as the semantic source of truth. Shared design improvements should be expressed as common report blocks first, then rendered per format.
- Align PDF and DOCX by hierarchy and information order, not by pixel parity.
- Use service-level regression coverage in a new export-focused test module rather than relying only on route-level assertions.

## Requirements Trace

- R1 -> introduce an executive-first opening block before the deeper evidence sections
- R2 -> foreground incident status, recommended action, top metrics, and generation context on page 1
- R3 -> split report structure into management snapshot and operational evidence tiers
- R4 -> make management snapshot visually lighter and faster to scan than the detailed evidence sections
- R5 -> elevate audit/history into an explicit workflow sequence instead of a plain event list
- R6 -> keep PDF and DOCX aligned in information order and design intent using shared semantic blocks
- R7 -> add print-aware metadata treatment such as document ID, generation context, and page framing
- R8 -> preserve readable RU/EN output and the hardened Unicode font path
- R9 -> preserve all critical current facts, tasks, and methodology content while allowing de-emphasis of secondary material
- R10 -> keep the final artifact enterprise-credible and MRV-specific rather than decorative

## Key Technical Decisions

- Keep the redesign inside [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py) rather than splitting into a new export subsystem. The current module is cohesive enough for this bounded slice.
- Introduce shared semantic report blocks in `PreparedReport` instead of hand-building layout separately in each renderer. This is the safest way to preserve cross-format hierarchy.
- Use a token-style internal design language for spacing, typography roles, panel tone, and metadata treatment, but keep it lightweight and local to the export module.
- Prefer stronger hierarchy over more content. Existing content should be reordered and reframed before any new textual blocks are introduced.
- Represent the audit workflow as a structured sequence in the prepared report, with each renderer choosing the simplest format-native visualization that still reads as a timeline.
- Keep print-view HTML aligned with the redesign where practical, because it is part of the demo artifact story and should not drift far behind PDF/DOCX.

## High-Level Technical Design

This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as semantic design guidance, not as exact code.

```text
prepare_report(...)
  -> PreparedReport
     - executive_summary
     - key_metrics
     - document_metadata
     - facts_panel
     - operational_sections
     - task_lines
     - audit_timeline
     - methodology_points

render_html(report)
  -> same semantic order, optimized for browser print view

render_pdf(report)
  -> executive brief band
  -> metric tiles / metadata row
  -> evidence panels
  -> task table
  -> audit timeline
  -> methodology

render_docx(report)
  -> same semantic order
  -> simpler but recognizably equivalent hierarchy
  -> safe typography and table styling through explicit font application
```

## Implementation Units

- [ ] **Unit 1: Introduce shared semantic export blocks and design tokens**
  Goal: make the report hierarchy explicit in `PreparedReport` so all three renderers can consume the same management/evidence structure.
  Files:
  - [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py)
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  Approach:
  - extend `PreparedReport` with explicit executive-summary and metadata-oriented blocks instead of relying on implicit ordering of `metrics`, `facts`, and `audit_lines`
  - add lightweight internal export tokens for typography roles, section spacing, panel tone, and metadata treatment
  - preserve current translation and font-resolution helpers rather than replacing them
  Patterns to follow:
  - reuse the existing `PreparedReport`/renderer separation in [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py)
  - keep all locale-sensitive copy routed through `_labels(...)` and existing translation helpers
  Execution note:
  - characterization-first on report structure; establish service-level expectations before visual reshaping
  Test files:
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  Verification:
  - `prepare_report(...)` exposes the new semantic blocks for both EN and RU
  - no critical existing report content disappears from the prepared report
  - Unicode-safe font resolution path remains unchanged in behavior

- [ ] **Unit 2: Rebuild page-one hierarchy across HTML, PDF, and DOCX**
  Goal: make the first page read like an executive MRV brief instead of the start of a dense operational table.
  Files:
  - [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py)
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  Approach:
  - render a compact executive-first opening block with status, recommended action, top metrics, and generation context before the denser facts and sections
  - visually separate management snapshot from operational evidence in all three renderers
  - refactor current metric/facts rendering so it reads as panels/briefing cards rather than a spreadsheet wall
  Patterns to follow:
  - reuse current metrics and facts data instead of inventing new report inputs
  - preserve current content ordering where it is operationally useful, but move first-read essentials to the top
  Execution note:
  - implement HTML/PDF/DOCX together at the semantic level to avoid cross-format drift
  Test files:
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  - [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py)
  Verification:
  - exported HTML, PDF, and DOCX all begin with the same management snapshot content
  - first-page content clearly includes status, action, top metrics, and generation context
  - RU and EN labels remain readable in the new first-page layout

- [ ] **Unit 3: Convert audit list into a workflow timeline and add print-aware metadata framing**
  Goal: strengthen the MRV differentiator and make the artifact feel more referenceable when printed or shared.
  Files:
  - [report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\services\report_exports.py)
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  Approach:
  - transform plain audit lines into a structured workflow timeline representation
  - render the sequence in the simplest format-safe way per renderer
  - add consistent document framing such as report ID, generated-at context, and page reference treatment
  Patterns to follow:
  - keep audit content tied to current activity events; only presentation changes in this slice
  - keep footer/header treatment restrained and enterprise-looking rather than visually noisy
  Execution note:
  - DOCX should use the simplest sustainable timeline representation even if PDF is slightly richer
  Test files:
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  Verification:
  - audit sequence reads as `screening -> incident -> task -> report`
  - generated reports include stable metadata framing without corrupting page flow
  - no existing route/export contract changes are required for consumers

- [ ] **Unit 4: Lock regression coverage and demo-facing documentation**
  Goal: keep the redesigned export stable and update demo guidance so the artifact can be shown confidently.
  Files:
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  - [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py)
  - [README.md](D:\oil\Duo-Galym-Dauren-Project\README.md)
  - [demo-script.md](D:\oil\Duo-Galym-Dauren-Project\docs\demo-script.md)
  Approach:
  - add service-level assertions for the new semantic blocks and locale-safe rendering cues
  - retain route-level checks for export success/failure behavior
  - update demo docs so the presenter knows what to point at in the new first page and timeline
  Patterns to follow:
  - reuse the existing route-level export test coverage in [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py)
  Execution note:
  - docs follow after renderer shape is stable
  Test files:
  - [test_report_exports.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_report_exports.py)
  - [test_routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\tests\test_routes.py)
  Verification:
  - export routes still return valid files or controlled errors
  - docs describe the new export hierarchy accurately

## System-Wide Impact

- [routes.py](D:\oil\Duo-Galym-Dauren-Project\apps\api\app\api\routes.py) should remain contract-stable; this plan changes artifact presentation, not route shape.
- The browser print-view path depends on `render_html(...)`, so HTML can no longer be treated as an afterthought if PDF/DOCX hierarchy changes.
- The live demo and pitch pack depend on exports being visually strong and narratively aligned; docs must be updated if page-one hierarchy changes.
- Cross-format parity matters here: PDF and DOCX are separate surfaces with shared stakeholder expectations, so drift between them is a user-visible quality risk.

## Test Scenarios

### Prepared Report Structure

- `prepare_report(...)` produces executive-summary and metadata-oriented blocks for EN reports.
- `prepare_report(...)` produces the same semantic blocks for RU reports without mojibake or missing labels.
- Existing facts, tasks, audit events, and methodology points remain present after the refactor.

### PDF Rendering

- PDF export renders the new executive-first opening hierarchy successfully.
- PDF export still uses a Unicode-capable font path and never silently falls back to non-Cyrillic-safe rendering.
- PDF report includes a visible workflow-style audit section and print-aware metadata treatment.

### DOCX Rendering

- DOCX export renders the same information order as PDF even if the layout is simpler.
- DOCX headings, tables, and metadata remain readable in EN and RU with the explicit font configuration.
- DOCX report includes the management snapshot before deeper evidence sections.

### HTML / Print View Rendering

- HTML print view reflects the same top-level hierarchy as PDF/DOCX.
- HTML report remains suitable for browser print/save-as-PDF usage in the demo.

### Route-Level Behavior

- Export routes still return valid files for supported locales.
- Missing-font conditions still fail in a controlled way rather than generating broken artifacts.

## Verification

- `py -m pytest` in [apps/api](D:\oil\Duo-Galym-Dauren-Project\apps\api)
- manual export rehearsal in the app:
  - open incident
  - generate report
  - download PDF
  - download Word
  - open print view
  - verify first page is readable and visually aligned across formats
- RU export spot-check:
  - confirm Cyrillic survives in page-one summary, facts, and audit/timeline areas

## Risks and Mitigations

- Risk: stronger visual treatment reintroduces PDF/DOCX fragility
  - Mitigation: keep font resolution and locale handling intact; change structure before embellishment

- Risk: PDF and DOCX drift into visibly different report hierarchies
  - Mitigation: define semantic blocks in `PreparedReport` first and make all renderers consume the same order

- Risk: first page becomes prettier but still too dense
  - Mitigation: enforce a management snapshot tier with explicit top-of-report content priorities

- Risk: timeline treatment becomes over-designed or brittle in DOCX
  - Mitigation: allow format-specific simplicity while preserving the same sequence semantics

- Risk: HTML print view falls behind PDF/DOCX and weakens the live demo
  - Mitigation: include `render_html(...)` in the same redesign pass rather than treating it as optional follow-up

## Open Questions

### Resolved During Planning

- Styling parity should be semantic, not pixel-perfect. The plan explicitly targets shared hierarchy and information order rather than fragile exact visual equivalence.
- Footer/header treatment should be implemented as restrained print-aware framing, not as an elaborate document chrome system.
- The timeline should be richer in PDF and simpler in DOCX if needed, as long as both clearly communicate the same workflow sequence.

## Dependencies / Assumptions

- The current report already contains enough data to support an executive brief without new backend fields.
- Existing route contracts do not need to change for this redesign.
- A new service-level test module for exports is acceptable and preferable for this feature-bearing backend surface.
- Demo value depends on the browser print view staying structurally aligned with downloadable artifacts.

## Next Steps

→ `ce:work` on this plan
