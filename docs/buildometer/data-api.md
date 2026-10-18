# SCRUM-120: data foundation and native charts

## Boundaries

`BuildometerDashboard` is independently embeddable and owns loading, headline presentation, charts, source freshness and errors. `BuildometerDataStore` is a lazy-provided singleton with single-flight and 15-minute reuse; the page reads the same result for details/journal. One GET `/api/buildometer` per initial dashboard load, no per-chart fetches and no provider call on skin changes. `InstrumentCluster` and `MetricChart` are presentational only. The Buildometer Page adds interpretation, bug/scope details, journal receipts and methodology. No new skin was built.

The public Worker handles only `/api/buildometer`; all other paths continue to the same assets. Exact-path worker-first routing keeps API traffic out of the SPA fallback and keeps homepage assets/prerender unchanged. Worker-side requests use fixed environment scope, never browser-supplied JQL/IDs. No framework/database/chart package.

## Actual Jira discovery and capture

The connected Jira reader discovered one team-managed board with To Do, In Progress, In Review and Done (status categories new, indeterminate, indeterminate, done). Its estimate field is `Story point estimate` (`customfield_10016`, jsw-story-points schema); Sprint is `customfield_10020` (gh-sprint schema). The runtime adapter discovers equivalent schema IDs rather than assuming these numbers across sites. The project has an active Sprint 0 and a future Sprint 1, no closed sprint, and no currently populated estimates or sprint memberships in the captured issue set. No approved rework classification exists. Issue types in the capture are Task, Story, Subtask and Epic; bugs are explicitly labelled `bug`, not Bug-type rows.

A complete current-issue capture contains 121 issues. History was requested for each issue with oldest-first pagination; All 121 are now accounted for: a failed changelog call was retried with a smaller page and returned an explicit zero-entry history. The sanitized public snapshot contains aggregates only. Private normalized capture remains in ignored local tmp storage, never public assets or Git. Current fields and metric-relevant history are accounted for across all 121 captured issues.

The real snapshot yields 101 top-level non-epic/non-onboarding work items: 16 Done, 85 open. These are inventory, not committed project scope. Three currently bug-labelled work items include one open and two resolved. Their initially present labels and complete field-change history establish classification at issue creation; resulting mean classification-to-latest-Done is 51.2 hours across two pairs. This is not real-world time-to-detection. The seven-day Jira resolution cohort contains one currently Done item; counts remain different from shipped releases. One missing resolution date is backed by its complete dated last-Done transition, not an invented date.

## Endpoint coverage

Runtime adapter uses Jira Cloud REST v3 `/field`, `/project/{key}/statuses`, POST `/search/jql` (all nextPageToken pages), POST `/changelog/bulkfetch` (field-filtered, paginated, 500-issue batches), plus Agile `/board/{id}/configuration` and `/board/{id}/sprint` pagination when a board is configured. Search requests issue key/type/status/category, created/updated, resolution/date, parent, labels/components, estimates and sprint membership. History retains status/resolution, reopen transitions, labels/type, project/parent, sprint and estimate changes. No summary, description, comments, users, attachments or worklogs are requested. There are no write operations. Bounds/timeouts and duplicate/page-loop checks fail closed rather than calling a partial result complete.

Connected-tool verification used project fields, board configuration, sprints, paginated JQL and per-issue paginated changelogs. The runtime bulk adapter is verified with deterministic fixtures, not live credentials. Its endpoint semantics follow the official Jira Cloud REST v3 issues/search documentation.

## Runtime configuration dependency

Production currently has no Jira secrets. The connected app authorization is NOT a deployable credential. Therefore the API explicitly returns `snapshot` (or `stale` after 24 hours) with the original capture timestamp and a runtime-unavailable message. It does not present this capture as live. Deployments continue independently through the existing trusted sanitized history pipeline.

Configure these server-side values on the existing djamespoer-com Worker using Cloudflare Settings > Variables and Secrets, or `npx wrangler secret put NAME` from the release checkout. Enter values only in the secure prompt, never chat, source or browser config:

- JIRA_BASE_URL: the authorized Jira site's HTTPS root ending in .atlassian.net.
- JIRA_EMAIL: the read-only API account's email.
- JIRA_API_TOKEN: its API token with read access to the intended project, fields, status/changelog and Agile board/sprints.
- JIRA_PROJECT_KEY: the portfolio project key.
- JIRA_BOARD_ID: the discovered portfolio board ID (needed for sprint evidence).

No key is created or requested in chat. Once configured, the next uncached API acquisition uses the provider; no frontend change is required. The runtime acquisition/credential verification remains an explicit follow-up gate. Aggregate API output is cached for 15 minutes per isolate (single-flight), with a 60-second response cache. Cache misses may run an acquisition in another isolate; this is not a global scheduled ingestion service.

## Derivations and charts

- Completion: unmeasured; no approved committed project denominator. Done/open inventory is displayed without turning its ratio into completion.
- Velocity: unmeasured; estimate field exists but is unused and no legitimate closed estimated period is available.
- Throughput: currently Done items resolved within seven days; missing resolution dates may use complete last-Done transition evidence. Fourteen exact 24-hour buckets end at Jira fetchedAt. This is a current resolution cohort, not all historic reopen cycles or production release dates.
- Deployments: original seven-day retained unique successful production activations, ending at deployment checkedAt; daily bars. Existing acquisition and release refresh unchanged.
- Scope/burndown: active sprint membership/status can be reversed from complete history; a non-sample initial cohort and legitimate timebox are required. The current dataset lacks that baseline both stay unmeasured. The line renderer handles valid remaining-work trajectories with source dates, and has been exercised with test-only valid series. No fixture is published, no ideal line invented.
- Bugs: open count from Bug type or explicit current bug label. Complete label history establishes first classification; initially present labels use creation time. Created vs Done-event bars/dashed line, historical open-state line, and resolved-pair duration bars are rendered. Reopens are counted from Done-to-non-Done transitions. Rework remains unmeasured, never equated to bug fixes. All bug charts describe the currently classified cohort; removed historical bug labels are not silently treated as a complete all-time bug registry.

Native responsive SVG bar/line charts are independent of skins. HTML values and expandable tables provide exact dates/values; SVG is decorative. Solid/bars versus dashed comparison distinguishes series without color alone. No chart keyboard interactions are invented; native data disclosures retain focus. Reduced motion and forced colors work. Charts recompose to a single column on mobile.

## Security and failure behavior

An allowlist derivation audit found zero issue keys, bodies, labels, people, account/provider IDs or raw history in the outgoing snapshot. A generation guard rejects known issue keys and private payload markers. Only counts, dated series, freshness and generic methodology are committed. Public journal receipts reuse previously public content unchanged. Credentials stay in Worker secrets; errors never echo credentials or raw provider bodies.

Jira failure uses dated retained aggregate evidence when available; otherwise affected values remain null. Deployment failure leaves Jira facts usable and deployment metrics null. Missing data is not zero. Client API errors preserve prior data with an explicit not-refreshed warning. UI and server validate the normalized contract. No homepage API request is made unless the dashboard is mounted.
