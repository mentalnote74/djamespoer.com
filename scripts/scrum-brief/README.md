# Daily Executive Scrum Brief

The checked-in snapshot preserves the approved October 16 copy exactly (whitespace normalized). Home owns placement; DailyScrumBrief owns semantic rendering. The stored snapshot date is rendered, never today's browser date.

## Deterministic daily checkpoint

Edit only public, owner-approved `scripts/scrum-brief/status.json`: 2–4 recently shipped items, 1–3 current focus items, one next gate. `sourceCommit` must exist in the checkout's ancestry. `verifiedOn` and `validThrough` bound the explicit status attestation (maximum seven days); initial approval expires after October 17. Re-attest only after checking actual project state. No commit-message inference, private Jira import, model calls or benchmark/client data. Checkpoint ancestry proves lineage, not the truth of prose: maintained metadata is the status authority.

Run `node --test scripts/scrum-brief/generate.test.mjs`, then `node scripts/scrum-brief/generate.mjs`, then `npm run build`. Generation uses America/New_York date, verifies all inputs before writing, and atomically replaces one snapshot containing content, date and lightweight provenance. Invalid/expired input fails closed, preserving the previous public snapshot/date. Build failure never publishes anything. Interpolated text is rendered as data, not HTML. Do not edit only the snapshot date.

## Scheduler / publishing recommendation

No existing repository scheduler was present. `.github/workflows/daily-scrum-brief.yml` defines GitHub Actions cron at 09:15 America/New_York (09:15 Eastern year-round; GitHub handles DST) plus manual dispatch. GitHub schedules run from the default branch and can be delayed; this workflow is local/unpushed until separately approved for activation. It uses read-only repository permissions, no secrets, no writes/push and no deployment command. Successful generation + build uploads a 14-day checkpoint artifact. Errors stay in Actions logs; failed jobs upload no candidate and public content/date remain unchanged. ZERO ChatGPT automation slots; ZERO recurring OpenAI/Codex invocations.

Do not enable zero-touch PROD publishing yet. PROD uses a deliberate production-history refresh and public Worker release, while protected work and public release branches coexist. A scheduled default-branch checkout is not necessarily the approved public release. Prefer artifact -> review/copy candidate snapshot -> normal public release build/history refresh -> deploy. Before any future automatic release, establish a dedicated public release ref, reviewed status ownership, restricted deploy permissions and a live verification/rollback gate. The cron does not bypass these controls.

Provenance inside the generated snapshot records approved source SHA, generator checkout SHA and status SHA-256. It contains only public metadata and is not displayed by the component. No private provenance or credential data belongs here. GitHub artifact upload is restricted to this public snapshot; compiled output and logs are not published to the site.
