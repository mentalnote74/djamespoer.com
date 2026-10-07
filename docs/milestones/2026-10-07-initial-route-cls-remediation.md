# Initial-route CLS remediation

## Acceptance and provenance

- Sprint: SCRUM Sprint 0.
- Acceptance record date: 2026-10-07; this is not an asserted measurement capture date/time.
- Exact accepted production commit: `6facda597f1a21007384cc86f6fcfbbf04343398`.
- Production target: <https://djamespoer.com/>.
- Deployment: James confirmed that the exact commit successfully built and deployed through Cloudflare.
- Measurement source: James's reported browser measurements and production acceptance, recorded in the engineering handoff. These are not agent-run audits.
- Measurement capture dates/times and timezone: Not captured in the available measurement record.

## Measurements

| Measurement               | Baseline production | Post-fix local optimized build | Final production |
| ------------------------- | ------------------- | ------------------------------ | ---------------- |
| Lighthouse Performance    | 92                  | 100                            | 99               |
| Lighthouse Accessibility  | Not captured        | Not captured                   | Not captured     |
| Lighthouse Best Practices | Not captured        | Not captured                   | Not captured     |
| Lighthouse SEO            | Not captured        | Not captured                   | Not captured     |
| Agentic Browsing          | 2/3                 | 3/3                            | 3/3              |
| FCP                       | 0.5 s               | 0.5 s                          | Not captured     |
| LCP                       | 0.7 s               | 0.8 s                          | Not captured     |
| TBT                       | 0 ms                | 0 ms                           | Not captured     |
| CLS                       | 0.17                | 0                              | Not captured     |
| Speed Index               | 0.5 s               | 0.5 s                          | Not captured     |
| axe issues                | Not captured        | Not captured                   | 0                |

The baseline was a clean Incognito Lighthouse Desktop production run. Its exact deployed SHA was not captured in the available evidence. The post-fix measurement used the local optimized production build of the blocking-navigation change subsequently committed as the accepted SHA above; it was not a development-server measurement. Final production values are limited to the supplied acceptance results.

Final axe tool/version, configuration and standard: **Not captured**. SCRUM-50 identifies WCAG 2.1 AA for its initial axe evidence requirement, but that does not establish the configuration of this final scan.

## Finding and remediation

A separate production Performance trace recorded approximately 0.17014 CLS: the application shell/header/footer painted before lazy Home content arrived, then Home insertion pushed the footer out of the viewport. This trace corroborates the rendering sequence; it is distinct from the Lighthouse baseline run.

The fix enables Angular blocking initial navigation so initial bootstrap waits for the selected lazy route. Home and proof routes remain lazy-loaded. The local optimized-build measurement recorded CLS 0 and no visible shell/footer-only transition. Production acceptance passed with Performance 99, Agentic Browsing 3/3 and axe 0 issues. Final production numeric CLS was **Not captured**, so production CLS 0 is not asserted.

## Artifacts and gaps

No Lighthouse exports, axe exports or acceptance screenshots were available in the inspected repository. None were created or reconstructed for this record. Two baseline trace files remain untracked under `traces/`; their raw contents are not included in this archive.

Missing final-production metrics, exact measurement capture metadata and scan configuration remain **Not captured**. A future capture would be a new measurement, not a reconstruction of this acceptance run.

This record completes the documentation/evidence archive portion for this shipped remediation. It does not complete SCRUM-50 as a whole: automated sprint-close collection and incorporation into normal Scrum acceptance criteria/workflow remain outstanding.
