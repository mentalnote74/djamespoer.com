# SCRUM-81 private TEST storage readiness slice

TEST Worker `thingamajob-api-test` uses D1 `thingamajob-identity-test` as
`IDENTITY_DB` and private R2 `thingamajob-originals-test` as `PRIVATE_ORIGINALS`.
Access issuer/audience remain server secrets. No LIVE configuration changes.
R2 public r2.dev access is disabled; no custom domains are attached. Do not
enable public access, lifecycle expiry, or copy career-source materials here.

An existing owner can use their ordinary Access browser session to open:

`https://api-test.djamespoer.com/api/thingamajob/test/storage`

This read-only alias derives the existing workspace from the validated signed
identity and D1 ownership. It never registers, approves or provisions a client.
The equivalent workspace-scoped route is
`GET /api/thingamajob/workspaces/<workspaceId>/storage`.
Both require the existing TEST gate and exact TEST hostname; they are absent on
LIVE/default/alternate origins. Existing bootstrap/pending approval is unchanged.

Ownership is checked before R2 and rechecked after it. The probe performs only
R2 `head` on a fresh server-generated key inside the authorized workspace's
reserved `_readiness` prefix. Request query/body/key/identity values cannot
select an object. No originals, metadata, keys or identity values are returned.
Success is JSON `{ "authorized": true, "d1": "ready", "r2": "ready" }`.
Denials are generic JSON 403; missing/failed R2 is generic JSON 503. All responses
are no-store and cannot fall through to SPA HTML. No new logging or dependencies.

This proves binding connectivity only. It does not implement evidence ingestion,
retrieval, D1 business records/history/version/retry contracts, or orphan
reconciliation. Those remain later SCRUM-81 slices. Future original keys must be
server-generated and retrieved through committed, authorized D1 evidence records;
the random readiness prefix is not an evidence-storage API.

Local tests use fictional signed humans and SQLite ownership plus a fake R2 head
binding. They prove reciprocal isolation, no R2 call before authorization,
revocation during the probe, suppressed provider errors, and TEST-only/read-only
behavior. These do not establish Erica's outstanding real human acceptance.

Keep probes bounded. Operator-reported billing baseline is $0.00; a deployment or
head probe does not establish the current invoice total. Stop before scaling if
meaningful personal-account charges appear. No object uploads are needed here.

References: [Worker R2 binding and head](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/),
[private/public bucket configuration](https://developers.cloudflare.com/r2/buckets/public-buckets/).
