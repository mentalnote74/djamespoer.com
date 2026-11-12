# SCRUM-172: bounded daily execution-order correction

The existing Worker dispatches `.github/workflows/daily-scrum-brief.yml`, which invokes `scripts/scrum-brief/publish.mjs`. The publisher now awaits canonical reconciliation/check before `generate()` and saves `public/data/buildometer-reconciliation.json`. No second workflow, scheduler, ledger, provider credential or calculation engine.

The adapter reuses the canonical approved ledger/projector and release-check. It reads only approved scope from Jira; missing/changed estimates or newly Done uncredited members require review. It checks actual live source identity and distinguishes data-only paths from unreviewed code. Neither Jira Done nor an unreviewed release can award points. No scope mutation, reestimate, unship or append occurs in this first bite. Already-approved ledger updates are recalculated; new decisions still use existing guarded prepare/apply. The219/477 baseline and observation2026-11-12T19:36:45.693Z remain untouched.

Result states are checked, pending or failed. Last checked is the actual check time, independent of progress observedAt. A failure/pending result composes only with approved retained numbers plus explicit system warning; invalid canonical evidence blocks composition entirely. The system receipt precedes untouched ChatGPT-authored sections on new-day composition. Same-day editorial history remains frozen, while its separate operational receipt can update. Workflow summary and the public operational receipt expose failures even if later authoring/publication fails.

Validation: one focused existing Node test invocation, `node --test scripts/scrum-brief/daily-reconciliation.test.mjs`, proves asynchronous await ordering, pending/failure retention and invalid-ledger blocking. No broad suite or repeated local build. The normal main/Cloudflare build and one real manual invocation of the existing publication job supply integration evidence.

## Schedule handoff — not changed

Repository: wrangler.jsonc hourly cron; server/buildometer/daily-report.ts reportDue permits>=10:00 America/New_York. Worker scheduled handler still runs daily measurement snapshot and brief dispatch in parallel. This change orders reconciliation before editorial composition inside the existing publisher, not before the separate Worker measurement snapshot.

Separate owner: ChatGPT chat **Buildometer recalculation schedule**, id6af5da57-c2a4-83ea-8402-3edec4dc2f21. In coordination response November12, owner reports **Portfolio Executive Summary Brief** enabled daily05:00 America/New_York, nextNovember13. That schedule does not establish repository execution. Owner was explicitly notified; no schedule was edited or new timer created. James/schedule owner must authorize/coordinate alignment of the actual Worker invocation or an explicit bridge. No05AM repository readiness claim.

## Remaining gaps

- Align repository execution with the owner-approved05AM target; verify actual schedule/run receipt.
- Integrate check freshness into Home/dashboard/API and the separate measurement report under SCRUM-173; this bite reports it in the editorial brief/operational receipt only.
- Immediate verified eligible-release reconciliation remains unimplemented; no new post-release trigger.
- Admission of new scope/estimates and accepted shipment changes remains guarded by existing approval/evidence rules. Cross-program totals remain unapproved.

Keep SCRUM-172/173 In Progress. No whole-story closure or new shipped credit for this partial correction.
