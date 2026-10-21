# Daily Scrum Brief and Product Journal

The brief answers: **what materially changed since the previous successful brief?**
It is not a project introduction or a repeating status attestation. The renderer
uses the stored date; Home and `/product-journal[/YYYY-MM-DD]` keep their routes.

## Reporting window and evidence

`publish.mjs` reads the actual PROD journal before generation. The newest earlier
published entry with a recorded cutoff establishes the exclusive lower bound;
this run's generation instant is the inclusive upper bound. Both are persisted.
Reconstructed entries never advance the successful-publication window. A missing
publication/cutoff fails closed rather than guessing a reporting period.

Historical generation instants were not stored. The corrected October 17, 19, 20
and 21 anchors explicitly use their original publication-commit timestamps and
label that limitation. New publications record the actual generation cutoff.
October 18 is reconstructed, not evidence that a brief successfully published then.

The deterministic generator reads first-parent main-history timestamps and changed
paths. It includes only `(previous cutoff, current cutoff]`. It excludes automatic
journal/deployment snapshots, generated build data and test/document-only changes
from material product activity. Public implementation changes are grouped by area,
not presented as commit logs. Raw private sources, provider payloads and secrets
are never collected. No model call or new Jira/report acquisition path is added.

`status.json` now holds **source-commit-bound public change summaries**, not reusable
recentlyShipped/currentFocus/next prose or an expiring attestation. A reviewed
summary can appear only when its source commit is actually in this window.
These summaries provide the richer outcome wording for the October 21 reference
case and subsequent homepage/grid work. Other changes receive a bounded area-level
summary; the generator does not infer an outcome, blocker or future plan from a
filename. A quiet window produces one short sentence, with no minimum item quota.

Same-day retries retain the day's original wording and cutoff. Afternoon changes
cannot get pulled backward into a morning brief. New days include the intervening
work. Tests exercise the actual October 20/21 Git windows, boundary timestamps,
future-note exclusion, sparse output, reconstruction, retention and failure safety.

## Archive and publication

The owner-supplied October 2-21 correction replaces the inaccurate archive in place.
One correction note is retained on the journal; no parallel bad-brief archive is
created. Future publication preserves that note and every earlier dated entry.

The generator prepares snapshot/history together and restores previous bytes on a
write error. Only the two content files are committed after a successful build.
Backdated generation fails closed. The workflow verifies the exact served JSON hash
before reporting successful publication. Build/deployment failure leaves the last
valid site available. Missing evidence is not converted into invented activity.

Scheduling is unchanged: the production Worker has an hourly UTC Cron, gates at
10 AM America/New_York with later same-day recovery checks, and dispatches the
existing GitHub `workflow_dispatch`-only job. There is **no GitHub Actions cron**.
Existing durable dispatch receipts, concurrency, credentials and runtime-secret
binding are unchanged. The normal Actions content commit to main triggers
Cloudflare Git integration (`npm run build` then `npx wrangler deploy`). Workflow-only
files remain excluded from Cloudflare watch paths. No second deployment path,
Slack, database, measurement formula or public/private boundary is introduced.

Failures remain visible in Actions logs/summary and Workers Builds. A push race
rejects normally; never force-push. No publication is claimed until PROD read-back
matches the committed journal.
