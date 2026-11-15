# SCRUM-81 immutable original transaction checkpoint

James accepted protected D1/R2 readiness at commit
`042d192d36b0dda8a79fc6e7ffad3259ceb31afe`. Erica's real human acceptance remains
open; neither shared storage nor future clients depend on James-specific logic.

This slice adds an internal immutable-byte storage seam and additive TEST D1
tables `thingamajob_originals` / `thingamajob_original_history`. It does not
implement SCRUM-82's public evidence intake, format validation, attribution,
source locators or career claims. Only a fixed fictional fixture is reachable
through the TEST route; browser payloads cannot upload career content here.

## Atomicity, versions and retries

1. Validate a genuine owner scope, input size and create-only expected version 0.
2. Look up the request key **within that workspace**. Same bytes replay the
   committed source/version; different bytes conflict. A request key is never
   authorization. Original version 1 is immutable, not an editable career claim.
3. Generate a new private R2 key server-side in the authorized workspace prefix.
   Conditional put prevents overwrite; original bytes are preserved.
4. Commit the original reference/hash/size and creation history in one D1 batch.
   The parent INSERT includes current actor/membership/ownership, token-expiry,
   and expected-version predicates. A dependent FK failure rolls back the batch
   if the guarded parent inserts no row. Preflight authorization alone is insufficient.
5. If a concurrent request already committed the same key/hash/size, return that
   winner; never overwrite its original or append duplicate history.
6. Recheck authorization after storage. Read/integrity verification resolves the
   object key only from a committed record in the authorized workspace, never
   from a browser filename/key/foreign ID.

The boundary is 10,000,000 bytes (10 MB decimal). Zero-length input is rejected.
No formats are claimed as validated by this low-level byte-storage seam.
Public evidence-format validation belongs to SCRUM-82.

## Recovery and reconciliation

There is no distributed R2/D1 transaction. R2 failure commits no usable record.
R2 success followed by D1 failure leaves a private, inaccessible recoverable
orphan. Concurrent retries may also leave an orphan. Do not delete on catch.

For reconciliation, a trusted authorized operator compares keys inside the
specific workspace prefix against committed D1 original references. A referenced
key must never be deleted as an orphan. An unreferenced object is not evidence
and cannot be retrieved through the application. Preserve it and investigate
the failed request; retry can create a new committed original. Do not automatically
attach an orphan or promote it into truth. No public listing, reconciliation
endpoint, deletion routine, lifecycle expiry or general retention system exists.
Future deliberate deletion/export remains possible without automatic expiry.

All logging remains off. Responses contain only safe outcome/version/replay
information, never private identity, object keys, bytes, raw SQL or provider errors.

## Real TEST acceptance

Apply `originals.sql` once to the existing TEST D1; do not reapply identity schema.
Existing ownership, pending approvals, Access policies and private bucket
configuration stay unchanged. Deploy only `thingamajob-api-test`.

James uses his normal Access session at:

`https://api-test.djamespoer.com/api/thingamajob/test/storage-roundtrip`

Press **Run synthetic check**. Expect HTTP 200 with committed/integrity/version 1
and `replayed: false`. Press again **without reloading**: expect `replayed: true`.
One page uses one in-memory retry key; a new page intentionally starts a new
tiny fictional check. No cookies/tokens are extracted, exposed or persisted.
No career evidence upload or custom session system is involved.

Synthetic tests prove failure rollback, blocked orphans, integrity, size limits,
concurrent replay, D1 reopen durability, both fictional workspace directions,
CSRF/TEST-only gating and revocation. These do not claim Erica's real acceptance.
Meaningful personal-account charges remain a stop condition before scaling;
no current invoice total is inferred from test counts.

References: [D1 transactional batch](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[R2 conditional puts](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).
