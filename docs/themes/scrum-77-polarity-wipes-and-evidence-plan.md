## Approved polarity-wipe decision — 2026-10-12

Coach resolved the unsafe polarity boundaries with viewport wipes between two complete compliant theme states. This supersedes the earlier proposed simple endpoint-hop treatment for normal motion; reduced motion retains the atomic change. The seven existing static anchor palettes remain frozen. Teetotaler remains the normal/default application theme.

| Boundary                      | Locked treatment                                                                   | Direction                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Tequila Sunset → Rum Runner   | Horizontal horizon wipe; complete Rum Runner advances over complete Tequila Sunset | Initial left-to-right direction proposed; direction may be tuned in human visual acceptance |
| Bloody Mary → Tequila Sunrise | Distinct vertical horizon-rise wipe                                                | Sunrise rises bottom → top over complete Bloody Mary                                        |

Both sides must retain their own complete foreground/background/surface/control state. Clip/reveal complete endpoint presentations; do not interpolate color tokens, crossfade foregrounds/backgrounds, invent intermediate palettes, or pass through the known near-1:1 ranges. Do not make Sunrise merely a reversed Sunset animation. Endpoint presentations must include opaque matching surfaces so transparency cannot mix text from one theme with surfaces from the other.

Wipe duration must be configurable through an explicit supported configuration option, with **400ms default**, rather than an unchangeable animation literal. With prefers-reduced-motion: reduce, bypass animation entirely and apply the final compliant theme atomically. Preserve existing layout, focus, keyboard behavior, one main landmark and theme-selection semantics. Any visual endpoint copies/snapshots must not duplicate interactive controls or accessible landmarks in the accessibility tree.

### Mandatory sequence / evidence gate

James approved human visual acceptance 7/7, recorded in comment 10062. This does not establish theme-specific Lighthouse or axe acceptance. Current bootstrap initializes Teetotaler; a reload-based scan can therefore measure the baseline instead of the intended theme.

There is no repository browser runner to repair; existing rendered inspection is manual. Establish a new approved capability that selects and verifies the intended implemented theme after navigation and before capture, and records the theme with each report. Verify root data-theme, computed semantic colors and active ThemeState/menu state; fail the capture if those disagree. Demonstrate all seven static themes plus default Teetotaler, with reload behavior understood. Lighthouse settings alone must not be assumed to preserve runtime theme state.

No Living Mode or wipe implementation may begin until that static evidence gate is legitimately green. No living engine may conceal, substitute for or bypass it. No new living-mode menu item is authorized by this decision.

### Eventual implementation test matrix — not yet implemented

- Sunset → Rum Runner selects the horizontal treatment; initial direction configuration is honored.
- Bloody Mary → Sunrise selects bottom-to-top vertical rise, distinct from Sunset reversal.
- Default duration is 400ms; configured duration is honored; invalid duration handling is explicit.
- Intermediate animation frames show only complete endpoint presentations, without token interpolation or crossfading.
- Reduced motion invokes an atomic change and creates no animated wipe.
- Completion produces the correct ThemeState, root selector, computed endpoint colors and active menu indication.
- Focus, keyboard access, landmark count and accessibility tree remain intact throughout; visual endpoint copies cannot become extra tabbable/announced content.
- Unsupported rendering capability, cancellation/rapid re-selection and interrupted completion leave a correct compliant final state, with an atomic fallback.
- Browser verification samples start/middle/end frames for both directions and checks effective text/surface contrast and viewport coverage; endpoint contrast tests alone cannot prove compositor correctness.

## Evidence capability correction and minimal proposal

No repository Lighthouse/axe browser runner exists. Existing capabilities are Sass/token contrast tests, Angular/Node regressions, production compilation, James's approved 7/7 human visual review and manual Chrome DevTools/axe inspection. No theme-specific automated browser scan is claimed. Installed Chrome was found at C:\Program Files\Google\Chrome\Application\chrome.exe; browser-control surfaces exposed to this agent are unavailable. Browser executable presence alone is not scan evidence.

