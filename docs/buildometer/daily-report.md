# Production daily measurement reports

The existing production Worker collects one Daily Scrum / Dev Report per America/New_York
calendar date. Its hourly UTC Cron checks Eastern time: first collection is at 10 AM;
later hourly checks through 11 PM recover a missed/failed collection. Before 10 AM it does
nothing. DST is handled by Intl timezone conversion, not a fixed UTC offset.

The GitHub workflow remains workflow_dispatch-only: no Actions cron is added. After the
same Eastern 10 AM gate, production Worker Cron independently collects measurements and
dispatches the existing daily-scrum-brief.yml workflow on main. A report collection failure
does not prevent the dispatch attempt. The existing generator, content format and Git/Cloudflare
publication path are unchanged. No recurring model calls or ChatGPT tasks are introduced.
Measurement collection itself still requires no report-content commits/deployments.

## Durable evidence and idempotence

Private R2 bucket djamespoer-daily-reports, object daily-dev-reports/v1.json, holds the
chronological archive. A daily ID is daily-dev-report:YYYY-MM-DD. Prior report values
remain unchanged. Conditional ETag replacement (or create-if-absent) prevents lost updates.
A concurrent loser reads the already-stored same-day result; other conflicts fail safely.
Same-day retries return the original observation without repeating provider acquisition.
No report is backdated. A whole-day outage produces a visible history gap, not invented history.
Archive failures are logged in Workers observability; later hourly triggers retry.

## Measurement/source contracts

- Project points use the approved Git ledger projection and applyProject, unchanged:
  shipped points / known total, one decimal. Initial T₀ remains 395/152/243/38.5%.
  Daily capture observes the latest approved snapshot; it does not adjudicate new shipment
  or automatically promote Jira Done to shipped. Keep the source observation timestamp.
- Full daily totals, shipped, remaining, completion and scope deltas are retained.
  Point histories merge actual daily captures with approved ledger observations.
  Invalid project acquisition retains earlier values as stale and leaves delta unavailable;
  it does not create a new valid burndown point.
- Jira uses acquireJira and the existing completion replay, filtered to approved portfolio
  membership. Completion cycles fall in (previous observation, current cutoff]. The current
  open bug-label count is separate from the historical bug-health cohort. No bodies, keys,
  people or raw changelogs are published. Missing runtime Jira credentials yield nulls.
- Deployments reuse the existing production-deployments adapter, not a new ingestion path.
  Missing live acquisition leaves the daily count unavailable; old snapshots are labelled stale.
  Native Workers requires manual redirect mode: both provider adapters reject non-2xx responses
  without following redirects or forwarding credentials. Node's error redirect mode is unsupported
  by the Workers runtime. The first October 18 record retained this acquisition failure honestly;
  its unavailable deployment count is preserved rather than rewritten after the compatibility fix.
- Release SHA is generated from the build checkout; release ID is the Worker version binding.
  The first window begins at T₀; later windows begin at the prior report cutoff.
  No historical velocity or pre-T₀ records are manufactured.

## Operations/presentation

GET /api/buildometer/reports returns the sanitized retained archive.
GET /api/buildometer/reports/YYYY-MM-DD returns an immutable dated record.
Buildometer shows the latest 30 reports at /buildometer#daily-dev-reports with links to
full evidence. Its existing API response carries the reports and point series: no new
browser/provider acquisition or homepage request.

POST /api/buildometer/reports/generate is an authenticated production run-now/recovery
control, using the same collector as Cron. It accepts no date/scope/provider parameters.
REPORT_GENERATION_TOKEN is a Worker secret; no ambient browser identity grants access.
CLOUDFLARE_ACCOUNT_ID and DEPLOYMENT_HISTORY_READ_TOKEN reuse secure read-only configuration.
JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN and JIRA_PROJECT_KEY remain the existing optional
runtime Jira configuration. Never put credentials in client code, query strings or reports.


## Editorial workflow dispatch bridge

October 19 diagnosis: production retained daily-dev-report:2026-10-19 with trigger scheduled
at 14:00:44.696Z (10:00:44 AM Eastern), but deployed scheduled code contained no GitHub
workflow_dispatch call. GitHub run history had no October 19 editorial run; the public
journal latestDate remained October 17. Worker secret inventory had no dispatch credential.
Thus this was a missing bridge/configuration, not a rejected dispatch or failed publication job.

Cloudflare Builds secrets are not runtime bindings. The successful main-build
postbuild hook binds the existing SCRUM_BRIEF_GITHUB_TOKEN build secret to the
Worker via Wrangler stdin before normal deployment. It does not rotate the value,
write it to disk, or print child output. Local/preview builds skip this step.
Missing build secret or binding failure stops production build/publication.

Worker secret SCRUM_BRIEF_GITHUB_TOKEN must be a fine-grained token scoped to
mentalnote74/djamespoer.com with Actions write permission (metadata read implicit).
Configure it in Cloudflare dashboard > Workers & Pages > djamespoer-com > Settings >
Variables and Secrets > Add secret. Never put it in source, browser code, logs or chat.
The scheduled code targets only the existing workflow/main; callers cannot override them.

POST /api/buildometer/reports/dispatch-brief is the authenticated run-now/recovery entrypoint,
using the existing REPORT_GENERATION_TOKEN. It accepts no body/query/date/branch parameters
and invokes the same function as Cron. A missing credential returns a specific 503 before
any dispatch. No GitHub dispatch attempt should be claimed until actual acceptance is recorded.

Private receipts use the existing R2 bucket, keys scrum-brief-dispatch/YYYY-MM-DD.json.
A conditional write claims each attempt. Already published dates and accepted dispatches do
not repeat. HTTP 200 acceptance retains GitHub's run ID/URL; legacy 204 is also accepted.
A concrete rejection is retained with its status and can retry after correction. Timeout or
an unresolved in-flight attempt blocks automatic redispatch: inspect GitHub runs before
repairing that private receipt. Do not delete accepted receipts simply to retry a failed job;
inspect/rerun the recorded workflow in GitHub. The existing workflow concurrency and same-date
journal upsert remain in force. Publication success is confirmed by reading PROD journal,
not merely a successful dispatch response. Logs include no credentials or response bodies.
