# Accepted content and history-refresh shipment

## Provenance

- Acceptance/record date: 2026-10-09.
- Exact deployed SHA: `08e134c34d51035c129e261274de4953db252f5f`.
- Production target: <https://djamespoer.com/>.
- Sprint: Not captured in the supplied acceptance evidence.
- Screenshot capture time/timezone: Not captured. James reports both production screenshots were captured after the successful Cloudflare retry.
- Source: James's production acceptance report; screenshots remain with James/DTS and have not been inspected or copied by the agent.

## Production quality results

| Lighthouse measure              | Production result                 |
| ------------------------------- | --------------------------------- |
| Performance                     | 99                                |
| Accessibility                   | 100                               |
| Best Practices                  | 100                               |
| SEO                             | 100                               |
| Agentic Browsing                | 3/3                               |
| FCP, LCP, TBT, CLS, Speed Index | Not captured in supplied evidence |

The earlier local optimized-build Performance 100 / CLS 0 result is a separate environment and measurement. It is not substituted for this production run.

axe DevTools: axe-core 4.13.0; WCAG 2.1 AA; Best Practices ON.

| axe count                                  | Result        |
| ------------------------------------------ | ------------- |
| Total / Automatic / Guided / Manual issues | 0 / 0 / 0 / 0 |
| Critical / Serious / Moderate / Minor      | 0 / 0 / 0 / 0 |

Zero reported issues does not establish completion of every possible manual accessibility check.

## Screenshot destinations - files pending

- `2026-10-09-production-acceptance/2026-10-09-08e134c-production-lighthouse.png`
- `2026-10-09-production-acceptance/2026-10-09-08e134c-production-axe-devtools.png`

These paths are reserved for the exact original screenshots; no image files were fabricated. After copying, inspect for private browser/account information before staging. If originals contain sensitive information, stop for a publication decision rather than altering the evidence. Artifact hashes remain pending actual receipt. This explicit archive request authorizes repository destinations for these two artifacts; it does not establish a replacement for the wider Jira-heavyweight-evidence convention.

## Cloudflare operational evidence

The initial attempt for this exact SHA failed during Installing with only
`Failed: error occurred while installing tools or dependencies` and no actionable underlying stderr. Building and Deploying never started; SCRUM-63 refresh therefore did not run on that attempt.

James reports an unchanged Retry Build succeeded, with no changes to source, SHA, dependencies, Node configuration, build configuration or Cloudflare variables between attempts. The underlying cause of the first failure remains unknown.

For an unexplained infrastructure/tool-install failure, retry the identical build once before changing code/configuration. If that retry fails, stop retrying and diagnose. Do not automatically retry application/build/test failures with actionable errors. See the [build runbook](../../src/app/components/deployment-history/README.md#cloudflare-build-failure-runbook).

## SCRUM-63 deployed history acceptance

James confirms the refreshed production grid is live with 29 pipeline attempts and the previously missing Oct. 7 history. The failed `08e134c` attempt remains separate from its successful retry. The retry currently displays `In progress · Stage unavailable`: the snapshot was generated while that build was executing, matching the documented one-build lag rather than a fabricated final outcome.

This establishes that the stale Oct. 6 history was replaced in production. No exact snapshot timestamp or hash was supplied for this acceptance record.

The documentation shipment's normal main-build refresh should observe the earlier successful retry after completion and publish its final source-reported state. That subsequent state update and this new shipment's build/deployment remain pending verification; no future outcome is claimed.
