# SCRUM-86 approved-claim correction lifecycle

James explicitly added post-acceptance correction to SCRUM-86. This replaces the
prior setup-only diagnosis: an approved false claim must leave current truth when
an explicitly linked approved correction replaces it. No inference from similar
wording or a later independent proposal establishes that relationship.

## Additive model

`claim-lifecycle.sql` adds two tables, one view, one unique index and five triggers:

- `thingamajob_claim_correction_proposals`: immutable pending correction-to-prior-
  claim relationship and owner-supplied reason.
- `thingamajob_claim_supersessions`: immutable lifecycle event, obsolete claim,
  replacement claim/proposal/review, authorizing owner, execution context, reason,
  request fingerprint/key and timestamp.
- `thingamajob_active_claims`: original reviewed claims minus claims with a
  supersession event. Review disposition remains accepted/corrected; lifecycle
  state is derived independently as active/superseded.

Composite foreign keys preserve same-workspace relationships and exact replacement
claim/proposal/review identity. One event per obsolete claim, active-target guards,
and append-only triggers prevent conflicting transitions, cycles or history edits.
Claim versions remain immutable version 1; active-state and pending-proposal version
preconditions are enforced inside committing SQL, with owner membership/expiry guards.

## Protected owner workflow

Select an active approved proposal in the shared Angular feature and choose
**Propose a correction to this approved claim**. Evidence-backed replacement wording
and a reason create a linked pending proposal, leaving the original active.
Explicit Accept/Correct atomically creates the replacement review/claim/history and
supersession event in one D1 transaction. Reject preserves the original active claim.
Competing/stale correction approval conflicts and rolls back every dependent write.

For an already-approved correction created before this relationship existed,
**Supersede this claim with an approved correction** explicitly selects the active
replacement and confirms the relationship with a reason. This action creates the
same lifecycle event without changing either claim or review. Identical retries
replay; changed retries, missing/mixed IDs, revoked ownership and inactive targets
fail closed. Browser actor/role/execution fields cannot establish authority.

Endpoints are TEST-only, same-origin CSRF protected, and require verified Access
plus fresh committing owner authority:

- POST `/api/thingamajob/workspaces/<workspace>/claims/<claim>/corrections`
- POST `/api/thingamajob/workspaces/<workspace>/claims/<claim>/supersede`

Current workflow claim selection and new UNKNOWN resolution qualification use the
active view. Proposal audit responses separate `historicalClaim` from current
`claim` and expose both supersession and reverse replacement relationships. Angular
labels historical approvals as superseded and permits navigation in both directions.
Existing UNKNOWN resolutions/events are preserved, with superseded references clearly
labelled; no automatic reopening or rewriting is introduced.

## Specific TEST reconciliation

The explicitly authorized operator helper shares the lifecycle transition with the
owner route. It is absent from browser routing, uses authenticated Cloudflare TEST
D1 access and verified ignored TEST configuration, and records `execution_context=operator`
with James's explicit instruction reference. It does not fabricate Access identity
or perform a new owner review. The replacement was already owner-reviewed.

- Obsolete claim: `f979fcdc-253b-40ed-b4c8-f1ca9a2b2c1e`
- Replacement: `ba239a8e-519c-40b9-9e9f-5d99b65d4a44`
- Replacement proposal: `5e818032-d153-45c3-9734-bd86b9de2d4a`
- Replacement review: `257b6233-f1f5-42b5-b3dc-d32a4f6ec715`
- Event: `615b684d-9c05-4fea-81fb-131ae09e6594`
- Recorded: `2026-10-14T16:44:55Z`

Authoritative D1 inspection after final Worker redeployment confirms historical
claims 4, active claims 3, lifecycle events 1, linked correction proposals 0. The
obsolete claim is absent from active LoT; the approved corrected claim is present.
All 20 pre-existing application table counts/canonical hashes remain identical,
including both original claim rows, proposals, reviews, evidence, UNKNOWNs, source
relationships and histories. No original R2 bytes were read/re-uploaded/modified.
D1 foreign-key and quick checks pass. Erica onboarding, Access policies, LIVE,
portfolio deployment and remote main remain untouched.

TEST Worker `thingamajob-api-test`, version
`feb85186-f353-46d9-809f-4b8a64f36657` serves 100%; existing D1/R2/verifier/assets
bindings and private R2/dev-preview restrictions remain unchanged. The accepted
SCRUM-85 verifier was not redeployed or migrated.

## Verification and acceptance

Shipping server 120/120, including lifecycle 14/14 and a fictional acceptance-setup
regression; focused Angular 17/17 and full Angular 251/251; strict TypeScript,
formatting/whitespace, Worker dry run and both builds/budgets pass. Public initial
bundle 304.98 kB, protected initial 234.87 kB/lazy feature 30.04 kB. Generated public
build timestamp restored; public content and history snapshot unchanged.

Local compiled Angular plus fictional signed Worker/SQLite integration passes both
correction paths, audit navigation, preserved resolution history, keyboard/focus,
stale/denied outcomes and inert content. Nineteen axe audits find zero violations;
one main/no overflow at desktop/390/320px and 200% text/CSS zoom. Narrow screenshot
inspected. Separate Node-process restart retains the lifecycle and active view;
real D1 event persisted across TEST Worker redeployment. These are distinguished
from real authenticated human UI acceptance, which remains pending. Unauthenticated
TEST app/workflow requests continue redirecting to existing Access.

The read-only visible audit follow-up is deployed. Use the exact button-based steps
in [audit-acceptance.md](./audit-acceptance.md), which records the latest Worker
version and validation. Each active claim exposes **View history / audit**, with
**Inspect original approval and supersession history** and **Open replacement
proposal and review** connecting both directions. This follow-up changes no
schema, claim, review or lifecycle event.

Stop at James acceptance. No Erica site work or SCRUM-87 is authorized.
