# SCRUM-184: DJP/SWV analytics contract and review

Prepared locally on `feature/scrum-184-swv-analytics`, based on production `3c49e0f`. No push, deployment or infrastructure change. The current 13-slide selection, persistent preload, page heroes and rejected homepage work are preserved.

## Agreed contract

Claude acknowledged these values through James's coordinating chat and recorded them in `C:/Dev/shadywhitevan.rocks/docs/handoff/2026-11-10-scrum-184-analytics.md`.

| Surface | Exact iframe URL |
| --- | --- |
| Home carousel | `https://shadywhitevan.rocks/?embed_source=djamespoer.com&embed_surface=home-carousel#swv-embed-stage` |
| Project/case-study hero | `https://shadywhitevan.rocks/?embed_source=djamespoer.com&embed_surface=project-hero#swv-embed-stage` |

The URL is selected once after client rendering. Active state, scrolling, consent, internal status and carousel cycles never mutate it. There are no UTMs, client/session IDs or consent/internal values in the URL, and no postMessage bridge. Context labels are not an authorization or consent signal.

SWV suppresses standalone GA in **every framed context**, including legacy/no-query and unknown query values, on initial startup and subsequent consent grants. Top-level SWV retains its existing region/consent rules, even when an embed-labelled URL is opened in a tab. SWV implementation remains Claude's work; no child files were changed by Larry.

## DJP event dictionary

| Event | Finite payload | Trigger |
| --- | --- | --- |
| `carousel_exposure` | `location=carousel`, `slide=shady-white-van`; normal safe helper context (`source_page`, `page_path`, `cta_location`) | Active Home SWV slide, foreground document, at least 50% intersection and rendered area on-screen, no hidden/inert/transparent ancestor; existing host/consent/internal/tag gates permit enqueueing. |
| `external_project_click` | `project=shady-white-van`, existing finite location and route context | Trusted primary click, keyboard activation or middle click on an actual HTTPS SWV outbound link in the public shell. Unknown/spoofed origins and synthetic events are ignored. Full outbound URL/query is never sent. |
| Existing `carousel_cta_click` | Unchanged | Internal Explore to the DJP case study, distinct from outbound SWV intent. |

Exposure deduplication is in the root PublicAnalytics service, once per parent Angular document lifetime, including SPA return visits. No browser storage or visitor/session identifier is added. Full reload begins a new parent-document lifetime. Suppressed/failed attempts do not consume the flag; a later eligible visible exposure can be queued. A successful queue call is not proof of server delivery. Readiness, load, preload and hidden slides are never exposure; exposure does not dispatch the interaction-activity signal. Reduced-motion availability can still count while visibly active. Page-view/session/config behavior is unchanged.

The existing Cookie Jar controls and unset-default-on / explicit-denial policy remain unchanged. No public traffic filtering or GA Admin setting is changed. Standard GA event counts require no new custom dimension; parameter breakdowns use raw export/DebugView or optional event-scoped `slide` / `project` registrations, not new high-cardinality fields.

## Failed fixture and correction

The original `0 !== 1` assertion was investigated before changing product behavior. The fixture's unconditional new-document hook ran inside an iframe's initial inherited `about:blank`, which shares the parent's storage. It re-marked the dedicated positive-test parent INTERNAL after the parent page view. PublicAnalytics correctly suppressed exposure.

The hook now seeds only actual DJP/SWV document hostnames. An explicit marker-state precondition catches inherited-storage contamination. The expected zero-before-reveal / one-after-visible assertions remain unchanged. Re-enabling the original hook with `SCRUM_184_NEGATIVE_FIXTURE=1` fails as expected with `'1' !== null` at that guard.

The fixture also assumed `scrollTo(bottom)` proved that the slide was off-screen while the child was still initializing. SWV's existing startup anchor can move the parent. Checks now wait for the child load/pin/fonts, assert actual off-screen geometry, then assert zero exposure. Hero navigation similarly waits for readiness before a trusted keyboard outbound action. These are fixture ordering fixes, not product visibility/consent exceptions.

## Verification and reproduction

- Full focused suite rerun after correction: **75/75 passed across six files**.
- Production build: **passed**, 70 prerenders, 488.52 kB initial / 123.91 kB estimated transfer. Hard budgets pass; existing Home/Footer/Rigby soft CSS and module-type warnings remain.
- Joint local-artifact browser scenarios: four DJP parent cases and eight SWV child cases. Parent cases cover desktop/mobile allowed, saved denial then grant, INTERNAL suppression, zero preload exposure, active-offscreen zero, visible-once, repeated carousel cycles, unchanged child document/iframe/window/URL, SPA return deduplication, exact route page-view counts, separate trusted outbound intent and no child GA/cookie issue. Child cases cover standalone granted/denied, US/GB defaults, top-level embed labels, framed legacy/unknown values and later grant through the framed cookie page.
- Claude's separate durable child receipt reports **21/21 real-Chrome cases**, collector interception, real GA cookie behavior and an untouched-child negative control failing as expected. Those are Claude's results, not a DJP rerun claim.

```powershell
npm test -- --watch=false --ts-config scripts/review/tsconfig.scrum-184.spec.json --setup-files scripts/review/internal-test-setup.ts --include '**/public-analytics.spec.ts' --include '**/public-event-parameters.spec.ts' --include '**/swv-analytics.spec.ts' --include '**/carousel-exposure.spec.ts' --include '**/swv-slide.spec.ts' --include '**/carousel.spec.ts'
npm run build
node scripts/review/verify-scrum-184.mjs
```

The joint harness serves local production artifacts at intercepted virtual production origins. It starts profiles INTERNAL. Dedicated positive cases explicitly unmark only after the real tag bootstrap has been suppressed and a memory-only gtag stub is installed; no Google collector request leaves the harness. Normal INTERNAL cases stay marked. Standalone expected GA script requests are also intercepted. `SWV_DIST` can select another reviewed child build; default is `C:/Dev/shadywhitevan.rocks/dist`. Evidence: ignored `tmp/scrum-184/`; sanitized summary beside this document.

## Pending production acceptance

No deployment is authorized yet. Child release must precede DJP release so the legacy iframe is silent during rollout. Production cross-origin collector evidence and a fresh Lighthouse Best Practices 100 result remain required before story closure; neither is claimed from local checks.

Cloudflare's automatic SWV Web Analytics beacon remains edge-injected and can count preloaded embeds as infrastructure page loads. GA suppression fixes the reported GA cookie problem; it does not eliminate those separate Cloudflare counts. Claude prepared, but did not apply, a framed-aware manual-beacon option and an automatic-setup infrastructure switch. James's separate decision is required. No Cloudflare setting, DNS, route, beacon option or points ledger has been changed here.
