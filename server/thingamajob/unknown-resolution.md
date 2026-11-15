# SCRUM-84 independent UNKNOWNs

Recovered from the interrupted SCRUM-83 checkpoint without resetting, stashing,
discarding or recreating surviving implementation files. The TEST-only workflow
preserves question/reason/context, attributed answers and same-workspace evidence.
An answer or reviewed claim never closes the UNKNOWN automatically.

The owner explicitly creates a linked proposal, separately Accepts/Rejects/Corrects
it through SCRUM-83 review, then explicitly resolves the UNKNOWN with a qualifying
linked accepted/corrected claim and a specific relevance explanation. Rejected,
unsupported and unrelated claims cannot resolve it. Original answers, proposals,
review decisions and resolution history remain available. Expected versions,
workspace-scoped idempotency and atomic D1 batches protect retries and concurrent
decisions; committing owner predicates and dependent foreign keys roll back all
writes after revocation or a failed precondition. Answers and proposals are returned
in event-version order.

## Reconciled deployment boundary (2026-10-14)

Authenticated read-only inspection found TEST still serving the deployment labeled
`SCRUM-83 owner-only assertion review`, version
`11ccb64d-b619-4a09-8e46-0529ad4dbbb3`, at 100%. Its D1/R2 bindings and custom
hostname match the accepted resources. The private R2 bucket exists, managed public
access is disabled and custom domains are empty. No Thingamajob LIVE Worker is
present; the public portfolio's latest deployment predates the checkpoint.
Remote main and the SCRUM-83 branch match their recorded SHAs.

Aggregate-only TEST D1 inspection found one active owned workspace, two originals,
one evidence record, three reviews/proposals (one each accepted/rejected/corrected),
and two claims. No pending identity or active approval records; Erica's real
acceptance remains open. Foreign-key check returned no violations and quick_check
returned ok, with zero rows written. This is structural reconciliation, not a new
real-owner login or byte-for-byte R2 content verification. No UNKNOWN tables are
deployed. Access policies, schemas, records and deployments were not changed.

The ignored local config was reconstructed from deployed resources and the tracked
example, with TEST only and no copied secret values or LIVE environment.

## Verification and next operator gate

Shipping server tests: 92/92, including 17 UNKNOWN tests. Strict server TypeScript,
scoped Prettier/whitespace, TEST Worker dry-run bundle and production Angular build
pass. Angular tests pass 234/234. Local fictional Worker/SQLite Chrome integration
covered Accept/Reject/Correct at 1280px and 390px: 22 axe audits, zero violations,
no horizontal overflow, one main. It is not real Access/owner acceptance.

The broad server command also includes surviving local diagnostic tests: four
PowerShell transport tests cannot execute under the current Windows execution
policy. Diagnostics were not modified to bypass that policy. Initial sandboxed
Angular compilation failed on directory access; the authorized unsandboxed rerun
passed. The recovered ordering failure was fixed before final shipping checks.

Recovery reconciliation was accepted and James authorized TEST rollout. Applied
only `unknowns.sql`: six UNKNOWN tables and the unique claim/proposal identity
index. Deployed TEST Worker version `bd33c4c6-d8eb-4cce-963c-368732a460dd` at 100%.
Post-rollout canonical row hashes and counts match the pre-rollout snapshot across
all 14 existing D1 tables, including ownership, pending/approval records, originals,
evidence, proposals, reviews, claims and histories. No raw records are persisted in
the verification artifacts. All six new tables are empty, foreign_key_check has no
violations and quick_check is ok. Bindings, domains, R2 visibility, LIVE inventory
and public portfolio deployment match the baseline. No R2 originals were read,
uploaded or changed during rollout; no Access policies were modified.

Protected readiness checks of UNKNOWN and storage endpoints both returned 302 to
the existing Cloudflare Access login. This verifies unauthenticated protection,
not an authenticated owner success. Post-deploy shipping tests 92/92, strict
TypeScript and whitespace pass. Dedicated checkpoint branch:
`test/scrum-84-unknown-resolution`; main remains unchanged.

Next gate is James's normal Access session at
`https://api-test.djamespoer.com/api/thingamajob/test/unknowns`.
Verify open UNKNOWN -> attributed answer/evidence -> linked proposal ->
separate owner review -> still open -> explicit explained resolution; exercise
Rejected and Corrected paths without losing history. LIVE/main remain off-limits.
No real career UNKNOWNs/answers were authored by the agent. No job evaluation,
evidence-strength rating, live LLM or automatic promotion is included.
