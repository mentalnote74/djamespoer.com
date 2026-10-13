# SCRUM-80 identity and workspace ownership

Server-only foundation. Angular imports none of this directory. The SCRUM-80 checkpoint had no Worker entry point. Coach has now authorized the bounded SCRUM-81 read-only entry slice below; R2, evidence intake, claim/UNKNOWN implementation and public provisioning routes remain absent.

## Trust boundary

`createAccessIdentityAdapter` verifies the `Cf-Access-Jwt-Assertion` signature with jose 6.2.12 and the configured Access application's trusted JWKS. Issuer and audience are server configuration; keys come only from that issuer's `/cdn-cgi/access/certs`, not JWT-supplied URLs. Only RS256 human application tokens with valid required claims/time are accepted. Service/org tokens and unknown/unprovisioned subjects do not receive workspace authority. Validated email is never an actor lookup key.

`createWorkspaceAuthorizer` composes identity verification with D1-backed membership checks. Request bodies, query parameters, cookies, user-email/actor/workspace/role headers and signed role claims do not set the internal actor or owner. The workspace argument is an untrusted requested target: the joined database query must authorize it. The operation is a constant selected by the server handler, never a request-selected privilege.

`authorizeWorkspace` requires active actor, membership and workspace. Owner operations additionally require the actor to be that workspace's recorded owner. A member/admin/recruiter claim cannot become candidate ownership. Identity/scope objects are frozen and issued objects are recognized through private WeakSet/WeakMap state; serialized/cloned/request-created objects are not capabilities.

`recheckWorkspace` reads fresh authority. Future writes must ALSO use `mutationAuthorization(scope, requiredOperation)` inside their committing SQL and check its affected-row outcome. Owner-only writes require an owner grant explicitly; a preflight read alone does not prevent revocation races. The predicate checks active membership/current ownership and verified token expiry at commit. Later multi-statement business operations must not commit dependent writes if that guarded operation does nothing; their transaction design belongs to later stories.

## Identity-only D1 records and trusted provisioning

`identity.sql` defines only actors `(issuer, subject)`, workspaces with owner references, and active memberships. Unique/foreign-key constraints prevent duplicate external mappings and orphan relationships. It is not a LoT schema and has not been applied to a Cloudflare database.

`provisionTwoOwners` accepts exactly two distinct, trusted operator bindings, each containing issuer, Access subject, internal actor ID and workspace ID. Its six plain inserts execute in one D1 batch. It does not upsert/reassign existing identities, infer ownership from email, or accept a browser request. Duplicate or partially conflicting provisioning rolls back. No live bindings, subjects, accounts, credentials or career facts are stored in the repository.

For the eventual live setup, James must establish the Thingamajob Access application/team issuer and audience, then securely verify the two humans' Access subjects and supply private operator bindings: James -> James workspace; Erica -> Erica workspace. Do not paste tokens/private identifiers into Jira or public files. Access subjects can change if a user is removed/re-added; do not fall back to matching email or silently rebind. A changed subject must fail closed until trusted reprovisioning is deliberately approved.

Cloudflare Access authenticates; D1 authorizes. Access policy changes/logout and token validity are separate from Thingamajob membership revocation. Revoking the D1 actor/membership/workspace blocks subsequent checks/guarded writes even while an otherwise valid Access token remains unexpired.

No live Access policy, D1 resource, owner binding or protected deployment was provisioned in SCRUM-80. Wiring/deployment/resources are SCRUM-81; live owner verification remains necessary when those exist. The current public portfolio is not newly Access-protected by this commit.

## Verification

```powershell
npm.cmd run check:thingamajob
npm.cmd run test:thingamajob
```

Tests use real locally signed JWTs with fictional subjects and an in-memory SQLite database executing the identity SQL/query/predicate/batch behavior. They make no authenticated Cloudflare requests, do not contain James/Erica career facts and do not establish deployed D1 integration. Node's TypeScript execution follows the current Node 24 toolchain. A future Worker bundler must include jose; it is a root development dependency used by server code, not Angular.

The library logs nothing. Authentication/authorization failures return safe errors without tokens, subjects, email, private SQL or provider diagnostics. Trusted provisioning errors must remain operator-side; a future Worker boundary must never serialize raw infrastructure exceptions.

References: [Cloudflare JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [human versus service application tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/), [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).

## SCRUM-81 first entry slice (local checkpoint only)

`worker.ts` exports a standard Worker fetch handler with one read-only route:
`GET /api/thingamajob/workspaces/<workspaceId>/access`.
It verifies Access and queries D1 for active owner authority, then returns only
`{ "authorized": true, "operation": "owner" }`. It writes nothing and returns no identity, provider identifier, career content or evidence.

Server bindings required: `ACCESS_ISSUER`, `ACCESS_AUDIENCE`, and `IDENTITY_DB` (D1 with the SCRUM-80 identity tables and trusted owner provisioning). No request value supplies these bindings. Missing configuration returns 503; authentication/authorization failures return generic 403. Unsupported paths/methods return JSON 404/405. All responses are non-cacheable. The handler has no static asset binding, CORS grant, provisioning endpoint or logging.

The existing root `wrangler.jsonc` continues to deploy only the public portfolio. It does not deploy this entry point. A separate protected API deployment with separate test/live resources must be configured before a real check; do not point this standalone handler at the public portfolio's catch-all route. Its Access policy must cover the API path and alternative origins; JWT verification remains mandatory even for direct-origin requests. No deployment name, hostname, resource ID or owner subject has been guessed.

First live check, once that setup exists: through an authenticated human session, request the access route for that person's provisioned workspace and expect JSON 200; request the other owner's workspace and expect generic JSON 403. Repeat for the other owner. Missing/forged identity must not produce SPA HTML. Actual owner identifiers/tokens stay private. These results would supply SCRUM-80 live integration evidence organically; failures in identity/owner provisioning return to SCRUM-80 before expanding SCRUM-81.

Local verification: 28/28 identity/entry tests and strict TypeScript check pass. Entry tests use real signed fictional JWTs and the actual identity SQL in SQLite, not deployed Access/D1. No live integration success is claimed. The accepted entry checkpoint installed no new packages.

The next runtime setup slice adds pinned development-only Wrangler 4.150.0 and a separate test/live configuration template, with workers.dev/preview URLs disabled and no static assets. Its bundle-only dry run passes (39.15 KiB / 10.85 KiB gzip). Actual deployment/Access/D1/owner setup remains blocked on operator configuration; no Cloudflare resource or policy has been changed. See [runtime-setup.md](runtime-setup.md). R2, broader schemas, writes/retry/reconciliation and the rest of SCRUM-81 remain deferred.
