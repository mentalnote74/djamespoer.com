# Build & Deployment History

## SCRUM-63: production refresh lifecycle

The Oct. 6, 2026 checked-in snapshot was generated manually. Previously `npm run
build` ran only the timestamp generator before Angular compilation; every later
deployment therefore copied that same history asset. The cold Angular same-origin
loader has no application-level persistent cache or polling. Source inspection
establishes the missing generation step, not a browser-cache root cause.

`prebuild` now runs `scripts/deployment-history/build-refresh.mjs` before timestamp
generation and Angular compilation. In documented Cloudflare Workers Builds context
(`WORKERS_CI=1`, `WORKERS_CI_BRANCH=main`), refreshing is mandatory. Independent
production discovery, complete bounded acquisition, existing v4 sanitization,
validation and atomic replacement all finish before Angular copies public assets.
Failure stops the build; a failed refresh does not overwrite the last-known-good
file or rewrite its timestamps. This deliberately trades deployment availability
during provider/read failures for preventing silent stale publication. No automatic
fallback deployment, retry, scheduling or post-deployment hook was added.

Local builds and non-main preview builds explicitly reuse the existing asset and
make no implicit Cloudflare call, even if credentials exist. Unsupported/missing
hosted branch context fails closed. The verified empty-result policy and source
mapping remain unchanged. The complete provider list preserves historical,
repeated, failed and terminated attempts; matching IDs stay stable. This is not
a new durable archive/merge policy for records a provider may later stop returning.

### Build-only configuration and remaining external acceptance

James must configure the production Worker's **Settings > Build > Build Variables
and Secrets** with external `CLOUDFLARE_ACCOUNT_ID` and a secret named
`DEPLOYMENT_HISTORY_READ_TOKEN`. Use the existing account-restricted read permissions:
Workers Builds Configuration Read and Workers Scripts Read. Do not replace the
Wrangler deployment token, broaden permissions, add these to Wrangler runtime
variables, commit them, or put them in Angular. The default documented context
variables are supplied by Cloudflare; build/deploy commands remain `npm run build`
and `npx wrangler deploy`. No dashboard configuration was changed by the agent.

The manual command remains `npm run history:refresh` (Windows: `npm.cmd run
history:refresh`) from James's existing credential-bearing PowerShell session with
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. That explicit command uses the
existing generator; no JSON should be hand-edited. Do not paste either value into chat.

The agent's process has neither manual runtime input available. No live refresh
was performed, and the original 19-row asset/hash remains bug evidence. A mocked
regression proves an Oct. 6 artifact is replaced with three Oct. 7 attempts plus
the preserved older attempt, with successful/failed/terminated/repeated semantics
unchanged. Actual current Cloudflare rows and production acceptance remain external.

### Timing limitation

Generation occurs during Building, before this pipeline's final deploy outcome.
If the provider already lists the current attempt, its observed queued/in-progress
state is valid; final success/failure cannot be known yet. Provider visibility at
that instant is not assumed or proven. The next successful build refresh observes
earlier completed attempts, including failures before Building. A failed install
cannot publish a new snapshot. This expected lag in the current attempt's final
result does not explain repeatedly shipping the unchanged Oct. 6 file. No claim
of immediate post-deployment freshness is made.

