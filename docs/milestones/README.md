# Milestone quality evidence

This directory is the chronological archive of production quality evidence and meaningful milestone records. Keep entries factual, concise and suitable as source material for case studies.

## Naming and provenance

Name records `YYYY-MM-DD-concise-milestone-description.md`. Use the capture date when known; otherwise identify the date as the acceptance or record date. Associated screenshots and reports should share the record's date and description, with a descriptive suffix.

Each record should identify the sprint, exact deployed Git SHA, production target, capture date/time and timezone when available, measurement environment, and evidence source. Separate baseline production, local optimized-build and final production measurements. Mark unavailable measurements or capture metadata **Not captured**; never substitute local values for production results.

Preserve existing, suitable Lighthouse reports, axe reports and screenshots when available. A manually reported result must be identified as such. Do not fabricate artifacts or include credentials, account identifiers, private browser information or unnecessary raw provider data. Raw performance traces are not archived by default; preserving one requires a specific documented reason and privacy review.

## Sprint-close convention

Every sprint close should archive final production Lighthouse and axe evidence associated with the exact successfully deployed Git SHA. Record:

- Sprint, production URL, exact SHA, deployment confirmation and actual capture date/time.
- Lighthouse Performance, Accessibility, Best Practices, SEO and Agentic Browsing where available, plus FCP, LCP, TBT, CLS and Speed Index.
- axe issue count and available tool/version, scan configuration and standard.
- Suitable report exports/screenshots, evidence provenance and any missing captures.

This is the project convention, not a claim that automated collection already exists. Remaining SCRUM-50 work includes automating sprint-close Lighthouse and axe collection and incorporating the recurring evidence requirement into normal Scrum acceptance criteria/workflow.

## Records

- [2026-10-07: Initial-route CLS remediation](2026-10-07-initial-route-cls-remediation.md)

- [2026-10-09: Accepted content and history-refresh shipment](2026-10-09-accepted-content-and-history-refresh.md) - production results recorded; two original screenshots pending receipt.
