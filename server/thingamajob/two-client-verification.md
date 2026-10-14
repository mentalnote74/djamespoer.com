# SCRUM-85 protected two-client verification

SCRUM-84 human acceptance is green at `fea271d345bd4477f7cbaa23bbd32ee36dcbcb24`.
James verified Correct plus separate explained resolution, Accept without automatic
resolution, and Reject without a claim. Original wording and chronology remained
available. SCRUM-85 does not reopen or overwrite that checkpoint.

## Deployment boundary

James approved separate fictional TEST infrastructure:

- Protected entry: existing `thingamajob-api-test`,
  `/api/thingamajob/test/two-client-verification`.
- Service-only Worker: `thingamajob-scrum85-verification-test`.
- Dedicated D1 and private R2: `thingamajob-scrum85-fictional-test`.
- No workers.dev URL, preview URL, public route, or R2 public/custom domain.
- Existing owner identity, authorization and same-origin mutation checks run before
  dispatch and authorization is rechecked afterward. Request bodies are rejected;
  no identity, scope, roles, JWTs or prompts are forwarded to the service.
- The isolated service accepts only the fixed empty internal `/run` request. A D1
  sentinel and fictional-only issuer check fail closed before any fixture writes.

No Access policy or real onboarding changes. No fictional records, failure triggers,
or evidence are placed in James's D1/R2. The verification schema reuses existing
identity/original/evidence/assertion/UNKNOWN tables in the **new** database, plus
`scrum85_verification_run`. James's database schema is unchanged.

Configuration examples: `wrangler.example.jsonc` and
`wrangler.verification.example.jsonc`. Account/database identifiers are only in
ignored private configs. Service bindings preserve the existing parent D1/R2 and
secrets; no issuer/audience secret values are copied or changed.

## Proof and evidence levels

The scoped test tool has one server-created proposal capability. It cannot choose
workspace/actor, review a proposal, resolve an UNKNOWN, or establish human identity.
Malicious text remains inert proposed content; forged tool authority fields reject.
There is no live LLM or job/evidence-strength evaluator.

The bounded deployed plan has 137 steps, advancing one step per owner-authenticated
request. Progress is persisted with an atomic state/report precondition; concurrent
invocations cannot repeat initialization or overwrite another step. The browser
continues automatically, but each request must retain normal Access and active
owner authorization. Local tests enforce at most 45 prepared SQL statements per
service invocation, including safety/progress checks, rather than increasing plan
limits or billing. No account plan was changed.

The plan covers both production pipelines for two fictional owners, Accept/Correct/
Reject, explicit explained resolution, retained chronology, retries, reciprocal
foreign and mixed IDs, relationship and nested claim/history isolation, direct
object attempts, signed expired/forged identity, manipulated scope/role headers,
scoped malicious tool arguments, stale/concurrent reviews, real D1 batch rollback
after R2 success, inaccessible retained orphans, safe replacement retry and R2
failure with generic errors. Orphan reconciliation is verified without deleting or
making the orphan retrievable; generalized retention remains out of scope.

Existing shipping suites additionally cover concurrent UNKNOWN answers/resolutions,
commit-time revocation and rollback across every mutation. A separate local test
starts a new Node process, reopens SQLite and disk originals, then retrieves both
clients' evidence, claims and corrected UNKNOWN history and replays durable keys
without record changes. These are local integration results, not deployed results.

Desktop/narrow local UI verification checks native keyboard activation, visible
focus, one main, no overflow and axe. Its fictional parent and service databases are
separate. No private evidence or real career facts enter fixtures or browser output.
Public responses contain fixed check labels/counts and phase/progress, never human
identity, real evidence, provider errors or raw stored originals. No application
console logging is added.

## Accepted deployed checkpoint

Initial TEST entry version: `6c3acdf8-75a6-4eea-a9c6-9361832f5cc2`.
Initial verifier with atomic progress guard:
`06629f12-7e6b-4a7b-a622-6e6e805fd3a6`.
Repaired verifier: `c471f433-19d4-4f2b-ad64-d2fe850342c6`.

