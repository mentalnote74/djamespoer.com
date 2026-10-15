# Pending extraction-run staging

Implemented, not deployed:
`GET|POST /api/thingamajob/workspaces/:workspace/extraction-runs/:run`.
The existing TEST origin/feature gate, Access JWT adapter and database-backed
owner membership control access. Client actor/role fields cannot establish
authority. POST retains the existing same-origin CSRF contract; LIVE has no route.

## Data and continuation

Additive `extraction-staging.sql` creates `thingamajob_extraction_runs` and
`thingamajob_extraction_candidates`. No existing claims, reviews or history are
rewritten. Immutable run JSON retains complete original candidate metadata,
source/provenance references, all citations, qualifications, conflict markers
and owner questions. Four real owner questions remain questions in the prepared
run document, not automatically created UNKNOWN records or answered assertions.

Sources must first be registered through existing protected evidence intake.
Staging verifies workspace ownership, stored-original SHA-256, source text and
literal citations before writing any proposal. Caller-provided source/provenance
metadata is evidence data, not an authority grant or verified career truth.

Every POST stages at most five unlinked candidates through the existing
`createProposal` service. Repeating the identical payload continues the run;
changed payloads for the same workspace/run conflict. Each proposal uses a stable
run/candidate request key. Existing review history/decisions survive replay.
Pending proposals use existing state `proposed`, never automatic acceptance.
Run state remains `staging` until all candidates are linked, then becomes `staged`.
The whole run is intentionally not one transaction: interrupted partial staging
is inspectable/resumable; individual proposal/history writes remain atomic.
Bounded continuation avoids large per-request D1/Worker query budgets.

GET returns the complete run document and candidate-to-proposal mapping with
current review dispositions. It does not depend on the overview's 100-row limit.
The existing review view can use current proposal detail/review APIs; only the
planned run/citation/uncertainty navigation adaptation remains. No UI was changed.

## Actual proof-run status

Extraction run: `1f96a7ab-1567-4678-bcef-15b840439cc7`.
Private prepared package:
`career-source/proof-staging/1f96a7ab-1567-4678-bcef-15b840439cc7/`.
Manifest SHA-256:
`3368e56becf45054c7b19807e123ed0ce699462146dc7ab0e3d9494dad8835e1`.

`scripts/thingamajob-prepare-staging.mjs` verifies the accepted candidate hash,
sealed baseline/redacted derivative and all citations, then packages three
private text source projections plus an immutable import template. All 65
candidates and four questions are retained. `UNBOUND_*` source IDs deliberately
fail server lookup until replaced with real owner-scoped evidence IDs returned
by protected intake. Source projections retain paragraph/section text and the
original source/capture/hash lineage. No new extraction/model call occurs.

Actual James proposals staged in TEST: **0**. No new endpoint/schema is deployed
and no real owner session was substituted with a fixture identity. No real
candidate was rejected; the complete package is prepared, not imported. No
remote D1/R2, active LoT, Erica, Access, LIVE or portfolio state was modified.

Blocker to actual protected staging: separately authorized TEST schema/Worker
rollout and real James owner-session evidence registration/import. This is not
complete remote staging; deployment remains prohibited by this slice.

## Focused evidence

- Local integration: 65 **fictional** candidates imported in 13 bounded signed
  JWT requests, all pending; retry unchanged and changed-input conflict verified.
- Complete candidate/citation/qualification/conflict/question JSON round-tripped.
- Existing accepted claim and review rows unchanged; no new claims/reviews.
- Missing/forged identity, non-owner membership, cross-owner reads/writes,
  guessed/foreign sources, authority fields and wrong origin denied.
- Invalid citations/question references rejected before proposal writes.
- Extraction staging tests: 3/3. Existing assertion integration tests: 13/13.
  After adding foreign-source/member/LIVE checks, staging 3/3 rerun passed.
- Strict server TypeScript passed. SQL executed in local SQLite fixtures only.
- Prettier passed for touched TS/MJS files; no SQL formatter is installed, so
  no SQL formatting check is claimed. No broad suite, axe or Lighthouse run.

Private package/results are excluded from Git. Only code, schema, tests and this
non-sensitive checkpoint are committed. No deployment or review-UI work occurred.
