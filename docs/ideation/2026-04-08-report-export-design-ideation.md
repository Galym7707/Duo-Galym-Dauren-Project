---
date: 2026-04-08
topic: report-export-design
focus: Improve PDF and Word export presentation without breaking Unicode reliability
---

# Ideation: Report Export Design

## Codebase Context
- Export generation is centralized in [report_exports.py](D:/oil/Duo-Galym-Dauren-Project/apps/api/app/services/report_exports.py) for HTML, PDF, and DOCX.
- PDF is built with ReportLab using `SimpleDocTemplate`, `Paragraph`, and table-heavy sections.
- DOCX is built with `python-docx` using mostly default `Table Grid` styling and plain paragraphs.
- A recent hardening pass fixed Unicode font handling and removed unsafe silent fallback to Helvetica.
- Current design is stable but visually utilitarian: metric cards are still table cells, facts are dense, and PDF/DOCX do not yet feel like a polished boardroom artifact.
- The strongest constraint is reliability: any design upgrade must preserve Cyrillic rendering, predictable pagination, and demo-safe export behavior.

## Ranked Ideas

### 1. Executive Brief First Page
**Description:** Add a compact executive-first opening section for both PDF and DOCX: title, status badge, one-sentence summary, top 3 metrics, recommended action, and report timestamp before the denser operational sections.
**Rationale:** This is the biggest judging upgrade for the least risk. The first visible page becomes readable to a top manager in 10 seconds and aligns with the pitch language of MRV, prioritization, and action.
**Downsides:** Requires rebalancing current section order and trimming some repeated detail from the top.
**Confidence:** 93%
**Complexity:** Low
**Status:** Unexplored

### 2. Export Design System Tokens
**Description:** Define a small shared export design system inside the backend export module: typography scale, spacing scale, border colors, panel fills, badge colors, section spacing, and table header treatment, then apply it consistently to PDF and DOCX.
**Rationale:** Right now the files are functional but visually inconsistent and a little generic. A shared token layer gives both formats a more intentional look and reduces drift between PDF and Word.
**Downsides:** Some token concepts will map imperfectly between ReportLab and `python-docx`.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 3. Two-Tier Content Hierarchy
**Description:** Split export content into two tiers: "Management snapshot" and "Operational evidence". Keep the current details, but clearly separate them with stronger section headers and a lighter visual weight for secondary material like methodology and full audit.
**Rationale:** The current export treats nearly every block as equally important. A two-tier hierarchy would make the document feel more mature and easier to scan in a meeting.
**Downsides:** Needs careful copy trimming so the top tier stays short.
**Confidence:** 88%
**Complexity:** Low
**Status:** Unexplored

### 4. Incident Timeline Strip
**Description:** Replace the plain audit list with a timeline-style block that visually shows the sequence `screening -> incident -> task -> report`, using timestamps and small status markers.
**Rationale:** This reinforces the product differentiator directly inside the export artifact. It makes the MRV workflow feel concrete instead of looking like a generic report appendix.
**Downsides:** Harder to lay out cleanly in DOCX than in PDF.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 5. Branded Evidence Panels
**Description:** Rebuild the current metric/facts tables into cleaner evidence panels: compact summary tiles for key numbers, a structured asset/location panel, and a dedicated "why this area matters now" panel.
**Rationale:** This keeps the existing data model but upgrades the visual language from spreadsheet-like to product/report-like. It would materially improve screenshots and printed output.
**Downsides:** More layout work than simply restyling tables.
**Confidence:** 84%
**Complexity:** Medium
**Status:** Unexplored

### 6. Print-Aware Footer and Metadata Line
**Description:** Add a consistent footer/header treatment with document ID, generation timestamp, locale, and page numbering, plus a short classification line such as "Screening and operational prioritization report".
**Rationale:** Small change, big enterprise signal. It makes the export feel official and easier to reference when printed or shared.
**Downsides:** Mostly polish; does not solve the main first-page readability issue alone.
**Confidence:** 82%
**Complexity:** Low
**Status:** Unexplored

### 7. Boardroom Theme Variant
**Description:** Introduce a restrained visual theme tuned for executive sharing: stronger title band, cleaner contrast, softer table lines, and less default-document styling.
**Rationale:** This is the fastest pure-design upgrade after stability. It would make the artifact look less like generated internal tooling and more like a prepared briefing pack.
**Downsides:** If done without hierarchy work, it risks becoming surface-level polish only.
**Confidence:** 78%
**Complexity:** Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Add cover page with hero image | Too decorative for MVP and wastes the first page. |
| 2 | Embed real map snapshot in every export | High complexity and brittle across PDF/DOCX for limited judging value. |
| 3 | Add charts for methane trend by default | Better as a later analytics enhancement; current export needs hierarchy first. |
| 4 | Add comparison pages across regions | Outside current report purpose and not needed for the demo loop. |
| 5 | Export to PowerPoint as well | Too expensive relative to value right now. |
| 6 | Rich interactive PDF bookmarks and links | Nice to have, but not the strongest visual upgrade. |
| 7 | Add signatures / approval workflow blocks | Implies enterprise process maturity not yet backed by the product. |
| 8 | Add custom icons everywhere | Higher design effort than value and can look gimmicky. |
| 9 | Add legal/regulatory annex pages | Bloats the artifact and hurts first-read clarity. |
| 10 | Rebuild export as HTML-to-PDF only | Risks destabilizing the current hardened PDF path. |

## Session Log
- 2026-04-08: Initial ideation - 17 candidates considered, 7 survivors kept.