Deployment inventory, bindings and private visibility are independently checked.
All 20 real TEST application tables retain their pre-rollout row hashes/counts;
James has one active owned workspace, one evidence record, six reviewed proposals,
four claims, three UNKNOWNs and one explicit resolution at the captured baseline.
Erica pending/approval records remain empty and real acceptance remains open.
LIVE and public portfolio deployment/main remain unchanged.

James loaded the protected page and clicked Run once. The deployed run completed
24/137 checks, then returned HTTP 503. Aggregate GraphQL invocation metrics show
`exceededResources` at 2026-10-14 13:39:30 UTC. Historical telemetry inspection
was denied (403), so the precise exhausted sublimit is not established. Bindings,
service target and schemas are correct; this was a runtime termination.

The verifier generated an RSA pair for every step. That repeated expensive fixture
operation is now cached per isolate; identities/expiry/authorization are not cached.
Local full-plan runtime dropped from roughly five seconds to under one second in
these checks, without changing plan limits/billing or the owner boundary.

Inspected persisted cursor 24, its 24 check labels, expected prefix counts and FKs.
The next step only checks that repeated resolution conflicts; it makes no business
changes. A compare-and-match update released only this interrupted running lock to
ready, retaining its entire report. Pre/post hashes match for every fictional
business table. No identities, evidence, decisions or resources were reset.

Shipping server tests 101/101; strict TypeScript, formatting and whitespace pass.
Angular 234/234 and production build/budgets pass; timestamp restored. Four local
UI axe audits pass with keyboard run/visible focus/no overflow/one main.
James subsequently ran the repaired verifier once through normal Cloudflare Access.
The authoritative isolated D1 run is now state=passed, cursor=137, with all 137
ordered check labels independently compared against the executable plan. No
additional human rerun is required or requested.

Authoritative checks found two fictional owners, ten reviewed proposals, seven
claims, six UNKNOWNs (four resolved, two open), and complete relationships/history.
No unreviewed or rejected claims, missing owner authority, foreign relationships,
automatic resolutions or non-fixture evidence were found. Foreign-key check has
zero violations; quick_check is ok. Three committed R2 objects were independently
read and matched against exact synthetic fixture bytes, SHA-256 and byte length.
The fourth known object is the retained synthetic orphan, absent from committed
D1 references and inaccessible through the owner evidence API as asserted in the
persisted plan. No James originals were read or changed in this verification.

Persistence evidence is separated deliberately: an actual new local Node process
reopens SQLite and disk originals; the deployed initial 24-check prefix survived
the verifier repair redeployment, and final deployed retrieval/idempotent-replay
checks read its retained originals, reviewed claim and corrected resolution/history.
The stored phase remains initial; a separate PROOF_PHASE=restart run was not done
and is not claimed. Coach explicitly directed no further James rerun.

All 20 real TEST table hashes/counts still match the pre-SCRUM-85 baseline. Erica's
real pending/approval state is unchanged. Existing D1/R2 bindings and private
visibility, Access policies, LIVE inventory, portfolio deployment and remote main
remain untouched. Application code adds no console logging; persisted checks prove
sanitized failures. Historical log contents could not be audited because telemetry
access returned 403. The resource-limit subcategory is not inferred as a confirmed
CPU or memory error.

Sanitized evidence is in scrum-85-verification-results.json. Checkpoint branch:
origin/test/scrum-85-two-client-roundtrip. Only intended SCRUM-85 work is committed;
unrelated diagnostics/assets/content/output/traces remain outside the commit.

SCRUM-85 ACCEPTED / GREEN FOR SCRUM-86. No SCRUM-86 implementation is authorized
until Coach supplies the next block. The acceptance URL remains
https://api-test.djamespoer.com/api/thingamajob/test/two-client-verification.

The fictional D1 file-import endpoint initially rejected authentication and left
the database empty; a SELECT confirmed it. The same authorized schema was then
applied successfully through the query API (28 statements), avoiding import and
Windows argv-length failures. This did not mutate the real TEST database.
