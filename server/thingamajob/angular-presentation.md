# SCRUM-86 protected Angular presentation

Accepted base: SCRUM-85 at `9d7fd2a642c26995f8f3ef1e0fd578dcbca82d1c`.
One shared standalone feature lives in `src/app/features/thingamajob`, with a
component-provided API service and transient signals. A thin protected host supplies
one main landmark/skip link and a lazy route. There are no client-specific copies,
career facts, provider credentials, direct D1/R2 access or archive imports in the
browser bundle.

The separate `thingamajob-test` Angular build entry mounts at
`https://api-test.djamespoer.com/api/thingamajob/test/app/`. It uses the existing
TEST Worker and native same-origin Access session. Public portfolio component,
routes, carousel, themes, content and history behavior are unchanged; no portfolio
deployment occurs. Public production and protected builds both retain budget checks.

## Server boundary

The added GET `/api/thingamajob/test/workflow` resolves only the authenticated
human's existing active owner workspace and returns one bounded D1 read snapshot
(up to 100 records per list), with authorization rechecked after the read. It does
not bootstrap pending identities, provision workspaces, infer claims or write data.
Existing server endpoints remain authoritative for all evidence/proposal/review/
UNKNOWN mutations and expected versions. Browser IDs/affordances cannot grant
ownership or override committing owner predicates.

TEST assets are bound as `TEST_UI`, with `run_worker_first=true` and explicit
`html_handling=none`. The Worker authenticates Access before manually serving the
allowed asset filenames beneath the protected prefix. Root asset paths, archive
paths, missing/forged identity, LIVE and disabled TEST routes fail closed. Assets
and API responses are no-store; CSP/noindex/nosniff/referrer protections apply.
Unprovisioned authenticated humans may load the shell but their API denial is shown
honestly. No consent, cookie, CORS or Access-policy redesign is introduced.

## UI behavior

Evidence intake/download, attributed proposals, separate Accept/Reject/Correct,
reviewed claims, independent UNKNOWNs, attributed answers and linked proposals are
presented separately. Unsupported answers and rejected proposals do not qualify
for resolution. A linked accepted/corrected claim, explicit relevance explanation,
and native required confirmation enable the separate resolution action. Original
wording and review/resolution chronology remain visible.

Empty evidence/LoT is valid for either owner. Content/locators/filenames are rendered
as Angular text interpolation, never executable HTML or evidence instructions.
Downloads use the existing owner-scoped sandboxed attachment endpoint. No score,
job evaluation, live LLM, Dredge, resume generation or delegated reviewer is added.

Native forms/labels/fieldsets, disclosure controls and buttons support keyboard use.
Successful/error actions focus the status notice; opening a linked proposal focuses
its detail heading. Stale 409 decisions remain visible and are never auto-retried.
Denied/expired/unavailable authority clears private presentation state. Identical
explicit retries retain a transient request key; the server owns durable replay.
A saved action followed by failed refresh is distinguished from mutation failure.

## Verification and deployed gate

- Focused Angular: 14/14; full Angular: 248/248.
- Shipping server security/integration: 105/105, including four new tests for
  snapshot isolation, empty peers, revoked authority and protected asset routing.
- Strict server TypeScript, scoped Prettier and whitespace checks pass.
- Normal portfolio production build/budgets pass (304.98 kB initial); its generated
  timestamp was restored. Protected build/budgets pass (234.87 kB initial,
  24.32 kB lazy workflow). Worker dry run and TEST asset deployment succeed.
- Production Angular bundle plus fictional signed Worker/SQLite browser integration:
  Accept/Reject/Correct, explicit resolution, inert malicious markup, valid empty
  peer, stale/denied outcomes, keyboard and focus pass. Fourteen axe audits find zero
  violations; one main/no overflow at 1280/390/320px, 200% text resize and CSS zoom.
  Narrow screenshot visually inspected. These are local integration checks, not
  real James/Erica browser acceptance or native browser-zoom certification.

Deployed TEST Worker version: `1917e612-8193-4846-bd78-f1232ab89d12` (100%).
Authoritative inspection confirms the new assets binding and all existing D1/R2/
verification bindings, disabled workers.dev/previews and existing TEST hostname.
Unauthenticated app/workflow requests redirect to existing Access login. No real
owner mutation was performed by the agent. Real authenticated UI acceptance remains
James's gate; it is not inferred from an Access redirect or local tests.

Pre/post canonical row hashes and counts match across all 20 real TEST application
tables; integrity checks pass. Erica pending/approval state is unchanged. Existing
private originals were not read/uploaded/changed during this implementation.
SCRUM-85 verifier/version and its persisted 137-check result remain unchanged.
Access policies, LIVE inventory, portfolio deployment and remote main are untouched.
No schema changes and no new packages.

Checkpoint branch: `test/scrum-86-angular-presentation`. Unrelated surviving local
diagnostics/assets/content/output remain outside the commit. Initial focused tests
needed the harness to await zoneless async loading; final tests pass. Existing jsdom
canvas-not-implemented notices remain non-failing; no lint check is claimed.

## Human acceptance

Open the protected app URL through normal James Access. Verify existing evidence,
owner decisions/claims and open/resolved UNKNOWN history. Use an already-authorized
source and James's own accurate wording to create pending proposals; check separate
Accept/Reject/Correct. For an open UNKNOWN, record an evidence-backed answer, link a
proposal, review it and verify it stays open; then explicitly explain/confirm its
qualifying claim and resolve. Check keyboard focus and narrow reflow. No credentials
need to be copied, and no Erica career material is needed.

Stop at James acceptance. No Erica site work is authorized before SCRUM-86 acceptance.
