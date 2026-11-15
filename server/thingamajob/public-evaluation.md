# SCRUM-141 — public evaluation evidence and funnel

Coach approved Phase 2 after comment 10143, changing the proposed retention to
**90 days**. Phase 1 is historical evidence, not a count of future use. This
implementation does not alter canonical career facts or classification policy.

## Collection and private access

The existing public Worker owns `thingamajob_public_attempts` and
`thingamajob_public_events` in its existing D1 database. The existing private R2
bucket owns only the new `public-evaluations/v1/<attempt UUID>/` prefix for new
public submissions. There is no public read/list endpoint, dashboard or new
ingestion/provider service. Operator access continues to require existing
Cloudflare account/bucket/database authority. Never export raw records to Jira,
GA, public logs or the public site's assets.

One Evaluate click carries the same attempt UUID through intake and evaluation.
The ledger records creation/update/expiry, input method, preparing/prepared/
evaluating/complete/failed/rejected status, stage/code, policy, canonical snapshot
digest/count, runtime version and available provider metadata. Claiming evaluation
is atomic; an already processed key cannot trigger another provider call. An
explicit retry is a new attempt. Older clients without correlation headers remain
supported, but intake and evaluation cannot reliably be joined and method is
`unknown` rather than guessed.

Private objects contain submitted text (or URL; extracted text for supported
files), normalized input, exact evaluated text, raw provider response/usage,
unvalidated mapped response and final detailed result/summary, where each stage
was reached. Filenames and original upload binaries are not retained. Unsupported
or unreadable files have an attempt/error record, not fabricated extracted text.
URL retrieval/security guards remain unchanged. Normalization failures retain
available submitted text/URL before normalization. Invalid/oversized requests may
have metadata only. Browser input and manual recovery remain intact.

Provider request/response IDs, model, HTTP/completion status, input/output/total,
cached-input and reasoning tokens are retained where supplied, before output
parsing/reference mapping/application validation. D1 and R2 writes are each
attempted if the other fails after a paid response. Missing usage is unavailable,
not zero. No price for the configured model is inferred: USD estimates and billed
cost remain unavailable until a verified rate card/billing export is provided.
No paid verification call is required by this change.

## Funnel vocabulary

- `evaluation_submitted`, `evaluation_completed`, `evaluation_failed`: authoritative
  server events plus content-free GA events from the UI. Use ledger status for
  operational counts; do not sum the two transports. Submission means Evaluate,
  not necessarily a paid provider call.
- `evaluation_result_viewed`: the result heading intersects the visible viewport
  while the document is visible. The Worker accepts it only for complete attempts.
- Existing `case_study_open`, `work_open`, `resume_download`, `contact_click` and
  `external_profile_click` retain their meanings. Downloads/contact/outbound links
  measure activation intent, not completed download/contact/hiring.
- `case_study_view`, `evidence_view`: allowlisted Angular navigation completions,
  distinct from clicking a link. They do not prove that the visitor read the page.

A random, nonrolling 30-minute sessionStorage identity joins the latest evaluation
attempt to subsequent same-tab events. No fingerprint, IP, email, user agent,
submitted URL, filename, JD, result, career statement or correlation UUID goes to
GA. GA receives existing safe location/page enums and input method only. Private
events accept finite names/context enums and require matching unexpired
session/attempt IDs. Client events cannot assert server completion/failure. Private
follow-through is best-effort, independently rate-limited, deduplicated per
attempt/event/context, and cannot block navigation. Existing internal-analytics
opt-out remains honored. No events are posted without a recent evaluation.

## Retention and deployment

Apply additive `public-evaluation.sql` to the existing D1 before deployment.
The ignored runtime config must mirror the tracked example's `JD_TELEMETRY_LIMIT`,
version metadata binding and daily `17 4 * * *` trigger (04:17 UTC). Existing
provider rate limits, secrets, canonical inventory pin and Access remain intact.

Add R2 lifecycle rule `public-evaluation-90-days`, prefix
`public-evaluations/v1/`, expire after 90 days. Preserve all prior lifecycle rules.
The Worker's scheduled handler deletes expired new-prefix objects first, then
their D1 events/attempt and corresponding new diagnostic reference. Retry is
idempotent; a storage deletion failure preserves the row for the next run.
Expiry is fixed at creation + 90 days and follow-through does not extend it.
Expired records cannot accept events; physical cleanup occurs on the next daily
run (up to 24 hours later), bounded to 1,000 expired attempts per run. Monitor the
expiry index/cron if volume approaches that bound. R2 lifecycle independently
expires orphaned new-prefix objects. Never apply these rules to `workspaces/`,
archived sources, LoT, prior private evaluations or permanent project history.

Limits: requests blocked before reaching the Worker cannot be recorded; D1/R2
outages can prevent recording, in which case evaluation fails before provider
spend when possible. Abrupt termination may leave a pending stage, not a proven
completion/failure. Provider timeouts may have unknown billing. Correlation is
anonymous, client-reported, same-tab/latest-attempt and short-lived; it cannot
identify people or reliably distinguish bots/owner testing from visitors.
Blocked analytics, navigation away and lost client events are not proof of
abandonment. Account-wide billed cost still requires OpenAI billing evidence.

Verification uses fictional provider fixtures and expiry, duplicate-request,
canonical-isolation, GA/privacy and failure tests. Production smoke may use a
deliberately invalid fictional input that fails intake before any provider call;
identify it as operator verification, never as real visitor or live evaluation
acceptance. Release receipts/evidence belong in SCRUM-141.
