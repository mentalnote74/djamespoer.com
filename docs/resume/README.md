# SCRUM-161 / SCRUM-162 approved resume release

Owner approved both November 6, 2026 DOCX sources and authorized release after checks. Sources were read from `C:/Users/djame/Documents/Codex/2026-11-05/g/outputs/`:

- `D_James_Poer_General_Resume_2026-11-06.docx`
- `D_James_Poer_Comprehensive_Resume_2026-11-06.docx`

These supersede the November 2 PDF for this release. The original DOCX files were not edited, copied into public assets, or committed. Source and final PDF SHA-256 receipts, page counts and preserved hyperlink targets are in `approved-2026-11-06.json`. James owns approval of future source revisions; retain prior originals, export from the newly approved DOCX, recheck all prose/links/pagination/metadata, and replace the stable public PDF only after validation. This publication does not ingest or modify Thingamajob's private career archive or Library of Truth.

## Export and verification

Native Word COM export stalled. An isolated Chrome print export was made directly from each approved DOCX's OOXML paragraphs, runs, hyperlinks and page breaks, using its Arial type sizes and letter page margins. No earlier PDF contributed content. Explicit DOCX page breaks are preserved. Browser pagination can differ from Word; this is a checked PDF export, not a claim of a native Word render.

All 47 general and 139 comprehensive source paragraphs (including empty page-break paragraphs) were included in ordered text comparison. Extracted PDF text equals the source after removing whitespace and generated bullet markers. General is two pages; comprehensive is six. Every final page was rendered and visually inspected: readable text, no clipping/overlap or broken section boundaries. The EXL advice sentence is a separate bullet immediately after Justinmind. All three source hyperlinks in each document remain clickable annotations. The final PDFs are selectable text and retain tags; no PDF/UA certification or screen-reader audit is claimed.

Final Info metadata is limited to Title (`D. James Poer General Resume` / `D. James Poer Comprehensive Resume`), Author (`D. James Poer`) and Subject (`djamespoer.com`). Creator/Producer and XMP tool/template metadata were removed.

## Public contract

`/resume` is lazy-loaded, prerendered, canonical and included in the public route registry/sitemap. Exactly three native anchor choices:

1. Full career history: `/assets/resume/d-james-poer-comprehensive.pdf`
2. Modern/general: `/assets/resume/d-james-poer-resume.pdf` (established URL preserved)
3. Custom for a job: `/thingamajob` directly, without a new workflow.

Header and the retained Hero component now lead to `/resume`. The old Hero is not currently mounted by public route templates; its rendered anchor is covered by a focused unit regression check. Actual public header navigation was exercised by keyboard at desktop and pointer through the mobile menu.

## Analytics and checks

Both downloads reuse PublicTrack and the existing consent/internal/privacy helpers. General retains `resume_download` with `asset_name=resume_id=public-current`; comprehensive uses `public-comprehensive`. No filenames, full URLs or source prose go to GA. The existing optional evaluator follow-up POST still groups static resumes under its legacy `public-current` context; use GA's `resume_id` for variant-level reporting. This release does not change that remote endpoint. Experiment remains inactive.

- `npm run build`: passed; 66 prerenders, 485.07 kB initial / 123.26 kB estimated transfer. Existing module-type and Rigby SCSS size warnings.
- Full `npm test -- --watch=false`: blocked by the same two unchanged TS2339 errors in `case-study/authored-studies.spec.ts` (evidence/items). No unrelated repair.
- Focused unit tests: download IDs, runtime privacy allowlist, header navigation and rendered Hero entry. Final count recorded in AI_HANDOFF.
- `node scripts/resume/validate-browser.mjs`: real pointer/Enter PDF downloads match approved artifact hashes; one event per download, direct custom navigation and one open event; 1440/390 widths, one main, no overflow, Tab order, scoped axe zero, no page errors. All requests intercepted; no public analytics sent.
- `node scripts/analytics/validate-browser.mjs`: all 12 existing consent/internal/preference/input/privacy checks pass with controlled fixtures; no public analytics sent.

Ignored export and browser evidence is retained under `tmp/resume-release/`. Reproduce website checks with `npm run build` then `node scripts/resume/validate-browser.mjs`. Use the source hashes to establish the exact DOCX inputs before any future re-export.
