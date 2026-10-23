# Daily Scrum Brief / Product Journal handoff

Authority: [SCRUM-57 comment 10136](https://djamespoer.atlassian.net/browse/SCRUM-57?focusedCommentId=10136)
and the [October 19 editorial guide, comment 10091](https://djamespoer.atlassian.net/browse/SCRUM-57?focusedCommentId=10091).

## 9 AM: ChatGPT authors; Jira holds the payload

ChatGPT writes the public-safe executive narrative from verified project evidence,
following the October 19 guide. It creates ONE comment in SCRUM-57 for the current
America/New_York calendar date. Use this exact first heading (replace the date):

`Daily Executive Scrum Brief - YYYY-MM-DD`

Put one JSON code block beneath it, using the existing brief section fields:

```json
{
  "author": "ChatGPT",
  "date": "YYYY-MM-DD",
  "sections": [
    { "heading": "Recently shipped", "paragraphs": ["The authored public narrative."] },
    { "heading": "Validated / learned", "items": ["The authored evidence/lesson."] },
    { "heading": "Current focus", "paragraphs": ["The actual active work."] },
    { "heading": "Next", "paragraphs": ["The meaningful next step."] }
  ]
}
```

This is the existing presentation model, not a second report format/store. The
example is structural guidance, never publication content. Omit sections without
meaningful content; every included section needs a heading and nonempty paragraph,
paragraphs or items. Strings are published exactly as authored, including punctuation
and paragraph/list boundaries; use plain text inside strings. Do not include raw
private evidence, credentials or career-source documents. Edit the same daily
comment to correct it BEFORE publication; do not create competing same-day payloads.
The comment must be created that Eastern day and not have a future update time.

## 10 AM: the existing publisher carries the baton

The production Worker keeps its existing hourly UTC Cron, 10 AM Eastern gate,
durable dispatch receipt and GitHub `workflow_dispatch` bridge. No new scheduler,
GitHub cron, report store, model call or deployment mechanism is introduced.

The existing Actions job checks out main and calls `publish.mjs`. That publisher
still reads PROD history, calls the existing `generate()`/`savePublication()` path,
builds, commits only the two existing publication files, pushes main and verifies
the exact live journal hash after Cloudflare Git deployment.

For a NEW day, `generate()` now reads all SCRUM-57 comment pages from Jira, selects
exactly one dated payload, validates authorship/date/section shape and passes its
sections unchanged to the existing journal writer. It never calls the Git digest
or composes fallback prose. Jira comment URL, content hash and authoring cutoff are
stored in existing provenance fields; no raw Jira response is copied to the client.
The old Git-summary helpers remain only for historical regression checks; neither
the publication workflow nor the generator CLI invokes them to author new days.

Missing, ambiguous, malformed, empty, wrong-date, future, inaccessible or unavailable
input fails the Actions job before writing content. No filler and no quiet zero.

## Credentials and recovery

The existing workflow binds repository Actions secrets `JIRA_EMAIL` and
`JIRA_API_TOKEN` to the same names already used by the project's Jira integration.
`JIRA_BASE_URL` is fixed to `https://djamespoer.atlassian.net`. The credential needs
read access to SCRUM-57 comments. Never put its value in Git, Jira or logs.

Same-day retries retain the already-created day's wording/cutoff and do not require
a new payload. This also preserves pre-amendment published history. No retroactive
rewrite of today's existing entry or the corrected October 2-21 archive occurs.
Missing earlier PROD publication/cutoff and backdated runs still fail closed.
Atomic journal/snapshot writes restore previous bytes on failure. Concurrency,
non-force pushes, build/deploy checks and last-valid-site behavior are unchanged.

If a new-day run fails, correct access or the one Jira comment, then manually rerun
the existing Actions publication workflow. An accepted Worker dispatch receipt
prevents repeated automatic dispatch; it does not prevent this established manual
recovery. The workflow fails visibly if the input is still missing/ambiguous.
