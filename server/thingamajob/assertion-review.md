# SCRUM-83 owner-only assertion review checkpoint

SCRUM-82 real-source TEST acceptance is complete at
`b45d4501d702e152c8a4e9425c032d1f2c146449`. This slice uses committed private
evidence metadata; it never rewrites originals or reads career-source files.
No AI/extraction, delegated review, evidence-strength classifier, job evaluation,
UNKNOWN resolution, or live LLM work is included.

## Protected TEST owner workflow

`https://api-test.djamespoer.com/api/thingamajob/test/assertions`

Through normal Cloudflare Access, an existing workspace owner:

1. Writes a proposed statement and supplies proposer attribution.
2. Chooses an existing committed source from their own workspace and supplies an
   optional supporting locator. The selector shows at most 100 recent sources.
3. Selects **Create proposal only**. No reviewed claim exists yet.
4. Explicitly selects **Accept**, **Reject**, or **Correct**. Correct requires the
   owner's corrected wording and directly creates a reviewed corrected claim.

Attribution records where wording came from; it is not reviewer authority. The
authenticated actor is stamped server-side. No document, AI, payload identity,
admin claim, browser workspace value or membership without ownership can approve
truth. Selecting a source does not imply that all statements in it are true.

## Minimal records and atomicity

Additive `assertions.sql` creates six workspace-scoped tables: proposals,
proposal sources, reviews, claims, claim sources and assertion history.

- Proposal creation inserts original statement/version 1, proposer attribution,
  same-workspace committed source/locator relationships and initial history in one
  guarded D1 batch. It creates no claim.
- Only the owner can perform one terminal decision against expected current
  version 1 / disposition `proposed`. The head advances to version 2 while original
  wording/version remain intact; reviewed claim version 1 is independently immutable.
- Accept preserves the proposed wording in its reviewed claim; Reject creates
  no claim; Correct preserves original proposal and owner correction and creates
  the corrected claim immediately in the same transaction.
- Current owner authority, active membership/workspace and token expiry are
  checked in committing SQL. A review FK references the exact guarded final
  state and server-generated review nonce. Zero-row precondition/authorization
  failure cannot commit dependent review/claim/history writes.
- Claims/provenance/history share workspace-composite FKs. Accepted/corrected
  claim disposition must match its review; a rejected review cannot back a claim.
- One final review per proposal and one claim per review prevent duplicates.
  Final history is immutable through the API; there is no terminal-decision
  rewrite, editable claim endpoint or dangling replacement proposal.
- Workspace-scoped request keys/fingerprints replay identical creation/review
  requests. Changed payload, stale version or a contradictory second decision
  conflicts (409). Concurrent requests cannot partially promote or overwrite history.
- State, claim and history are returned from one D1 read snapshot, then authority
  is rechecked. Provider errors remain generic; no private text/identity is logged.

Review disposition remains **proposed / accepted / rejected / corrected**.
No **Proven / Supported / Candidate-confirmation-needed / Gap** value is assigned,
and no **MET / NOT MET / UNKNOWN** evaluation is computed. Owner review is a
truth-approval decision, not an automatic external-verification assertion.

## TEST API

- `POST /api/thingamajob/workspaces/<workspaceId>/assertions`: JSON `statement`,
  `proposerAttribution`, `evidence: [{ sourceId, locator }]` (1–8 distinct references).
- `GET /api/thingamajob/workspaces/<workspaceId>/assertions/<proposalId>`:
  authorized original/version/disposition, sources, reviewed claim and history.
- `POST /api/thingamajob/workspaces/<workspaceId>/assertions/<proposalId>/review`:
  JSON `decision`, `expectedVersion`, plus `correctedStatement` for Correct only.
- `GET /api/thingamajob/workspaces/<workspaceId>/evidence`:
  bounded authorized source selector; no provider identity/object keys.

POST requires same-origin CSRF checks, JSON content type, bounded 32 KB input and
an `Idempotency-Key`. Unknown identity/owner/timestamp/rating fields reject.
Statement limit is 4,000 characters; attribution 1,000; locator 2,000.
All routes are disabled outside the exact TEST hostname/gate. Responses are
no-store JSON; denied/unknown API paths do not fall through to SPA HTML.
The page uses native controls, accessible status and nonce CSP, with no token
extraction, cookies/storage redesign or client-authoritative ownership.

## Acceptance gate

Apply only `assertions.sql` to TEST; do not reapply identity/original/evidence
schema. Existing ownership, pending approval, private R2, Access and LIVE stay
unchanged. All automated proposals and sources are fictional.

James uses an already authorized source and writes his own proposals. Verify:

1. A new proposal is `proposed`, original/current version 1, with `claim: null`.
2. Accept creates one `accepted` reviewed claim, preserves original wording and
   sources, and records both creation and owner-decision history.
3. A separate Reject retains its proposal/history and has `claim: null`.
4. A separate Correct retains original wording/version and atomically creates
   a reviewed corrected claim containing James's corrected wording/provenance.

Use only statements James chooses for his private workspace. Do not invent facts,
seed real claims on his behalf, paste private statements into chat/Jira, or label
this as Erica acceptance. Safe disposition/version/outcome reporting suffices.
Retry recovery is supported after network errors; the API returns the prior
result without a duplicate claim. Fictional security tests exercise deliberate
stale/duplicate/concurrent/adversarial/failure cases without poisoning real truth.

Stop at this human gate before SCRUM-84. Erica's real remote acceptance stays open.
No personal-account billing total is inferred; meaningful charges remain a
stop-before-scaling condition.