The manual navigation-mode Lighthouse workflow can bootstrap back into Teetotaler. This is a state-establishment problem in the manual procedure, not a missing historical runner defect. A new deterministic capability needs approval before adding tooling.

### Historical proposal (before tooling approval)

One first-party Node script, scripts/theme-evidence.mjs, plus configuration/tests. Development-only dependencies: puppeteer-core, lighthouse and axe-core, with compatible versions selected and pinned in package-lock.json. Reuse installed Chrome in an isolated temporary profile; no extra browser download, production bundle dependency, product state override or full end-to-end testing framework is needed.

For each requested theme/route/viewport:

1. Navigate normally and verify default Teetotaler bootstrap.
2. Open the existing Theme disclosure, select its real native button, wait for root selector, pressed menu state and computed body/token colors to agree with the expected generated palette. Do not mutate root data-theme directly.
3. Close the menu for the content scan; perform separate open-menu scans to include otherwise hidden controls. At narrow width, use the real mobile disclosure.
4. Observe root theme changes throughout the capture. Verify expected root ID, pressed state and computed colors immediately before and after both scans. Fail rather than archive success if identity disagrees, navigation/reload occurs, or colors drift.
5. Run axe-core in the actual rendered page with explicit WCAG 2.1 A/AA plus best-practice configuration. Preserve violations, incomplete/manual-review items, tool version and scan settings. Do not manufacture DevTools Guided/Manual zero counts from axe-core output.
6. Run Lighthouse user-flow snapshot mode on the same selected page state. Snapshot reports do not provide a navigation Performance score, FCP/LCP/TBT/Speed Index. Mark unavailable metrics Not captured. Keep ordinary navigation Performance measurement separate as Teetotaler baseline; per-theme cold-load Performance would require a separately approved initial-theme establishment mechanism.
7. Record requested/observed theme, computed colors, active-menu indication, route, viewport, motion preference, target/environment, exact source/deployed SHA with verification provenance, browser/tool versions, actual capture time and report hashes. Never infer deployed SHA solely from local HEAD.
8. Save raw reports/screenshots under already-ignored tmp/theme-evidence/. Keep heavyweight acceptance artifacts in Jira and compact factual ledgers in Git. No automatic Jira publishing is part of this first capability.

Initial proof: one non-default theme on Home, then Teetotaler return. Expand to all eight available themes on Home, About, one Work case study and one Perspective, at desktop and approximately 400px width. Include open-menu states on Home. Record reduced-motion emulation for reproducible static scans; this does not substitute for later normal-motion wipe acceptance.

### Proposed commands (future; do not currently exist)

After approved tooling installation and script implementation:

