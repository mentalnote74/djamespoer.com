# SCRUM-81 remote TEST bootstrap

Remote clients use their own device and Cloudflare Access session:

`https://api-test.djamespoer.com/api/thingamajob/test/start`

After Access login, **Continue and check access** sends a same-origin POST to
`/api/thingamajob/bootstrap`. The Worker verifies the signed human assertion against
the configured TEST issuer/audience; only that subject can create its own actor,
workspace and owner membership. Existing active owners are reused. Revoked or
incomplete ownership is never repaired automatically. No request body, email,
actor/workspace ID or role establishes authority. The three inserts are one D1
transactional batch, with token-expiry and foreign-key preconditions; unique
external-identity mappings prevent duplicate actor creation on retries.

The response contains only the caller's opaque workspace ID, not provider identity
or other owners' IDs. The page then calls the real workspace-access GET route and
`/api/thingamajob/test/reference-access`. The latter resolves the preselected James
reference workspace from a server-only binding and applies the same D1 owner check.
Erica should see owned JSON 200 and reference JSON 403, with no SPA fallback. James
will see reference 200 because it is his workspace. The reference route grants no
extra authority and exposes no workspace ID. A shared email/login is not an
independent client test.

The browser does not read, copy, store, log or relay an Access cookie. Its normal
HttpOnly session is handled by Cloudflare/the browser. The page has no storage,
third-party scripts or identity-entry fields. POST requires the exact TEST Origin
and rejects cross-site requests. Native controls/status and nonce CSP support the
small TEST acceptance surface; this is not the final product UI.

Deployment gates: `TEST_BOOTSTRAP_ENABLED=true` AND the exact TEST HTTPS hostname.
Default/LIVE/alternate-host bootstrap routes return JSON 404. TEST also needs
`TEST_REFERENCE_WORKSPACE` as a server-only binding selected from the existing
trusted James D1 owner record. Do not put its value or Access/private identifiers
in Git, Jira or logs. No Access policy/IdP changes are required. LIVE is untouched.

This explicitly authorized TEST bootstrap creates account/workspace metadata only;
it does not promote career truth, ingest evidence or implement R2/LoT/UNKNOWN work.
The reusable subject-to-actor/workspace operation has no James/Erica name logic and
supports future clients, but enabling production onboarding requires a separate
decision. The old local-cookie operator handoff is not the client model.

Validation: signed fictional identities plus the real identity SQL prove separate
owners, both cross-workspace denials, idempotency/concurrent requests, rollback,
revocation, spoofed request values, CSRF and TEST-only gating. Installed Chrome with
fully intercepted fictional responses verifies desktop/narrow flow, axe and reflow.
These do not prove remote Erica's identity or real browser acceptance; that remains
pending her own TEST login and click. No real cookie handoff is needed.
