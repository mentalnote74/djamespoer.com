# Public conversion measurement

Three intentional-activation events share the existing deferred GA tag:

| Event              | Trigger                                           | Parameters                                              |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| `resume_download`  | Activate the existing public resume download link | `page_path`, `cta_location`, `resume_id=public-current` |
| `contact_click`    | Activate a mail contact link                      | `page_path`, `cta_location`                             |
| `thingamajob_open` | Activate the public Thingamajob route link        | `page_path`, `cta_location`, `destination_path`         |

These count intent, not completed downloads, contacted recruiters, unique humans
or protected-workspace usage. `thingamajob_open` measures a deliberate entry CTA
separately from passive page views, and identifies the originating CTA. No extra
`case_study_open` is added: case studies already have distinct public route URLs;
use their page views rather than adding an unproven duplicate measure. GA enhanced
SPA settings/report quality could not be independently verified. Existing page
tagging remains unchanged; no extra manual page_view is added and no GA account
configuration is modified.

Custom event parameters use fixed identifiers and public route allowlists, never
anchor text, destination email, full URLs, URL query/hash values, form text,
resume contents, job descriptions or LoT evidence. The existing GA tag still
controls its normal automatic page/event collection; these hooks do not claim
to audit all property-level enhanced-measurement settings or historic telemetry.

Only `djamespoer.com` and `www.djamespoer.com` initialize GA. Localhost, previews,
API hosts and Erica's site do not initialize it. After this release ships, visit
`https://djamespoer.com/?internal=1` once in each internal browser/profile to
persist an opt-out for that origin. `?internal=0` clears it. WWW and apex origins
have separate browser storage. Storage unavailable fails closed for analytics.
This marker is not authorization and does not classify bots. Synthetic DOM
activation is ignored; keyboard and ordinary/middle-click intent remain usable.
No navigation waits for telemetry or a provider callback.

## Historical resume downloads

No trustworthy count was recovered from accessible evidence. No connected GA
report, historical request-log dataset or authenticated analytics browser surface
was available. The existing source contains page tagging but no explicit resume
conversion hook. GA may already contain enhanced-measurement `file_download`
events if that setting was enabled; absence of report access is not evidence of
zero downloads. Those would count link activations, not proven file completion.
Named `resume_download` measurement begins when this release ships. Do not infer
human recruiter/download counts from Cloudflare unique visitors or page views.

## Secure manual release configuration

The existing `deploy:production` command requires separate read-only history
configuration in the local release process, before building. The token is not a
Worker secret/binding and must never be placed in Angular environment files,
public assets, wrangler.jsonc, Git, chat or a deployment message.

1. Cloudflare dashboard: select the account owning `djamespoer-com`; copy its
   32-character account ID (not a zone ID).
2. User Profile > API Tokens > Create Token > custom token. Grant Account >
   Workers Scripts > Read, restricted to that specific account. No write, DNS,
   Access or email permission is needed for history acquisition.
3. In local PowerShell running as James, enter the values without putting the
   token in command history:

```powershell
$releaseDir = Join-Path $env:LOCALAPPDATA 'djamespoer-release'
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
[pscustomobject]@{
  AccountId = Read-Host 'Cloudflare account ID'
  HistoryReadToken = Read-Host 'Deployment-history read token' -AsSecureString
} | Export-Clixml (Join-Path $releaseDir 'history-read.clixml')
```

On Windows, this encrypts the SecureString token using the local user's DPAPI
protection. Run the release under the same Windows user/machine. Runtime loading:

```powershell
$releaseConfig = Import-Clixml (Join-Path $env:LOCALAPPDATA 'djamespoer-release/history-read.clixml')
$env:CLOUDFLARE_ACCOUNT_ID = $releaseConfig.AccountId
$env:DEPLOYMENT_HISTORY_READ_TOKEN = [System.Net.NetworkCredential]::new('', $releaseConfig.HistoryReadToken).Password
# Run only inside the isolated release worktree, using existing Wrangler login:
npm.cmd run deploy:production
# Close this terminal afterward to discard the process environment.
```

The release process may instead consume these exact variables from an already
configured process/Windows user environment. Never substitute Wrangler's OAuth
deployment credential for the dedicated history reader. Existing deployment
authorization remains separate. A future Cloudflare Builds run needs analogous
build-only environment configuration, not a browser/runtime binding; no CI or
main-branch change is part of this release.

References:

- https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/
- https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
- https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/EnhancedMeasurementSettings