```powershell
npm.cmd run evidence:themes -- --url https://djamespoer.com/ --themes mojito --routes / --viewports desktop --expected-sha "VERIFIED_DEPLOYED_SHA" --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm.cmd run evidence:themes -- --url https://djamespoer.com/ --themes all --routes /,/about,/work/exl,/engineering --viewports desktop,narrow --expected-sha "VERIFIED_DEPLOYED_SHA" --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Proposed npm entry: evidence:themes -> node scripts/theme-evidence.mjs. Configuration: desktop 1440x900, narrow 400x900, explicit motion preference, axe standard/tags, Lighthouse snapshot/accessibility configuration and output directory. Optimized local-build testing can use the same script with the existing production-build server's URL; it must remain distinguished from final production evidence.

Immediate manual alternative: select a theme, verify root data-theme/computed colors/pressed option in DevTools, then use Lighthouse Snapshot / Analyze page state instead of navigation mode, verifying identity again afterward. This is a repeatable interim procedure, not the requested permanent repository capability.

Recommended ownership: the minimal theme-identity/scan capability belongs in SCRUM-77 because it unblocks its static evidence gate. Recurring sprint-close orchestration, artifact upload to Jira and generalized quality automation remain SCRUM-50. Do not create a supporting issue or expand automation scope without direction.

Potential files after approval: package.json, package-lock.json, scripts/theme-evidence.mjs, its configuration/tests, this operator plan and a scoped AI_HANDOFF.md update. Application templates, ThemeState, approved palettes, storage behavior and routes should not need changes.

References:

- [Lighthouse user flows and snapshot limitations](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md)
- [Puppeteer-core / installed-browser setup](https://pptr.dev/guides/installation)
- [axe-core API and scan configuration](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)

Historical proposal checkpoint: this was a proposal and documented wipe decision only. No dependencies, browser runner, persistence/URL override, Living Mode or wipes have been implemented. No theme-specific rendered accessibility gate has passed yet.

## Implemented evidence runner - 2026-10-12

Tooling approved and implemented as scripts/theme-evidence.mjs, with Node regression coverage. Development-only exact versions: puppeteer-core 25.13.0, lighthouse 13.5.0, axe-core 4.14.0. Uses installed Chrome 155.0.8059.39 in an owned temporary profile; no downloaded browser. Runtime application, theme defaults, palettes, routing and storage behavior are unchanged.

The supported npm command is now evidence:themes. Required --url is an origin; --expected-sha must be a full lowercase 40-character Git SHA, not the literal placeholder. Optional --themes defaults to all generated/runtime-matched themes; --routes defaults to /,/about,/work/exl,/engineering; --viewports defaults to desktop,narrow (1440x900 and 400x900). --chrome accepts an installed executable path; the standard Windows Chrome location is the default. The profile is never the personal browser profile and is removed after capture. Home automatically receives closed-menu and open-Theme-menu scans; other routes receive a content scan. Default matrix: 80 states. This does not audit every carousel slide or every disclosure/focus/hover state.

Theme establishment uses real mobile/Theme controls and native choices, never direct root mutation or a test-only application override. Five identity checkpoints per completed scan: before/after axe, before/after Lighthouse, after report creation. All semantic root tokens, computed body foreground/background, pressed option, route and single-main structure are checked. A MutationObserver with old values detects transient theme changes, and navigation is rejected. Equivalent CSS numeric/hex/RGB serialization is normalized without accepting changed values. Snapshot mode and accessibility score presence are verified.

Results go to already-ignored tmp/theme-evidence/<UTC-capture-time>/: JSON/Markdown summaries, raw axe and Lighthouse JSON, Lighthouse HTML and failure screenshots when available. Reports include actual versions/times, source checkpoint/dirty tracked paths, requested SHA provenance, runner SHA-256 and report hashes. Expected SHA is an operator-supplied assertion, not independent Cloudflare deployment attestation; local targets are explicitly labeled local rendered targets (optimization must be established by the operator). No uploads to Jira, recurring sprint automation or production asset publication is implemented.

Exit semantics: PASS (0) requires demonstrated stable identity, zero axe violations, no incomplete items and Lighthouse snapshot accessibility 100. FAIL (1) stops immediately on identity uncertainty, navigation, confirmed axe violations or a non-passing Lighthouse snapshot. REVIEW_REQUIRED (1) preserves incomplete/manual-review items without claiming clean accessibility; it may collect the remaining matrix if no confirmed violation occurs. A score of 100 does not override axe incomplete items. No Guided/Manual DevTools counts or navigation Performance/loading metrics are fabricated.

### Actual local execution

Optimized local build at http://127.0.0.1:4173/, UI source checkpoint 3c600bb41e5b6bc901b60160506b5875df87d5cf. Full matrix captured starting 2026-10-12T21:20:54.274Z (America/New_York 5:20:54 PM). All eight available themes, four routes, desktop/narrow widths, Home closed/open Theme states: 80/80 identities verified, zero axe violations, Lighthouse snapshot accessibility 100 in 80/80. 48 routed states PASS; 32 Home states REVIEW_REQUIRED. Raw local evidence: tmp/theme-evidence/2026-10-12T21-20-54-274Z/.

All Home reviews are the same color-contrast incomplete rule: axe cannot determine the construction image background behind .hero__updated, the two secondary hero links and the primary Resume link (messageKey imgNode). This is not a measured 0:1 contrast ratio or a confirmed approved-palette defect. No palette or Hero styling was changed. Manual/rendered image-background contrast adjudication remains necessary. The static evidence gate therefore remains open; wipes/Living Mode remain blocked.

Final-report smoke on /about desktop for Teetotaler and Mojito captured at 2026-10-12T21:27:41.713Z: 2/2 PASS, five identity checkpoints each, axe zero violations/incomplete, Lighthouse accessibility 100. This proves default bootstrap and non-default selection without the unrelated image-review item. A prior smoke covered Mojito Home in both menu states. One early fail-closed diagnostic caught optimized-build CSS serializing opacity 0.6 as .6; numeric-equivalence normalization and its regression assertion corrected this tooling issue before the full matrix.

Validation: runner tests 3/3, Header/ThemeState 12/12, full Angular 224/224, Node 164/164, production build passed (303.56 kB / 80.96 kB estimated transfer). Full Node gate rerun after final reporting changes; formatting/whitespace passed. Existing jsdom canvas warnings remain; npm also reported four native install-script approval warnings and zero vulnerabilities. No toolchain/allowScripts configuration was altered.

Production matrix has not been executed: a verified current Cloudflare deployed SHA is still needed. Local/origin HEAD alone is not production attestation. Tooling can ship independently, but these results do not complete final production static-theme acceptance and do not authorize Living Mode or wipes.

Final-byte runner smoke: Mojito /about narrow, 2026-10-13T01:25:55.415Z (America/New_York October 12, 9:25:55 PM), PASS: stable identity, axe 0 violations/incomplete, Lighthouse snapshot accessibility 100. Artifact directory tmp/theme-evidence/2026-10-13T01-25-55-415Z/. This followed metadata-only finalization; the full 80-state matrix above remains local optimized-build evidence, not production acceptance.

## Coach acceptance and next play

Coach accepted the static evidence checkpoint: 80 verified identities, zero axe violations, Lighthouse snapshot Accessibility 100 throughout, 48 PASS and 32 image-background REVIEW_REQUIRED. The incomplete items remain faithfully recorded; they are not confirmed failures and no further investigation is required for this checkpoint. This decision supersedes the earlier open-gate statements above. Complete raw evidence remains in ignored tmp/theme-evidence/. Final production evidence must still identify the verified deployed SHA.

Living Mode is now authorized. Canonical order: Tequila Sunrise -> Mojito -> Piña Colada -> Mai Tai -> Tequila Sunset -> Rum Runner -> Bloody Mary -> Tequila Sunrise. Teetotaler remains the default outside this cycle. Ordinary approved interpolation paths are accepted by design contract; arbitrary intermediate contrast sampling is not an acceptance requirement.

Anticipate each polarity boundary while the outgoing state is still compliant. Replace Sunset with Rum Runner by a horizontal wipe, and Bloody Mary with Sunrise by a distinct bottom-to-top vertical wipe. Never enter the unsafe polarity interpolation. Resume slow interpolation after each complete-state replacement. Target approximately four hours per cycle, without timing compensation or holds to reach precisely 14,400 seconds. Configurable wipe duration defaults to 400ms; verify with controlled time, not real-time waiting.

Both wipes must inherit the Living Mode onboarding/configuration motion profile, rather than introducing another preference architecture. Repository and SCRUM-77 inspection found no such existing onboarding/profile implementation or approved configuration contract. This integration detail requires clarification before motion behavior is invented. Existing reduced-motion behavior remains unchanged while that question is pending. No Living Mode or wipe implementation is claimed in this tooling checkpoint.

## Living Mode implementation — SBS correction

SBS explicitly withdrew the nonexistent onboarding/profile requirement above. It was not Coach's requirement. No onboarding, motion-profile subsystem, permission model, storage, or additional control panel is implemented.

Theme navigation now offers Dusk-to-Dusk. ThemeState keeps selection separate from the current anchor selector: its pressed menu item remains Dusk-to-Dusk while root data-theme identifies the current static anchor. Teetotaler remains initial/default. Selecting any static theme cancels the timer/transition, clears temporary semantic overrides, and restores its unchanged generated palette. The engine is a lazy import; no shared component knows the interpolated pair.

Sass remains authoritative. At activation, the engine synchronously reads generated anchor custom properties, restores the initial selector before paint, then interpolates semantic RGB colors once per second outside Angular. Non-color values follow the anchor. No duplicated authored palettes, device detection, persistence, or production test hooks were added. The browser's monotonic clock drives progression, so background timer throttling cannot accumulate schedule drift.

Five safe segments last 48 minutes each. Sunset -> Rum Runner and Bloody Mary -> Sunrise are separate 400ms stages, giving an approximately four-hour cycle (four hours plus 800ms as a consequence, not a precision requirement). The wipe starts at the exact approved outgoing endpoint, before any interpolation toward the opposite polarity. There is no unsafe polarity segment to sample or expose. The next slow segment resumes after the snapshot completes. Explicit internal timing parameters support controlled tests and later tuning without configuration infrastructure.

Native same-document View Transitions capture complete root presentations. Incoming snapshots are opaque with normal blending and clip-path reveals: sunset left-to-right, sunrise bottom-to-top. UA crossfades are disabled. Snapshot pseudo-elements add no interactive DOM, duplicate IDs, or accessible landmarks. Unsupported/failed capture performs an atomic compliant hop. Existing prefers-reduced-motion requests suppress interpolation and snapshots, advancing anchors atomically; preference changes and rapid static reselection safely cancel motion.

Controlled-time tests cover sequence, slow progress, both boundaries, default/configurable duration, continuation/wrap, reduced motion, unsupported/failed capture and delayed callback cancellation. Obsolete exhaustive interpolation sampling tests were replaced with the approved distinct-wipe contract checks; approved anchor contrast checks remain.

Local optimized Chrome capture on /about at 1440x900 and 400x900 proves both real 400ms animations. At 200ms, sunset clip is inset(0 50% 0 0), sunrise clip is inset(50% 0 0 0); incoming opacity is 1, endpoint tokens have no inline interpolated colors, the pressed item is Dusk-to-Dusk, and one main remains. Midpoint/completion screenshots and raw axe reports are preserved in ignored tmp/living-wipe-evidence/. Both completed width scans have zero axe violations/incomplete items. This is controlled local evidence, not production Lighthouse or human production acceptance. Human direction/timing acceptance and exact-SHA production verification remain.

## Production Living evidence runner — 2026-10-13

Navigation-mode Lighthouse reloads the document, so ThemeState correctly initializes Teetotaler again. A navigation result does not attest the previously selected Living Mode. The existing static runner already uses snapshot mode, but previously could select/validate only static palettes.

The same npm entry now accepts --mode living. Its first-party helper installs an isolated browser-only performance.now clock before navigation, selects Dusk-to-Dusk through the actual menu, waits for the lazy runtime, and advances the clock to defined positions. Neither application code nor production default/timing/storage is changed. Browser snapshots of each real native wipe are paused at 200ms for visual capture and resumed afterward; 400ms remains the application's animation duration. The held audit frame is test stagecraft, not production motion timing evidence.

Eight checkpoints: early (30 seconds), later (24 minutes), just before Sunset, Sunset midpoint, Rum Runner landing, just before Sunrise, Sunrise midpoint, and Sunrise landing/wrap. Five identity checks per scan establish root anchor, the single pressed Dusk-to-Dusk control, exact frozen clock/performance.now, expected semantic tokens and computed body colors, one main, correct wipe direction/duration/clip/opacity, and no navigation or transient theme reset. Token expectations are calculated only at those requested checkpoints; no exhaustive contrast sampling occurs. A machine assertion requires later controlled time and changed rendered/token background values. Failures stop capture rather than report a successful uncertain audit.

```powershell
npm.cmd run evidence:themes -- --mode living --url https://djamespoer.com/ --routes /about --viewports desktop,narrow --expected-sha "VERIFIED_DEPLOYED_SHA"
```

The SHA argument must be the full actual operator-verified SHA. Reports distinguish source SHA, expected deployed SHA and unavailable independent deployment attestation. Never infer active deployment from Git HEAD or short public history revision. Lighthouse remains snapshot Accessibility only; no Performance/loading result is claimed. Mid-wipe axe/Lighthouse inspects the complete incoming live DOM; screenshots separately prove the two-scene compositor, not a pixel-level contrast certification of the seam.

Production /about desktop and narrow each passed all eight checkpoints: theme identity stayed established throughout, axe 0 violations/incomplete, Lighthouse snapshot Accessibility 100. Controlled progression changed the body background from rgb(255, 243, 214) at 30 seconds to rgb(245, 245, 226) at 24 minutes. Both inverse landings and resumed/wrapped interpolation were captured without Teetotaler reset. Reports/screenshots are preserved in ignored tmp/living-theme-evidence/2026-10-13T10-00-26-408Z/ and 2026-10-13T10-01-42-894Z/. Expected SHA: 398d96266185a8a1410ff985485278b2660e1e0a; full active deployment attestation remains pending. Sanitized public history checked 2026-10-13T02:59:31.873Z correlates short 398d962 only.

The extra Home capture was stopped on a genuine non-palette accessibility finding at the later checkpoint: label-content-name-mismatch on the Engineering candidate motion button, visible "Pause animation" versus accessible "Pause Engineering particle animation". This existing normal-motion control did not appear in reduced-motion static scans. Early Home had axe 0 violations, Lighthouse 100 and preserved image-background incomplete items. No palette, motion speed, carousel, or application implementation was changed to conceal the finding. Raw failed Home evidence: tmp/living-theme-evidence/2026-10-13T10-01-55-608Z/.

Harness regression coverage includes CLI dispatch (avoiding a new module import cycle), unsupported mode/override rejection, all defined states, reset/navigation/token/clock/wipe mismatch rejection and measurable advancement. No new dependency, public test parameter, user-facing control, onboarding, or persistence was introduced. Exact-SHA deployment attestation and the separately reported Home control defect remain outside a clean production acceptance claim.

Final runner desktop recapture: tmp/living-theme-evidence/2026-10-13T10-04-07-063Z/, all eight PASS, including explicit performance.now stability before/after audits and source/runner provenance. Focused harness 7/7 and full Node 167/167 pass; Prettier and whitespace pass. Application source/generated timestamp are unchanged, so Angular tests and production build were not rerun for this evidence-only change. No commit or push was performed in this verification pass.

## Locked Sunset-first correction — 2026-10-13

The earlier Sunrise-first implementation/evidence above is historical and does not verify this correction. Living order is now Tequila Sunset -> Rum Runner -> Bloody Mary -> Tequila Sunrise -> Mojito -> Piña Colada -> Mai Tai -> Tequila Sunset. Selection/reselection starts a fresh elapsed clock at Sunset. Static menu order, named-theme cancellation/static locking, Teetotaler bootstrap, palette values, timing durations and lack of persistence remain unchanged.

The initial Sunset -> Rum Runner boundary is now the first wipe rather than a late-cycle stage. Exact controlled t=0 retains Sunset; the next advancing tick starts the horizontal wipe. The second wipe is at 48 minutes plus 400ms, Bloody Mary -> Sunrise. Five 48-minute interpolation spans and two 400ms wipes still wrap after approximately four hours. Startup eligibility is explicit so the first wipe cannot be skipped because no prior target exists.

The uncommitted Living evidence runner now captures ten points in this corrected chronology: Sunset t=0, initial sunset wipe, Rum Runner landing, early/later night progression, before/midpoint/after Sunrise, return toward Sunset, and the next cycle's sunset wipe. It records dirty source files and marks loopback captures as local rendered targets; the base commit SHA is not an attestation that this uncommitted correction is deployed.

Local optimized /about desktop and narrow: 20/20 identity-stable PASS, axe zero violations/incomplete, Lighthouse snapshot Accessibility 100. Evidence: tmp/living-theme-evidence/2026-10-13T13-12-24-121Z/. No production certification is claimed against the obsolete Sunrise-first deployment. Unit assertions independently lock both canonical runtime order and unchanged static menu order, cover reselection/restart, and retain motion/cancellation/fallback tests. Initial validation caught and corrected first-wipe scheduling and stale test offsets; final gates pass.
