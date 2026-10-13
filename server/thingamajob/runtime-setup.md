# SCRUM-81 read-only runtime setup

This is a separate API Worker, not a replacement for the public portfolio Worker.
No R2, career-data tables or application writes are included. The commands below
are operator steps, not a record of completed deployment.

## Private configuration

1. Confirm separate test/live API hostnames and the Cloudflare account. Authenticate
   the operator with `npm.cmd exec wrangler -- login`; never paste tokens into chat.
2. Copy `server/thingamajob/wrangler.example.jsonc` to
   `server/thingamajob/wrangler.private.jsonc` (ignored). Replace all `REPLACE` values
   with actual configuration. Do not commit it. Test and live must use different
   D1 databases and Access applications. No public portfolio routes/assets are bound.
3. Create the two D1 databases through Cloudflare and bind each as `IDENTITY_DB`.
   Apply `identity.sql` once to each new empty database. Do not reapply it to an
   existing database or overwrite its data. From the repository root:

   ```powershell
   npm.cmd exec wrangler -- d1 execute IDENTITY_DB --remote --env test --config server/thingamajob/wrangler.private.jsonc --file server/thingamajob/identity.sql
   ```

   Use `--env live` only for the explicitly selected live database after test setup.

4. Configure a Cloudflare Access self-hosted application for each entire API hostname,
   with an explicit human allow policy for the intended owners, no public bypass and
   no service-token policy. Keep workers.dev and preview URLs disabled. Confirm DNS
   and Access protection before deployment. Do not protect/change the public portfolio.
5. Set `ACCESS_ISSUER` and `ACCESS_AUDIENCE` separately for each environment via
   Wrangler secret prompts (no values in shell arguments/logs):

   ```powershell
   npm.cmd exec wrangler -- secret put ACCESS_ISSUER --env test --config server/thingamajob/wrangler.private.jsonc
   npm.cmd exec wrangler -- secret put ACCESS_AUDIENCE --env test --config server/thingamajob/wrangler.private.jsonc
   ```

   These are application configuration, not identity assertions supplied by users.
   Bind the exact Access application audience/team issuer, not a guessed hostname.

6. Through the trusted operator process, verify James and Erica's actual Access
   subjects independently. Provision two distinct actor/workspace/membership sets in
   the appropriate D1 database using the SCRUM-80 atomic `provisionTwoOwners` contract.
   No email-based automatic ownership, public provisioning endpoint or real subject
   fixtures. Do not paste subject bindings into chat, Git or Jira. Provisioning SQL
   and any private operator inputs remain in an ignored private location. This step
   is not complete merely because the schema was applied.

## Bundle, deploy and exercise

```powershell
npm.cmd exec wrangler -- deploy --dry-run --env test --config server/thingamajob/wrangler.private.jsonc --outdir tmp/thingamajob-worker
npm.cmd exec wrangler -- deploy --env test --config server/thingamajob/wrangler.private.jsonc
```

The default root `wrangler.jsonc` is never used for these commands. Repeat for live
only after the configured test path passes; this document does not authorize a
guess at the account, hostname or owner subjects.

Through each owner's real authenticated browser session, open
`https://<API hostname>/api/thingamajob/workspaces/<their workspace ID>/access`:
expect JSON 200 with `authorized: true`. Using the other workspace ID must produce
generic JSON 403 for each owner. No session must be challenged by Access, not reach
an authorized result. Confirm no alternate public workers.dev/preview origin exists;
the Worker additionally rejects missing/forged assertions if an origin is reachable.
Do not publish tokens, raw headers, private IDs or unfiltered provider output as evidence.
Record environment, source SHA, outcomes and whether the two real owners were checked.

Only success through that real path validates SCRUM-80 live integration. If signature,
owner mapping or membership checks fail, stop and diagnose SCRUM-80; deployment/binding
setup failure remains SCRUM-81. Do not move on to writes or R2.

References: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
[D1 setup](https://developers.cloudflare.com/d1/get-started/),
[Access self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).