Official references: [Workers Builds configuration and default variables](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
[build-only variables/secrets](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/),
and [read permissions for the Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/).

## Active simplified acquisition contract (schema v4)

James approved Cloudflare build-attempt records as the production source. The active path is Worker/production-scope discovery -> build-history list -> public sanitizer -> atomic static snapshot -> existing same-origin Angular loader -> consumer -> Smart Grid. No activation/deployment/version/traffic correlation, log parsing or GitHub inference is required. Old research below is superseded and isolated.

Public rows contain required `id`, canonical UTC `createdAt`, intended `environment` and `status`; optional `summary`, seven-character hexadecimal `revision` and `stage: 'deployed'`. Status includes `queued`, `in-progress`, `succeeded`, `failed`, `cancelled`, `skipped` and `terminated`. ID is `attempt-` plus SHA-256 of a fixed public namespace and the source attempt UUID: a deterministic public pseudonym, never the provider UUID. It retains retries separately even when revisions match. No account/Worker/trigger/build/version identifiers or repository plumbing reach the asset.

Cloudflare `created_on` becomes canonical record creation time. `status` queued maps to queued; initializing/running map to in-progress; stopped uses `build_outcome`: success -> succeeded, fail -> failed, cancelled/skipped/terminated remain distinct. Unknown outcomes and unsafe required records are omitted with value-free diagnostics. Optional `commit_hash` is accepted only as 7-40 hexadecimal characters, shortened to seven without inventing or repairing data. Missing/unusable revisions remain absent and display `Unavailable`. Optional commit message contributes a trimmed, control-free first line bounded to 240 characters. No logs or fallback facts are used.

Discovery independently identifies the configured Worker and active production trigger. Historical records must match its repository/branch and any supplied Worker association; retired trigger UUID differences do not invalidate legitimate history. Preview/other repository records are omitted. `Succeeded` becomes `Succeeded ? Deployed` only when both trusted production configuration and that attempt's recorded deploy command are exactly `npx wrangler deploy`. Other successes have stage unavailable; failed/terminated records never acquire a guessed failure stage.

The hardened transport retains only allowlisted provider fields, uses pinned-origin GET requests, external runtime credentials, bounded timeout and redirect refusal. Build-history pagination requests `page` and `per_page=100`; optional positive `total_pages`/`per_page` hints guide traversal, otherwise a short/empty page ends it. Missing optional count/page metadata is not an error. Traversal is bounded to 100 pages/10,000 records; read failure or bound exhaustion prevents publication. This is available provider history, not a forensic completeness certificate. See the [official list-builds API](https://developers.cloudflare.com/api/resources/workers_builds/subresources/builds/methods/list/).

Provider records can degrade or be omitted, but the final public batch still undergoes strict allowlist validation. Duplicate public attempt IDs, invalid public rows/envelopes or total loss of usable records from a nonempty response fail generation. A genuine empty provider response remains valid. The envelope is `{ schemaVersion: 4, checkedAt, generatedAt, refreshStatus: 'ok', rows }`; freshness remains separate. Readers reject v2/v3 explicitly.

Atomic sibling-temp writing, last-known-good byte/timestamp preservation, orphan cleanup and cancellation/loading/error/empty/pagination behavior remain intact. The historical schema-v2 verified-empty GitHub asset is untouched and safely rejected by v4; it has not been relabeled as Cloudflare evidence. No production snapshot was generated in this chunk.

After review, the read-only diagnostic command is `node scripts/deployment-history/cloudflare-build-history-diagnostic.mjs`, with existing external `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It prints endpoint success booleans and fixed-category counts only, never rows, revisions, identities, credentials or raw responses. The separately approved generation entry point is `node scripts/generate-deployment-history.mjs`; it now composes the same acquisition with the existing writer. Neither command was executed against Cloudflare in this chunk.

Focused verification: 87 Angular tests in five files and 136 mocked Node tests passed; Prettier and whitespace checks passed. Node tests cover sanitizer/status/degradation/retries/optional pagination/bounds/storage and retained isolated research. No full suite, production build, live account request or snapshot refresh.

## Historical schema-v3 work (superseded)

## Current contract - SCRUM-40 pipeline pivot, Chunk 1

James approved replacing the production-activation ledger with pipeline/build attempts. One schema-v3 row is one real attempt, including pre-deployment failures. The consumer still uses the provider-neutral same-origin loader, validation before presentation, separate freshness metadata, cancellable `toSignal` subscription and controlled client pagination. Smart Grid is unchanged. The contract migration is approved; the mocked acquisition foundation is described below. No route/carousel placement or live acquisition is enabled.

`BuildDeploymentHistoryRow` contains required `id`, `revision`, `createdAt`, `environment` and `status`, plus optional `summary` and `stage`. ID is stable attempt identity; different attempts may share a revision. Revision is preserved exactly, never inferred from a branch head. `createdAt` is the attempt record's creation time, not commit/build/start/completion/status-recording time. Environment is the intended `production` or `preview` target, not proof of deployment. Status is `queued`, `in-progress`, `succeeded`, `failed`, `cancelled` or `skipped`. Optional stage is `initializing`, `cloning`, `installing`, `building`, `deploying` or `deployed`; absent stage remains unknown.

`normalizeDeploymentHistory(unknown)` requires an array of allowlisted object records. Required strings must be nonempty without surrounding whitespace; supplied optional summary must also be nonempty. `createdAt` must already be canonical UTC ISO with milliseconds (`Date.toISOString()` form). Invalid dates, unknown status/stage, missing required fields, duplicate IDs and extra/private fields reject the whole batch without partial rows. There are no defaults for missing source facts. Repeated revisions with different IDs are valid. Output is an explicit sanitized projection; validation issues contain field/index/category only.

Caption: **Build & Deployment History**. Columns: Change (summary, or neutral `Pipeline attempt` label), Attempt created (UTC), Target, Result and Revision. Result explicitly combines status with the supplied stage, or `Stage unavailable`. `Succeeded` alone displays `Succeeded` with `Stage unavailable`, never `Deployed`; `Succeeded · Deployed` requires explicit `stage: 'deployed'`. Failed attempts with no stage display `Failed · Stage unavailable`. There is no manual stage annotation or log parsing. James's observation of the `b4384a5` Installing failure may inform a separate case study, but is not automated API evidence.

The envelope is `{ schemaVersion: 3, checkedAt, generatedAt, refreshStatus: 'ok', rows }`. Freshness dates remain canonical UTC, separate from attempt dates; `checkedAt <= generatedAt`. The reader rejects schema v2, malformed envelopes, extra fields and invalid rows. Loading/errors supply no rows; valid empty history remains a normal empty state; load/validation failures use fixed public-safe messages.

### Snapshot transition and preservation

The existing `public/data/deployment-history.json` is deliberately unchanged: schema v2, original GitHub verification dates, no rows. It is historical GitHub verification, **not** a verified-empty Cloudflare build history or a v3 bootstrap. The v3 loader rejects it safely until genuine v3 acquisition is approved. No synthetic public snapshot or fallback was added. Synthetic fixtures remain isolated from production runtime.

The generator now requires an explicitly injected provider-neutral acquisition function. Its CLI fails closed with acquisition unconfigured; it cannot silently reuse GitHub deployments, manufacture v3 rows, make network calls or refresh the public snapshot. Mocked acquisition proves v3 serialization and whole-batch validation. Atomic sibling-temp replacement, failure preservation (including old v2 bytes/timestamps), exact orphan-temp cleanup and successful verified-empty replacement remain intact. Only a valid v3 file qualifies as last-known-good _for the v3 reader_. Schema migration never reinterprets v2 timestamps.

### Retained research / next scope

The old GitHub adapter remains isolated against `adapters/legacy-v2` contracts, and its original acquisition foundation is retained in `scripts/deployment-history/github-snapshot-research.mjs`. Cloudflare activation research/verifier/diagnostic code is retained unchanged; it is no longer a product prerequisite. These modules are not Angular presentation or the active generator's acquisition path. No old timestamp fields remain in active v3 rows.

The mocked Cloudflare build-history foundation is implemented below and awaits review. Unknown stage stays absent; no live calls, logs, manual annotations or snapshot refresh without approval.

## Focused verification - pipeline pivot, Chunk 1

- Angular: `npm.cmd test -- --watch=false --include=src/app/components/deployment-history/*.spec.ts --include=src/app/components/deployment-history/adapters/github-deployments.spec.ts` passed 88 tests in five files.
- Node: `node --test scripts/deployment-history/*.test.mjs` passed 101 tests, including 11 v3 storage tests and 90 retained forensic tests. All acquisition is mocked.
- Prettier and whitespace checks passed; no full Angular suite, production build, live API access or public asset generation.

## Mocked Cloudflare acquisition - pipeline pivot, Chunk 2

The Node-only `scripts/deployment-history/cloudflare-build-history.mjs` supplies independent production-scope discovery, a pure provider adapter and `createCloudflareBuildAcquisition({ accountId, getToken, fetcher, timeoutMs })`. Its returned acquisition function can be explicitly injected into `createSnapshot({ acquire })`. Tests compose the full path with mock HTTP; the generator CLI remains unconfigured. No public asset is refreshed. Angular, Smart Grid, schema v3, freshness and storage behavior are unchanged; legacy v2 and activation research remain isolated.

The hardened reader adds only `GET /accounts/{account_id}/builds/workers/{worker_tag}/builds?page=N&per_page=100`. It retains pinned origin, external credentials, GET-only requests, timeout, redirect refusal and value-free errors. Worker and trigger discovery reuse its existing resources/projections. Exactly one Worker named `djamespoer-com` and exactly one active trigger must match the independently discovered Worker tag, GitHub repository `mentalnote74/djamespoer.com`, exact `main` branch inclusion without exclusions, `/` root and `npm run build` command. Trigger UUID and deployment command come from discovery, never from the candidate build. This chunk acquires production-intended attempts only; preview acquisition is deferred.

### Mapping and evidence policy

| Cloudflare fact                                                                                           | V3 output                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `build_uuid`                                                                                              | Exact stable `id`, validated UUID; never a revision-derived identity.                                                  |
| `build_trigger_metadata.commit_hash`                                                                      | Exact 40-character lowercase hexadecimal `revision`; no fallback lookup.                                               |
| `build_trigger_metadata.commit_message`                                                                   | Optional `summary`, trimming surrounding whitespace; absent/blank stays omitted, non-string rejects.                   |
| Record `created_on`                                                                                       | `createdAt`; validated UTC ISO seconds/1-3 fractional digits, normalized to milliseconds without changing the instant. |
| Independently discovered production trigger plus matching record Worker/trigger/repository/branch/context | Intended `environment: 'production'`; not deployment proof.                                                            |
| `status` plus `build_outcome`                                                                             | Explicit table below; contradictory or unsupported combinations reject.                                                |
| Successful pipeline and approved commands                                                                 | Only optional `stage: 'deployed'`; otherwise stage omitted.                                                            |

| Source status               | Source outcome | Neutral status |
| --------------------------- | -------------- | -------------- |
| `queued`                    | absent/null    | `queued`       |
| `initializing` or `running` | absent/null    | `in-progress`  |
| `stopped`                   | `success`      | `succeeded`    |
| `stopped`                   | `fail`         | `failed`       |
| `stopped`                   | `cancelled`    | `cancelled`    |
| `stopped`                   | `skipped`      | `skipped`      |

`terminated` is documented but unmapped: it does not establish our failed/cancelled meaning. Nonterminal status with a terminal outcome, missing terminal outcome and unknown values fail closed. Initializing/running and generic failure never infer a furthest stage. No timestamps other than record creation are mapped.

**Deployed rule:** the record must be `stopped` with `build_outcome: 'success'`, belong to the independently discovered production scope, and both that trusted trigger's `deploy_command` and the attempt's own `build_trigger_metadata.deploy_command` must exactly equal `npx wrangler deploy`. This represents successful completion of the configured deployment pipeline, not the superseded forensic activation proof. Upload-only/non-deploy, mismatched or unavailable recorded commands still yield `succeeded` with stage absent. Current configuration alone cannot relabel an older upload attempt. Installing/build failures are pipeline failures with no stage unless a future approved automated source directly provides it; no manual annotation or logs.

### Completeness, sanitization and failure

Pagination is deterministic: 100 records per page, at most 100 pages/10,000 records; paths are constructed internally. Require the documented integer `page`, `per_page`, `count`, `total_count` and `total_pages` metadata and complete page counts. Empty results permit zero or one total page only with zero records/count. Totals must remain consistent across all pages. Missing/unknown/contradictory metadata, an interrupted read, duplicate attempt IDs or a wrong-scope record rejects the whole acquisition; no first/newest selection, silent filtering or partial publication. A Worker history containing preview/retired-trigger records currently fails closed rather than inventing their target; verify this real-account behavior before publishing.

Reader projections strip private fields, headers, provider errors and raw responses. Adapter output is an explicit neutral allowlist passed through `normalizeDeploymentHistory`; duplicate IDs reject while repeated revisions with different IDs remain valid. The unchanged snapshot generator validates again before atomic replacement. A mocked malformed acquisition proves prior valid bytes/freshness remain intact with no temp output. Public v2 history stays untouched.

### Documentation basis and next diagnostic

Sources: [Worker build-list API](https://developers.cloudflare.com/api/resources/workers_builds/subresources/builds/methods/list/), [Worker tag/trigger configuration guide](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/). The detailed API specifies `created_on` and nested source metadata; the guide's shorthand example uses `created_at`/top-level branch. We implement the detailed schema and do not silently accept alternate meanings. Its example also combines running with a success outcome; live combinations must be verified, not assumed from placeholder examples.

Next proposed chunk is a small sanitized, authenticated read-only build-history diagnostic using existing external token/account runtime inputs. Verify list envelope/creation precision, complete pagination, required full revision and repository/branch/trigger metadata on both failed and successful attempts, nonterminal outcome representation, historical scope consistency and per-attempt deploy command availability. Existing read credentials were sufficient for prior resources; the new endpoint documents CI Read access, which must be confirmed without automatically broadening permissions. Do not use the old activation diagnostic as the feature prerequisite. No snapshot writes, logs, forensic correlation or live access until approved.

Verification: `node --test scripts/deployment-history/cloudflare-build-history.test.mjs` passed 49 new mocked tests; `node --test scripts/deployment-history/*.test.mjs` passed 150 total (including unchanged storage and retained forensic tests). Prettier and whitespace checks passed. No Angular/full-suite/build or live acquisition ran in this chunk.

## Authorized build-history diagnostic - awaiting James's manual run

Mocked acquisition is approved. `scripts/deployment-history/cloudflare-build-history-diagnostic.mjs` now runs the existing read-only acquisition and reports only endpoint labels/HTTP codes, counts, field-validity totals, allowlisted status/outcome vocabulary and fixed rejection categories. It does not emit IDs, revisions, commit messages, command/configuration values, account/token inputs, raw bodies or response headers. Unknown vocabulary is represented as `unsupported`, not echoed. It never imports snapshot-writing functions, writes files, retries builds or uses deployment/version correlation.

A bounded response observer gathers diagnostic facts in memory even if the hardened reader rejects a provider shape. Trusted discovery is replayed through the same reader over the two already-read envelopes, with no extra live calls. Diagnostic counts cannot change acquisition acceptance. `recordsObserved` may be partial; `historyComplete` and `wholeBatchWouldReject` distinguish complete enumeration from accepted data. Deleted-trigger evidence and mismatched branch/trigger counters identify possible mixed historical scope without inventing a preview/retired classification or changing the approved rejection policy.

Run once from James's existing credential-bearing PowerShell window:

```powershell
node "C:\Users\djame\OneDrive\Desktop\djamespoer.com\scripts\deployment-history\cloudflare-build-history-diagnostic.mjs"
```

Only `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are required; application/repository/branch constants remain established in acquisition. Do not paste or print their values. Exit code 1 means verification did not establish accepted history; the sanitized report explains observed categories. No production snapshot is generated, including when history validates successfully.

Verification: 11 diagnostic tests and 161 total focused Node tests passed, including privacy sentinels, mixed scope, malformed fields/vocabulary/pagination, repeated revisions/duplicate IDs, partial reads and permission failures. Prettier and whitespace checks passed. Codex made no live requests; real findings remain pending James's single approved manual diagnostic.

## Historical architecture research (superseded by the pipeline pivot)

The sections below preserve prior research and decisions in their original deployment-ledger context. Their v2 fields, GitHub source and activation-proof requirement are not the current v3 production contract.

## GitHub source-shape adapter

The first adapter selects [GitHub deployments](https://docs.github.com/en/rest/deployments/deployments) plus each deployment's complete [status history](https://docs.github.com/en/rest/deployments/statuses). These resources describe deployment targets/outcomes directly. [Workflow runs](https://docs.github.com/en/rest/actions/workflow-runs) have useful revision/title/start fields, but workflow completion does not establish that a deployment succeeded and the run shape does not establish a deployment environment. No commit lookup is added: deployment description is the supplied summary; an absent description is rejected rather than replaced with invented change text.

Repository inspection found Cloudflare static-asset configuration in `wrangler.jsonc` and no `.github` workflow directory. This does not establish that real GitHub deployment records/statuses exist. The adapter is pure and fixture-tested; acquisition is implemented separately by the out-of-browser generator. Live instrumentation remains deferred.

`adapters/github-deployments.ts` accepts a minimal typed deployment projection joined with its complete status history. It builds only `DeploymentHistoryInput` fields and passes the mapped collection through `normalizeDeploymentHistory`:

| GitHub fact                                                                                                 | Neutral field      | Decision                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Deployment `node_id`                                                                                        | `id`               | Preserve opaque stable identity, independent of revision or status updates.           |
| Deployment `description`                                                                                    | `summary`          | Required public description; no commit-message or status-message fallback.            |
| Latest status `created_at`                                                                                  | `statusRecordedAt` | Status-recording time only; never inferred actual start/completion.                   |
| Deployment `sha`                                                                                            | `revision`         | Preserve the full supplied revision.                                                  |
| Latest explicit status `environment`, inherited through later omissions; otherwise deployment `environment` | `environment`      | Accept only exact `production`/`preview`; no branch or non-production heuristics.     |
| Chronologically latest status `state`                                                                       | `status`           | `success` → `succeeded`; `failure`/`error` → `failed`; `in_progress` → `in-progress`. |

Status timestamps must be valid UTC timestamps in GitHub's seconds format. Status history is inspected chronologically without mutating it. Conflicting updates in the same second are rejected because this minimal projection cannot order them reliably. A complete history is the supplier's responsibility; the adapter cannot prove completeness without acquisition metadata.

Unsupported current states (`pending`, `queued`, `inactive`, unknown), unsupported environments, and malformed records reject the entire batch using the unchanged neutral result shape. Queued/pending is not claimed as execution in progress; inactive is not claimed as failure. The existing neutral model has no queued/inactive categories, so those meanings require future product decisions. Terminal-only statuses are accepted. Status creation establishes recording time only; this projection supplies no authoritative lifecycle dates, so both optional fields are omitted. Description quality/public suitability remains the supplier's responsibility.

The adapter is not imported by the consumer. GitHub field names and mappings stay within the adapter; normalized rows keep only approved neutral fields. Test fixtures are not James's real deployment history and are never displayed by the application.

## Live-data architecture decision — proposed, Chunk 4

### Observed public records

Anonymous read-only checks on October 5, 2026 (America/New_York) returned HTTP 200: repository metadata confirms `mentalnote74/djamespoer.com` is public with default branch `main`; [deployments](https://api.github.com/repos/mentalnote74/djamespoer.com/deployments?per_page=100) returned `[]` without a next-page link; [workflow runs](https://api.github.com/repos/mentalnote74/djamespoer.com/actions/runs?per_page=100) returned `total_count: 0` and no runs. [Commit metadata](https://api.github.com/repos/mentalnote74/djamespoer.com/commits?per_page=3) is available. These observations establish no currently available GitHub deployment history, not that the site has never been deployed. No deployment/status/job IDs were available to inspect those child resources. The local Cloudflare asset configuration does not establish deployment instrumentation.

| Required fact           | Resource evidence and limits                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable attempt identity | Deployment `node_id` identifies a deployment lifecycle, not each infrastructure retry. Workflow run `id` plus `run_attempt` identifies a workflow attempt; jobs have their own IDs. No such records currently observed.                                                                                                                                    |
| Summary                 | Deployment `description` is optional/nullable and may describe a request rather than a change. Workflow `display_title`/head-commit message or a commit lookup by deployment SHA can supply source change text, but not deployment evidence. The current adapter rejects absent descriptions; adding a commit fallback needs a separately approved policy. |
| Start                   | Deployment `created_at` is request creation, not execution start. First `in_progress` status timestamp is reported start evidence only if recorded. Workflow `run_started_at`/job `started_at` are execution timestamps, but combining them with a deployment requires an explicit correlation; shared SHA alone is insufficient.                          |
| Revision                | Deployment `sha`, workflow `head_sha`, or commit `sha` directly identifies source. Available commits are not proof that a revision was deployed.                                                                                                                                                                                                           |
| Environment             | Deployment/status `environment` supplies a target label; production/transient flags add context but do not prove a preview classification. Workflow/job response shapes alone do not supply the required target classification. Exact production/preview labels are required by the current adapter.                                                       |
| Outcome                 | Latest deployment status reports deployment outcome. Workflow/job status/conclusion reports workflow/job outcome, not necessarily release outcome. Commit metadata has no deployment outcome. Current queued/pending/inactive meanings remain unsupported by the row contract.                                                                             |

Source choice remains deployments plus complete status histories when real records exist. Runs/jobs/commits must not be converted into deployments by assumption. Useful populated history requires actual deployment recording with public summaries, target labels, and lifecycle transitions; introducing that recording is a separate authorization, not read-only acquisition.

### Acquisition options

| Option                                       | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser → GitHub                             | GitHub supports CORS, so this is technically possible anonymously. It exposes provider payloads to the browser, couples visitors to rate limits/outages and status fan-out, and cannot safely hold a privileged token. Reject for this frontend boundary.                                                                                                                                                                                                                             |
| Build-time refresh                           | Keeps sanitization/secrets outside Angular and fits static hosting, but refreshes only on builds and couples acquisition failures to releases unless optional with a persisted fallback. The build cannot know its own eventual deployment result. Suitable refresh opportunity, not the only refresh policy.                                                                                                                                                                         |
| Server/serverless/edge                       | Centralizes sanitized responses, cache, credentials, and frequent refreshes. Requires runtime code, scheduling, durable last-good storage, and operational handling beyond the current assets-only configuration. Revisit if minute-level freshness becomes necessary; an edge cache alone is not durable fallback storage.                                                                                                                                                           |
| Periodically generated sanitized static JSON | Recommended initial architecture: an out-of-browser generator validates a complete snapshot and atomically publishes only sanitized rows plus neutral freshness metadata as a site asset. Same-origin CDN delivery, no provider calls per visitor, and existing client pagination keep hosting/interaction simple. Requires a scheduled/deployment-triggered publishing mechanism later; prefer deployed artifacts over routine Git commits to avoid history churn and rebuild loops. |

Proposed flow: acquisition process → GitHub adapter → existing normalizer → validated static snapshot → same-origin frontend loader → existing consumer. Keep the adapter/provider acquisition outside the Angular import graph. Persist last-good snapshots as durable generator artifacts, not only disposable build directories. Acquisition failure must not block an unrelated site release when a valid fallback exists.

### Freshness, pagination, failure, and security policy

- Portfolio history is retrospective evidence, not a live operations dashboard. Target refresh after completed deployments and at least daily; mark a snapshot stale after 24 hours without successful verification. Daily refresh may leave in-progress results outdated, so show the as-of time and prioritize post-completion refresh. A build-generated snapshot omits its own eventual result until a later refresh.
- Propose an envelope containing `rows`, `checkedAt`, `lastAttemptAt`, and `refreshStatus` (`ok`/`failed`) around the unchanged row model. These are acquisition facts, not deployment facts. Advance `checkedAt` only after a complete successful verification; failure must not relabel old rows as fresh. This envelope and UI messaging are future work, not implemented here.
- Suggest same-origin snapshot revalidation with a five-minute browser/CDN cache. Provider ETag/Last-Modified caches remain acquisition-only. GitHub documents authenticated conditional 304 responses as exempt from primary limits; do not assume anonymous 304 requests are exempt. Configure actual asset cache headers in a future hosting task.
- Follow every provider `Link` `rel="next"` for deployments and each status history, using `per_page=100` where supported. Workflow attempts/jobs require their own pagination if later selected. Never claim a complete collection from the first page alone. Keep provider paging separate from Smart Grid client paging. Use sequential/bounded requests, deduplicate stable identities, and abort refresh on failed pages, loops, budget exhaustion, or invalid/unsupported records; never publish a truncated success. Treat provider data as a time-bounded observation, not an atomic database snapshot.
- Preserve last-good rows and their original verification time on outage, rate limit, or validation failure; record neutral refresh failure separately. Display an as-of time and a stale/update-unavailable message outside the table without suppressing usable history. Do not pass refresh failure into Smart Grid's `error` when last-good rows are being shown, since that contract intentionally hides rows. Without a valid snapshot, show the existing error state; a fully verified zero-record response is valid empty history, not an outage. Proposed messaging must preserve focus and use restrained accessible status announcements; no presentation changes in this pass.
- Public repository metadata, deployments/statuses, Actions runs/jobs, and commits can be read anonymously. The observed requests required no credentials. GitHub's anonymous primary limit is 60 requests/hour per originating IP; most authenticated user requests allow 5,000/hour, while workflow `GITHUB_TOKEN` has a separate repository limit. Start anonymously for the small scheduled workload, with rate-header/Retry-After handling and backoff. Authentication is not necessary for public access but may become necessary for request volume.
- If required later, use a least-privilege repository-scoped read credential in CI secrets or a server/edge secret store. Never place tokens, authorization headers, raw provider payloads, logs, private diagnostics, or provider pagination URLs in Angular source/environment files, bundles/source maps, `public`, snapshot metadata, or Git. Publish only allowlisted public fields; public descriptions still require suitability review. No credential was created or requested.

### Proposed Chunk 5 scope

Subject to approval, implement a standalone read-only snapshot generator outside Angular, anonymous GitHub acquisition with complete pagination/rate-aware retries and cache handling, adapter/normalizer reuse, atomic sanitized output and durable last-good fallback, and fixture-based generator tests. Validate the proposed neutral metadata envelope. Exercise real empty history honestly; do not manufacture records. Do not add scheduling, credentials, deployment recording, UI integration, stale-state presentation, or provider fallback without separate authorization. A useful populated launch remains dependent on resolving the absent records and unsupported lifecycle/summary policy.

Official references: [deployments](https://docs.github.com/en/rest/deployments/deployments), [statuses](https://docs.github.com/en/rest/deployments/statuses), [runs](https://docs.github.com/en/rest/actions/workflow-runs), [jobs/attempts](https://docs.github.com/en/rest/actions/workflow-jobs), [commits](https://docs.github.com/en/rest/commits/commits), [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api), [conditional requests/backoff](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api), and [CORS](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests).

## Snapshot generator foundation — Chunk 5

Run manually from the repository root with Node 24 and installed development dependencies:

```sh
node scripts/generate-deployment-history.mjs
node --test scripts/deployment-history/snapshot.test.mjs
```

The standalone CLI writes `public/data/deployment-history.json`, which Angular's existing public-assets configuration will copy for same-origin delivery at `/data/deployment-history.json`. It is not wired into npm build hooks, scheduling, or frontend loading. Run generation separately before any build that should contain the refreshed asset.

`scripts/deployment-history/snapshot.mjs` requests only anonymous GitHub deployments and their status histories. It follows next-page links sequentially, rejects loops/unexpected hosts or resource paths, refuses redirects, and fails rather than truncating after a 100-page safety limit per collection. Canonical GitHub pagination URLs are scoped to this repository's observed ID (`1402431564`). Requests have a 15-second timeout. There is no commit, workflow, token, retry, or conditional-request fallback.

The generator uses the existing GitHub adapter and its existing normalization boundary. A narrowly scoped Node module loader uses the already installed TypeScript compiler to load those unchanged TypeScript modules; it adds no dependency or Angular runtime. Raw responses stay in process memory and are never written to public files. Only allowlisted normalized rows enter the snapshot.

The version-1 envelope contains exactly `schemaVersion: 1`, `checkedAt`, `generatedAt`, `refreshStatus: 'ok'`, and `rows`. Both timestamps are the same UTC ISO time captured after complete acquisition/validation in this minimal pass. They describe verification/generation, not a deployment. Rows retain exactly `id`, `summary`, `startedAt`, `revision`, `environment`, and `status`. Successful zero records produce `rows: []`; this is verified empty history, never a substitute commit history. There are no provider labels, URLs, raw status fields, logs, or acquisition diagnostics in the envelope.

Generation validates everything before writing. It creates a uniquely named sanitized temporary file with exclusive creation in the destination directory, writes the complete JSON, and renames it over the destination. Same-directory rename provides atomic replacement; failed acquisition, validation, or replacement preserves the previous destination. Chunk 6 adds orphan recovery and serialized-envelope validation as described below. Atomic visibility is not a claim of a durable backup policy.

Nine isolated Node tests use fictional provider fixtures/mocked requests and temporary directories, including real filesystem replacement. A manual anonymous live run after tests passed generated a verified-empty snapshot from the current public repository. No real deployment rows were invented. Tests never require GitHub availability.

Chunk 5 was approved; Chunk 6 hardens storage preservation/recovery without public failure metadata. Address unsupported/missing deployment evidence before populated publication. Retries/backoff, conditional caching, scheduling, triggers, credentials, frontend loading/stale UI, and route/carousel integration remain separate decisions.

## Last-known-good preservation and recovery — Chunk 6

Before staging output, validate the actual serialized JSON: exact version-1 envelope keys, canonical UTC timestamps in chronological order, `refreshStatus: 'ok'`, and exactly six allowlisted, already-normalized fields per row. Row validation reuses the existing neutral normalizer. Invalid envelopes, extra fields, or serialization changes cannot replace verified data.

Acquisition/provider/mapping/normalization/envelope failures leave the destination byte-for-byte unchanged, including both timestamps. Failed writes/replacements clean their temporary file; rename is the commit point, with no fallible cleanup step after successful replacement. Successful populated and successful verified-empty refreshes both replace the prior file. Failure errors carry generator-only `lastKnownGoodAvailable`, determined by validating the existing file; the CLI distinguishes preserved verified history from missing/invalid history. Invalid existing files are not treated as verified, and are not deleted on failed refresh. No failure metadata is written to the public snapshot.

At the start of each generation, delete only regular sibling files matching `.<destination filename>-<UUID>.tmp`. For the real `deployment-history.json` asset, also recognize the legacy `.deployment-history-<UUID>.tmp` names from Chunk 5. Never promote an orphan, even if it looks complete: only a newly completed refresh may replace the verified destination. Leave unrelated files, directories, and symlinks untouched. Recovery also runs before an acquisition that subsequently fails. Cleanup errors abort generation rather than risk replacing the prior snapshot.

This assumes one generator process at a time; do not overlap generation or asset packaging. No locking is introduced. A crash before rename leaves the destination intact and an orphan for the next run; a crash after rename leaves the newly validated snapshot. Filesystem failures may prevent cleanup until repaired. No fsync/power-loss guarantees, disk-corruption recovery, backup archive, or multi-process coordination are claimed.

Focused verification: 16 mocked-acquisition/filesystem tests pass, covering preservation, envelope rejection, timestamp stability, verified-empty replacement, orphan recovery (including legacy naming), atomic replacement failures, and missing/invalid last-good distinction. No live refresh was run for Chunk 6; the public snapshot was not regenerated. Proposed Chunk 7, subject to approval: a provider-neutral same-origin snapshot loader with schema validation and focused loading/error/empty/populated tests, without stale UI or route/carousel integration.

## Angular snapshot loading — Chunk 7

Chunk 6 is approved. `DeploymentHistoryLoader` uses the existing Angular `HttpClient` and RxJS to expose a cold `load()` observable. A subscription emits loading, requests only `/data/deployment-history.json`, and then completes with ready/error state; unsubscribing cancels an unfinished request. `provideHttpClient()` is registered in the app configuration. At completion of Chunk 7, nothing subscribed from an application route/component; registration alone does not cause acquisition. No dependency, polling, cache, or state-management library is added.

The loader reads response text, parses it into `unknown`, and applies `validateDeploymentSnapshot`. Invalid JSON (including an HTML SPA fallback) produces an invalid-snapshot error; HTTP/network failures produce a load error. No raw response/error details are exposed to the consumer.

The shared pure validator lives in `deployment-history-snapshot.ts` and is now reused by both browser loading and generator serialization. It requires exactly the five approved envelope fields, version 1, canonical UTC ISO timestamps (including milliseconds), checked time no later than generated time, and refresh status `ok`. Rows pass through the existing neutral normalizer and must already contain exactly the six normalized allowlisted fields. Malformed rows, duplicates, unsupported meanings/versions, extra fields, or non-normalized records reject the entire snapshot. No provider fields or mappings are needed in this module or the loader.

Exposed state is `{ status: 'loading' }`, `{ status: 'error', reason: 'load' | 'invalid-snapshot' }`, or `{ status: 'ready', records, freshness: { checkedAt, generatedAt, refreshStatus: 'ok' } }`. Ready records are typed neutral deployment rows; zero records is a valid verified-empty ready state. Freshness stays outside row objects and is retained unchanged, without stale-state decisions or UI. Chunk 8 connects this state directly to the consumer as described below.

Focused verification: 45 Angular tests across loader/neutral-boundary/consumer specs passed (20 loader cases), and all 16 generator/storage tests still pass after sharing the validator. Tests use mocked HTTP only; no server, live acquisition, production build, or browser audit ran. Angular HTTP support uses the installed `@angular/common` package. Proposed Chunk 8, subject to approval: a minimal loader-to-consumer composition with focused state propagation/cancellation tests, keeping placement on a route/carousel and stale/failure messaging separate unless explicitly authorized.

## Consumer snapshot composition — Chunk 8

Chunk 7 is approved. `DeploymentHistory` injects the existing loader and calls `toSignal(loader.load(), { initialValue: { status: 'loading' } })` once per component instance. Angular's injection-context destruction automatically unsubscribes and cancels an outstanding HTTP request. The former externally supplied `source` input is replaced by the loader-backed signal; no wrapper service or additional state store is introduced.

Computed consumer state passes ready records directly to Smart Grid (validation already occurred in the loader), loading with no rows, verified-empty ready with the existing empty message, load failure with “Deployment history could not be loaded.”, and invalid-snapshot failure with “Deployment history could not be verified.” No rejected payloads/diagnostics or samples are substituted. Freshness is a separate computed value when ready and `null` otherwise; it is not rendered or added to row objects. Existing columns, UTC presentation, identity, and controlled client pagination are preserved.

Production runtime subscribes only to the same-origin loader. Illustrative fixtures remain confined to tests or explicit loader substitutions; neither loading, empty history, nor errors trigger a sample fallback. Nothing imports this component into a route/carousel yet, so application navigation does not start this request until future placement is authorized.

Focused verification: 35 tests across consumer/composition/loader specs passed, including eight composition tests using mocked HTTP. Initial loading, populated/empty rendering, both safe failure messages, separate freshness, cancellation on destruction, and controlled pagination after arrival are covered without repeating envelope-validation cases. No live server/API calls, full suite, build, or browser audit ran. James approved Chunk 8 and directed Chunk 9 to genuine production deployment instrumentation; UI placement remains deferred.

## Production deployment instrumentation — Chunk 9 compatibility review

James verified the actual Cloudflare configuration: application `djamespoer-com`, repository `mentalnote74/djamespoer.com`, production branch `main`, root `/`, build command `npm run build`, deploy command `npx wrangler deploy`. The connected repository automatically triggers Cloudflare's Initializing → Cloning → Installing → Building → Deploying pipeline. GitHub Actions does not currently own deployment. A successful production deployment requires Cloudflare to complete the actual deploy for that exact revision; neither a push nor Angular build completion establishes success.

James observed commit `b4384a5` fail during Installing, before Building or Deploying; Cloudflare retained the preceding successful version, “Complete proof routes and accessible carousel shell.” The underlying installer cause remains unknown. Anonymous inspection of its public GitHub check confirmed check ID `112089789952`, name `Workers Builds: djamespoer-com`, app `cloudflare-workers-and-pages`, full revision `b4384a51d34fbc1a443e3ce727582f40478340e2`, and completed/failure conclusion. The external build UUID is `c030dba1-047c-47c5-b7b6-e9e263c6a246`. Both check timestamps are `2026-10-06T03:13:58Z`; the summary contains build/project links but no pipeline-stage evidence. These facts identify a failed pipeline, not a failed deployment attempt or usable deployment-start time. No raw response was written to a public asset.

**Blocking compatibility issue:** a completion-only bridge creating genuine terminal GitHub deployment statuses would fail our adapter's required first `in_progress` status, from which `startedAt` is obtained. The check's pipeline start cannot supply Deploying-stage evidence, and adding a retrospective `in_progress` after completion would manufacture timing. GitHub's create-status API does not accept a caller-supplied `created_at`. An Installing failure must not be recorded as a deployment that began. The existing adapter test already rejects success-only histories. No adapter, normalized model, presentation, loader, or Smart Grid changes were made.

Cloudflare documents per-Worker GitHub checks and build-level started/failed/canceled/succeeded event subscriptions; neither reviewed resource documents a Deploying-stage start signal. GitHub Actions supports `check_run` created/completed events, but its `GITHUB_SHA` is the default-branch revision, not necessarily the checked revision. Any eventual bridge must validate the emitting app, application, production target, exact checked/deployed SHA, and unique attempt identity, and distinguish pre-deploy pipeline failures from actual deployment failures. A generic successful check alone is insufficient proof of production activation.

Stop for architectural review before implementing: select an authenticated deploy-stage hook/bridge or explicitly authorize deployment orchestration that directly observes Wrangler invocation and result. This pass does not migrate the pipeline, add a Cloudflare event consumer, create/request credentials, or introduce a personal token. For an eventual Actions implementation, deployment/status writes require `deployments: write`; reading authenticated checks would require `checks: read`, and source checkout/commit metadata would require `contents: read` only if used. Grant no unrelated write permissions. A workflow's GitHub token is not automatically available inside Cloudflare's separate build process.

Focused verification: 20 existing adapter tests passed, including missing-start rejection. Documentation formatting/whitespace checks passed; no deployment or production build ran and no fake deployment records were created. End-to-end revision/lifecycle verification remains for the next real deployment after this blocker is resolved. Snapshot-refresh automation and Chunk 10 remain deferred.

Official references: [Cloudflare GitHub checks](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/), [Cloudflare build events](https://developers.cloudflare.com/workers/ci-cd/builds/event-subscriptions/), [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run), [deployment creation](https://docs.github.com/en/rest/deployments/deployments#create-a-deployment), [deployment statuses](https://docs.github.com/en/rest/deployments/statuses#create-a-deployment-status), and [workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions).

## Timestamp-contract migration: Chunk 9B

James approved Chunk 9A. Current rows use required statusRecordedAt and optional evidenced startedAt/completedAt. Current generator/shared reader use schemaVersion 2 exclusively, rejecting v1 without reinterpretation. Strict snapshot allowlists account for present/absent optional dates; extra and non-normalized values reject the whole snapshot. Earlier chunk sections describing v1/start-required behavior are historical and superseded by this section.

Lifecycle (UTC) explicitly labels the displayed date: Completed when completion exists, otherwise Started when start exists, otherwise Result recorded. Other columns, UTC formatting, identity, pagination, loading/errors and subscription cancellation remain unchanged. Smart Grid, Angular transport, Cloudflare configuration and route/carousel placement are unchanged.

The GitHub adapter accepts terminal-only records, maps latest status created_at to recording time and omits lifecycle dates because its current projection cannot establish them. Equal-second conflicting statuses/environments still reject rather than invent ordering. Genuine deployment eligibility remains an acquisition/instrumentation responsibility: Installing failures are pipeline evidence, never deployment rows. No checks or commits are converted into deployments. Future lifecycle evidence requires separately approved adapter evidence input/join; arbitrary payload dates are not trusted.

The verified-empty public asset changed only schemaVersion from 1 to 2. checkedAt and generatedAt both remain 2026-10-06T03:31:58.617Z, refreshStatus remains ok, and rows remain empty. No new GitHub verification occurred. The current timestamp migration removes the mandatory-start blocker; it does not itself prove production activation.

Focused verification: 88 Angular tests in five deployment-history files and 17 generator/storage Node tests passed. These cover completion-only data, optional starts, recording-time separation, validation, v1 rejection, exact empty asset facts, existing pagination/loading/errors/cancellation and storage preservation. Prettier/diff checks passed. No full suite, production build, live acquisition, browser audit, instrumentation or automation ran.

James approved Chunk 9B. Chunk 9C evaluates the bridge below. Next scope: design the smallest completion-evidence bridge preserving Cloudflare Git-connected deployment ownership, exact revision/attempt identity, exclusion of pre-deploy failures, honest timestamp semantics and secure minimal GitHub write authority. Do not fabricate an in-progress status or treat check completion/status recording as activation time.

## Completion-evidence bridge design: Chunk 9C

Design only; no workflow, Worker, webhook, credential, deployment record or instrumentation was created. Recommendation: a GitHub Actions observer triggered by Cloudflare check completion, followed by authenticated read-only Cloudflare verification. Cloudflare continues to build/deploy from main; Actions never builds or deploys the site. This is a proposed design, not account-verified integration.

### Options and evidence

| Option                                   | Trigger and authoritative evidence                                                                                                                                                                                | Credentials, execution and complexity                                                                                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare build event subscription      | Build started/failed/canceled/succeeded messages carry build UUID and source commit; still join production deployment/version records before accepting success. Failure event alone lacks deployment-stage proof. | Queue plus consumer Worker or HTTP consumer; Cloudflare read access and GitHub App installation credential to write records, subscription setup and delivery deduplication. Adds hosted infrastructure and possible usage cost; not the initial choice. |
| GitHub check completion + Cloudflare API | Existing check provides a wake-up signal, external build UUID and head SHA. Deployment records and version-to-build lookup establish activation and exact revision.                                               | Actions runner, one Cloudflare read secret, short-lived GITHUB_TOKEN. No new hosted service; lowest operational burden, conditional on documented check-run trigger restrictions. Recommended.                                                          |
| Manual Cloudflare API reconciliation     | Explicit dispatch using a check/build identity; the same verification chain, independent of webhook delivery.                                                                                                     | Same runner/permissions; useful recovery path. No automatic freshness guarantee and no scheduling proposed.                                                                                                                                             |
| Periodic Cloudflare API polling          | Enumerate deployments and resolve versions to builds; independent of check delivery.                                                                                                                              | Same credentials plus schedule, pagination, durable progress/reconciliation. More operations; defer.                                                                                                                                                    |
| Deploy-command wrapper                   | Directly observe actual Wrangler invocation/result, then correlate the resulting Cloudflare deployment.                                                                                                           | Changes dashboard deploy command and needs secure GitHub write authority inside Cloudflare; can affect deployment reliability. Preserve current command; not recommended.                                                                               |

A generic external webhook requires a hosted authenticated receiver and GitHub write identity. Cloudflare deploy hooks initiate builds; their successful HTTP response is not completion evidence. Neither is a substitute for the API join.

### Exact verification sequence

1. Proposed trigger: check_run completed for repository mentalnote74/djamespoer.com, Cloudflare app cloudflare-workers-and-pages and exact check name Workers Builds: djamespoer-com. Re-fetch the check using its numeric ID; validate app ID/slug and external build UUID. Use check.head_sha, never workflow GITHUB_SHA, branch tip or a timestamp match. A manual dispatch takes a check ID and reuses this path; inputs are untrusted.
2. Read GET /accounts/{account}/builds/builds/{build_uuid}. Require terminal success for initial publication, matching full commit hash, provider/account/repository, main branch, root, deployment command and configured production trigger UUID/Worker tag. Obtain the Worker tag through a read-only script lookup if needed. Fields in the documented schemas are optional: absent/malformed required evidence means no record. Never log the full build response: it may include environment variables and other private configuration.
3. Read deployment history for the fixed production script djamespoer-com, including pagination within the observation window. For each candidate require exactly one version at 100 percent; reject gradual/ambiguous traffic assignments for this MVP. Call GET /accounts/{account}/builds/builds?version_ids={version_uuid}. Require that version's returned build identity equals the originating build UUID and its full commit hash equals the checked revision. SHA equality alone, preview URLs, uploaded-version presence, latest-by-time guessing and version annotations are insufficient.
4. The chain is production deployment UUID -> version UUID at 100 percent -> originating build UUID -> full SHA. Re-read the candidate deployment by ID before publication. If currently active, it proves that revision is production now; if superseded, the retained deployment record proves historical production activation, not current production. Preserve that distinction. Rollbacks/repeated activations have separate deployment UUIDs and must not be collapsed by SHA. A missing/expired join is unverifiable, never inferred success.
5. Only after verification, create/reuse a GitHub Deployment for the exact SHA, environment production, production_environment true, auto_merge false and required_contexts empty. The empty contexts prevent unrelated build checks from blocking retrospective evidence recording; verification has already occurred. Require an actual suitable public summary from source metadata, or stop rather than invent change facts. Keep a small allowlisted backend correlation payload (bridge version, Worker name, deployment/version/build IDs); never copy a raw Cloudflare response. This payload is not the frontend contract.
6. Create a success status without fabricated pending/in_progress transitions; disable auto_inactive so historical outcomes remain usable. Deduplicate by Cloudflare deployment UUID, not revision/build timestamp. GitHub deployment node_id remains the neutral public row ID. Recording and later snapshot acquisition remain separate; do not invoke the snapshot generator.

### Timestamp and failure semantics

GitHub status created_at supplies statusRecordedAt under the existing adapter. Initial bridge omits startedAt and completedAt. Cloudflare deployment created_on identifies deployment-record creation; version creation is upload time; build running_on/stopped_on and check started_at/completed_at describe their own lifecycles. None is silently relabelled as actual deployment completion. Optional dates can be populated later only with separately validated lifecycle evidence and an explicit adapter input extension/join; no schema-v2 change is needed.

Initial coverage is verified successful production activations only. The documented build outcome/status fields do not distinguish Installing/Building failure from an attempted Deploying failure. No failure Deployment is created for b4384a5 or another generic failed/canceled pipeline. Failure after actual deployment starts requires positively identified attempt/stage/outcome evidence tied to build/revision; until available, retain an internal unsupported/unverifiable result, not a public failed row. API outage or bridge error is not deployment failure. A build reporting failure after an activation needs review of deployment evidence; do not label the activated revision failed from the aggregate result.

### Credentials, permissions and operations

Proposed Actions job permissions: deployments: write; checks: read for check re-fetch; contents: read only for loading the trusted bridge script from the default branch. All other permissions disabled; no checkout/execution of the event's revision and no shell interpolation of event/source text. Use workflow GITHUB_TOKEN, not a personal access token. Keep recording in a job without a GitHub environment declaration that would automatically create an unverified deployment.

A separate Cloudflare read API token would live only in the repository Actions secret store. Endpoint references accept Workers CI Read for build lookup and Workers Scripts Read for script/deployment reads; scope to the selected account, narrowing Worker access where the endpoint supports it. The Builds guide requires user-scoped tokens, so do not assume account-scoped credentials work. New granular Worker roles and the account-wide CI read scope require a setup-time permission check; do not resolve a 403 by granting write access. No Worker/Build edit, deploy, zone, KV, R2 or account-management permission is needed. Account ID, Worker name/tag and production trigger UUID are configuration, not browser data. No credential was created or requested.

Actions uses the existing GitHub platform, without another hosted service; actual runner quotas remain account-dependent. Event subscriptions add Queue/Worker operations and a separate GitHub App key/installation identity, so they are the fallback only if check delivery cannot meet requirements. GitHub documents check_run suppression when the suite is created by Actions or its head SHA is associated with Actions; workflow must exist on the default branch. Do not promise automatic completeness: provide manual re-verification and reassess if ordinary CI is later introduced.

Duplicate/out-of-order events must not duplicate deployment records or erase historical successes. Serialize writes for the same correlation identity, inspect existing paginated GitHub deployments/statuses, and resume after a partial create/status failure. GitHub creation has no assumed idempotency key: on an ambiguous response reconcile before reissuing; do not claim exactly-once behavior. Cloudflare list pagination/retention and eventual consistency can prevent proof; defer publication and permit manual rerun, with no background polling/retry/schedule in the initial foundation. Failures leave existing GitHub records and the last-known-good snapshot untouched. Never publish a failure as a fallback for missing evidence.

### Smallest proposed Chunk 9D

Implement only a deterministic out-of-browser verifier foundation with mocked GitHub/Cloudflare projections and read-only request orchestration. Return verified production activation, ineligible pipeline, or unverifiable evidence. Cover the full identity join, 100-percent version requirement, pre-deploy exclusion, races/supersession, missing/ambiguous records, private-field exclusion and timestamp omission. Do not add workflow/token setup or GitHub write calls yet. A nonsecret representative redacted Cloudflare successful deployment/version/build response can confirm documented optional field availability later; do not request credentials or claim authenticated account verification in this design. Review the verifier before separately authorizing the small Actions recording workflow.

Official sources: [build details and read permissions](https://developers.cloudflare.com/api/resources/workers_builds/subresources/builds/methods/get/), [version-to-build lookup](https://developers.cloudflare.com/api/resources/workers_builds/methods/get_builds_by_version/), [production deployments](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/), [documented active deployment/version/build chain and user-token restriction](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/), [versions versus deployments](https://developers.cloudflare.com/workers/versions-and-deployments/), [build events](https://developers.cloudflare.com/workers/ci-cd/builds/event-subscriptions/), [granular Worker roles](https://developers.cloudflare.com/workers/authorization/workers/), [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run), [GitHub deployment creation](https://docs.github.com/en/rest/deployments/deployments#create-a-deployment), and [status creation](https://docs.github.com/en/rest/deployments/statuses#create-a-deployment-status).

## Mocked production-activation verifier: Chunk 9D

Chunk 9C is approved. scripts/deployment-history/cloudflare-activation.mjs exports verifyCloudflareActivation. It is Node-side only, imports no Angular/neutral/snapshot code, and has no CLI, default fetch, authentication, logging, persistence or writes. Callers inject read({ method: 'GET', path }) to return untrusted Cloudflare JSON. A future external runtime reader owns credentials; this foundation contains none. All verification uses mocks.

Trusted runtime target configuration contains accountId, workerName (restricted to djamespoer-com), workerTag and production triggerId. Candidate input contains a full lowercase 40-character revision and buildId; optional deploymentId selects one historical activation. Candidate input/check state is never evidence. The reader must be bound to the trusted Cloudflare account/API; it must not derive its host or authority from an event.

Verification reads the candidate build, validates expected GitHub repository, main, root, build/deploy commands, Worker tag and production trigger, and requires stopped/success for activation correlation. It pages through production deployments with validated stable pagination metadata (100-page safety ceiling), deduplicates identical deployment IDs, rejects conflicting duplicate versions and unsupported traffic assignments, and queries one version at a time. The documented version-to-build response map is treated as an unambiguous single result, without assuming its map-key vocabulary. Matching SHA alone is never enough: build UUID and full context must also match. It caches repeated version reads and re-reads the unique selected deployment by ID before returning.

Results are deliberately small:

- verified-activation: outcome, deploymentId, versionId, buildId, revision, target and environment production, with no timestamps or private configuration;
- ineligible-pipeline: outcome only, for positively mismatched repository/production context or independently established matching pre-deploy failure;
- unverifiable: outcome only, for missing/ambiguous/inconsistent evidence, unsupported assignments, malformed input/responses/pagination, generic failed pipelines or read failures.

The optional preDeploymentFailure parameter is a separate trusted operator/lifecycle attestation containing buildId, revision and a pre-deployment stage. It is NOT a documented Cloudflare API field, event/check conclusion or automatic stage detector. The caller must establish provenance independently. It classifies only a matching stopped/failed build; absent, inconsistent or Deploying-stage attestations do not qualify. This can represent James's known Installing observation without hardcoding his SHA or inferring stage from a generic failure. An eventual automatic observer must omit this parameter unless it has independently authoritative stage evidence.

Explicit deployment selection distinguishes repeated activations of the same SHA. Without selection, multiple matching deployment UUIDs are unverifiable; they are not collapsed or guessed. A superseded deployment proves historical activation, never that it is current. Matching historical records need retained version/build evidence. Re-read detects changed assignments but does not claim an atomic cross-resource provider snapshot. Missing optional API fields, incomplete retention, unrelated unsupported historical records and pagination limits fail closed; no fallback or manufactured failure.

Run only the focused mocks: node --test scripts/deployment-history/cloudflare-activation.test.mjs. All 22 tests pass, covering correlation, context/SHA/identity mismatch, traffic shape, ambiguity/deduplication, known versus generic failures, historical/repeated activation, read/pagination races and privacy/timestamp omission. Prettier/whitespace checks pass. No live Cloudflare requests, full Angular suite/build, workflow, GitHub writes, credentials, configuration changes or snapshot refresh ran. Schema v2 and snapshot behavior are unchanged.

Recommended Chunk 9E: a mocked read-only runtime adapter/check-input boundary with pinned Cloudflare origin, GET-only requests, external credential injection, timeouts/redirect refusal, and sanitized errors; confirm representative redacted account response compatibility before enabling live reads. Keep GitHub write/idempotency orchestration and Actions wiring for a separately approved chunk.

## Read-only HTTP and check-input boundary: Chunk 9E

Chunk 9D is approved. cloudflare-reader.mjs exports createCloudflareReader({ accountId, getToken, fetcher, timeoutMs }). Factory creation/import performs no request. Its reader matches only the four approved resource patterns for the configured account and fixed Worker, validates UUID/page identifiers, reconstructs paths internally and pins https://api.cloudflare.com/client/v4. It accepts only GET; absolute URLs, external origins, other accounts/scripts/resources, encoded traversal, extra queries and page numbers above 100 are rejected before credential lookup/network execution.

A future external runtime supplies getToken (for example a getter reading an Actions secret environment variable). No token/default credential is embedded, persisted or logged. Credential presence is checked only when a read executes; the credential getter's errors lose their original message/cause. The injected fetcher enables all tests to remain mocked; production fetch would be used only when explicitly called in a separately approved chunk.

Each read has an aborting deadline covering credential lookup, fetch and body consumption, at most 15 seconds. Redirects use error mode and are additionally rejected if a response indicates redirection. Non-2xx, invalid JSON, malformed envelopes and unexpected projection types become the same safe error with no provider details/cause. Text over two million characters is rejected before JSON parsing; this is a post-read size check, not a streaming memory limit. A credential resolving after timeout cannot initiate a late request.

The reader emits only provider-specific fields needed by the verifier: build identity/status/context, production trigger/Worker association, deployment IDs/traffic assignments and page/total_pages. It discards raw bodies, errors/messages, headers, environment variables, token names, emails, URLs and timestamps. Version lookup map keys are replaced with neutral index keys inside the provider response projection; map values retain only evidence fields. The approved verifier still decides eligibility/truth and remains unchanged.

Deployment requests use page/per_page numeric construction, never provider URLs/links. Pagination metadata must match the requested page, be integral and remain within 100 pages; lists are capped at 100 records per response. The existing verifier owns sequential enumeration and stable-page-count checks. Missing, changed or failed remaining pages cannot produce verified evidence from a partial list. Optional documented pagination/evidence fields missing in real responses remain unavailable evidence; no completeness assumption is introduced.

cloudflare-check-input.mjs exports parseCloudflareCheckInput(event, { expectedAppId }). It requires the completed event/status, pinned repository numeric ID/full name, exact Worker check name, trusted configured Cloudflare app ID plus slug, safe numeric check ID, exact full lowercase SHA and UUID external build ID. It returns only repository/check/app identity and revision/build candidate fields, or ok false. It never retains conclusion, URLs, output or private event fields and never treats success as activation. Identity parsing does not authenticate a webhook: future live verification must use a trusted GitHub input or re-fetch the check, and independently establish/pin the real Cloudflare app ID. No public receiver, webhook or GitHub acquisition is added here.

Focused mocks: node --test scripts/deployment-history/cloudflare-boundary.test.mjs scripts/deployment-history/cloudflare-activation.test.mjs passed 46/46 (24 boundary plus 22 verifier tests). Tests cover pinned requests/authentication, safe failures, timeouts/late credential resolution, redirects, malformed bodies, path/pagination restrictions, check identities, stripped private data and full mocked verifier composition. Prettier/whitespace checks pass. No live Cloudflare requests, full Angular suite/build, credential, workflow, GitHub writes, deployment, snapshot refresh or application/configuration changes occurred.

Smallest proposed Chunk 9F: an explicitly invoked, read-only diagnostic runner wiring the existing parser/reader/verifier to externally supplied account/Worker/trigger configuration and credential. First confirm least-privilege access and the real app/check identity, then verify one identified historical production activation (and the Installing failure as unavailable stage evidence unless independently supplied). Print only sanitized outcomes or fixed diagnostic codes; never capture raw responses or secrets. No workflow, GitHub writes, deployment, snapshot refresh or automated observer. Account response availability/optional pagination remains unverified until that authorized run.

References for boundary shape: [GitHub check event payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_run), [Cloudflare deployment pagination](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/). The observed external build UUID behavior is Cloudflare integration evidence rather than a GitHub promise; absent/changed shape must reject without parsing provider URLs.

## Read-only diagnostic prerequisite: Chunk 9F

Chunk 9E is approved. The first 9F pass stopped at missing runtime credentials. James subsequently configured a user-scoped, account-restricted token with Workers Builds Configuration Read and Workers Scripts Read in his PowerShell session. The resumed runner invocation still found required input unavailable in the tool-launched process and made zero requests. No real API shape, permissions, pagination, activation or check/build correlation has been verified; do not recreate or broaden the token.

The existing read token must be inherited by the Node process; it must not be placed in source, a command argument, chat or a repository environment file. Do not use an edit template or change the production build token. See [Builds API authentication](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/) and [permission names](https://developers.cloudflare.com/fundamentals/api/reference/permissions/). Read access remains untested; stop on permission denial rather than escalating permissions.

Run `node scripts/deployment-history/cloudflare-diagnostic.mjs` only for an explicitly approved diagnostic session. Its only runtime prerequisites are CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Worker/application, repository and production branch remain fixed to the approved project. Manual deployment ID, Worker tag and trigger ID variables are no longer consumed. Independent Worker/trigger discovery runs before deployment/build acquisition; candidate build metadata never establishes trusted target identity. Deployment UUIDs come from complete bounded/stable deployment enumeration, with duplicate/conflicting-identity handling and unchanged verifier correlation. Repeated matching activations, multiple verified activations, missing evidence and unsupported traffic remain unverifiable. No list-order/current-production or lifecycle-timestamp inference occurs.

Output contains fixed reason/resource categories, HTTP status and shape booleans, plus the verifier's sanitized activation result if verified. The reader continues to require complete bounded pagination; missing metadata stops verification. No raw bodies, headers, account ID, token, Worker tag, trigger configuration, provider timestamps or environment/configuration values are printed or persisted. Permission denial stops further acquisition. Exit status is zero only for verified activation. Focused tests cover missing runtime input, safe HTTP/transport/JSON failures, pagination mismatch, explicit selection, and full mocked reader/verifier composition including known failed-candidate exclusion. No workflow, GitHub writes, deployment or snapshot refresh is authorized.

## Independent target discovery: Chunk 9F

The reader adds only GET /accounts/{account_id}/workers/scripts and GET /accounts/{account_id}/builds/workers/{worker_tag}/triggers. Pinned origin, internally reconstructed identifiers, external credentials, timeout, redirect refusal and safe failures are retained. Worker responses project only id/tag. Trigger responses project only identity, active/deleted state, repository identity, branch criteria and the existing root/build/deploy context. Build-token details, environment variables and other private fields are discarded.

Discovery requires exactly one Worker named djamespoer-com with a valid immutable tag, then exactly one active trigger tied to that tag, GitHub mentalnote74/djamespoer.com, branch_includes exactly [main], no branch exclusions, root /, build npm run build and deploy npx wrangler deploy. Missing, malformed, inconsistent or ambiguous evidence fails closed; no first/default/newest selection. Names alone do not establish a production trigger.

Both discovery endpoints document array results without pagination query parameters. The reader accepts that complete-list contract with a 1,000-record safety bound. If result_info is supplied, it must explicitly establish one complete page (page 1, total_pages 1, count and total_count matching the array length); unexpected pagination targets/metadata or partial lists reject. No undocumented page query or next URL is followed. Real shape/access compatibility remains unverified.

Official endpoint permissions are Workers Scripts Read for Worker listing and Workers CI Read for trigger listing. James's dashboard label is Workers Builds Configuration Read; its correspondence to API permission naming is expected, but not proven by a live read. Keep the existing token unchanged and stop on denial. References: [Worker list](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/list/), [trigger list](https://developers.cloudflare.com/api/resources/workers_builds/subresources/triggers/methods/list/), [permission names](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

Focused Node tests passed 73/73, covering independent discovery/composition, wrong identities/context/branch, ambiguity, malformed fields, partial/unavailable acquisition, pagination targets and private-field stripping. Formatting/whitespace checks passed. No live request, credential inspection, write, deployment, snapshot refresh, workflow or application change occurred. Wait for approval before the single live diagnostic; execute in the PowerShell session whose child Node process inherits both runtime inputs.

## First manual evidence read and predicate diagnostics: Chunk 9F

James executed the authenticated read-only diagnostic manually. Reported Worker/trigger/deployment/version-build/build requests all returned HTTP 200 and successful envelopes; deployment pagination and version-to-build maps were present. Existing token permissions were sufficient for those exercised resources. Do not request broader permissions. Final reason evidence-not-established / outcome unverifiable means the runner reached the activation verifier and at least one candidate failed verification; the original output does not identify the exact predicate. The known failed Smart Grid revision was not promoted to a deployment. Its separate diagnostic check may not have run because the runner stops on the first unverifiable activation candidate.

The verifier now accepts optional onDiagnostic(category), reporting only fixed category strings at existing predicate branches. Its semantic results/evidence rules are unchanged; observer exceptions are ignored. The runner adds those categories to observations as activation-predicate or known-failed-predicate without field values, timestamps, raw responses, credentials or target configuration. Categories distinguish UUID/revision/context mismatch or missing evidence, build success not established, traffic/pagination/correlation problems, no matched deployment, ambiguous matching activations and confirming reread mismatch. Nonmatching historical build UUIDs may be reported before a terminal no-match/ambiguity category; they are not independently treated as deployment failures.

For a separately approved second manual read, use the same command: node scripts/deployment-history/cloudflare-diagnostic.mjs. Only token/account runtime input is needed; use the credential-bearing PowerShell process. No second read was performed during this diagnosis. Focused mocks passed 87/87, including outcome equivalence with/without reporting, privacy and throwing-observer isolation. Formatting/whitespace checks passed. No evidence rule was relaxed.

## Second read: identity-domain audit

Reported repeated build-uuid-not-matching-candidate messages compare two Cloudflare build-record UUIDs: candidate.buildId, copied from the selected version lookup map value build_uuid, versus another enumerated version's lookup map value build_uuid. Nonmatching builds are skipped; no version/trigger/deployment UUID, map key or GitHub check identity is compared there. The lookup's opaque keys are deliberately not used. [Version lookup semantics](https://developers.cloudflare.com/api/resources/workers_builds/methods/get_builds_by_version/) and [build-record semantics](https://developers.cloudflare.com/api/resources/workers_builds/subresources/builds/methods/get/) document that same build UUID domain.

The terminal missing-or-ambiguous category is a separate singleton-map/object/UUID-validity predicate. Given the hardened reader's projected object values, an empty map, multiple values or an invalid UUID can explain it. Which occurred remains unknown. HTTP 200/map presence does not establish provenance. An older Wrangler deployment lacking associated build evidence is plausible but not proven; no documentation guarantees build provenance for every historical version. The full-history scan may stop on an unrelated unsupported historical entry before proving the candidate. Changing that scope requires review, not a guessed identity correction.

Existing mock identities are distinct across trigger/build/deployment/version domains. Their simpler successful histories and separately tested failure cases did not reproduce the combined mixed-history scan described by the second run. Proposed next tests should combine unrelated distinct builds, an exact candidate and later missing/ambiguous provenance; finer value-free terminal categories should distinguish cardinality from UUID validity. No code/evidence rule was changed and no further live request was made during this audit.

## Precise correlation diagnostics and mixed-history proof

The existing singleton-map rejection now distinguishes version-build-correlation-empty (zero values), version-build-correlation-multiple (more than one), and version-build-correlation-invalid-build-uuid (one non-object or invalid UUID value). A missing map still has its separate missing category. All decisions remain unverifiable at the same stopping point; the hardened reader may reject malformed value shapes before this verifier predicate. No provenance is skipped to force success.

Three synthetic mixed histories reproduce two valid unrelated build notices followed by unavailable, ambiguous or malformed provenance. Tests assert that the later version supporting the exact candidate is not queried and its confirming deployment is not reread. Verification with the already-supported explicit deployment selector proves the later candidate's complete evidence chain independently, without changing the broader scan. Focused Node tests passed 90/90.

Unknown provenance cannot be assumed unrelated: it could hide another activation of the candidate. Continuing to collect diagnostic categories while retaining an unverifiable result is distinct from ignoring incomplete evidence to verify. Any change from whole-history ambiguity checks to explicitly scoped activation verification needs review. For an approved final manual diagnostic run use node scripts/deployment-history/cloudflare-diagnostic.mjs in the credential-bearing PowerShell session. No live request occurred during this change.
