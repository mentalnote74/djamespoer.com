# SCRUM-165 review — November 4, 2026

Branch: feature/scrum-165; worktree: tmp/scrum-165; baseline: 57d8a71.
Local only. No push or deployment. James must explicitly say "Push and deploy".

## Implementation

- Reusable Bedlam mask input defaults to the canonical header wordmark. Opt-in contained icon fields use independent positioning/sizing and the same sky engine/palette. Header appearance/tuning stays the default. Dark-theme selectors target the inner contained-mark class, avoiding Angular host-context selector leakage.
- Shared social-profiles.ts config drives footer and About navigation. LinkedIn, X and domain-handle Bluesky are confirmed. Facebook has no URL and renders nothing. Simple Icons 11.15.0 CC0 paths/viewBoxes are unchanged; decorative SVG attributes and provenance accompany the assets.
- Native named links, me/noopener/noreferrer, 44px footer targets, visible focus; existing external_profile_click name extended for x/facebook/bluesky. Profile-only paths and exact hosts; no handles, URL queries or private content enter those payloads.
- Reduced motion forces Teetotaler, stops the living clock and carousel rotation, hides Bedlam scenes, disables CSS motion, and cancels Hero particle startup/frames on live changes. Existing slide and Rigby preference handling is retained.
- Small fields cap raster buffers at displayed width: six social instances at 32px, header unchanged at 384px in the measured desktop fixture. No dependencies, theme token/palette changes, new animation engine or evaluator work.

## Validation

- Focused Angular fixtures: **63 tests / 6 files passed**, exit 0. Bedlam, Header, Footer, Hero, ThemeState and PublicAnalytics. No paid/provider calls.
- Full suite attempted: **blocked at test compilation**, exit 1. Existing unchanged authored-studies.spec.ts:35 and :54 read evidence/items from narrowed case-study content unions (TS2339). git diff against the baseline for the entire case-study directory is empty. No full-suite pass is claimed; unrelated content/tests were preserved.
- Final npm run build: **passed**, exit 0; 63 prerendered routes, initial 476.80 kB / estimated transfer 120.04 kB. Bedlam is within its existing stylesheet budget. Existing Rigby greeting/guide stylesheet warnings and Node module-type warning remain. Generated churn restored after the build.
- Lighthouse home, same local mobile preset: Performance **89 → 90**, Accessibility **100 → 100**. Single controlled before/after samples, not a general performance guarantee.
- Controlled 12-second CDP main-thread sample, other CSS effects/carousel rotation paused, header plus all six configured social instances visible: paused TaskDuration **0.052s**, active **1.219s**; active ScriptDuration 0.784s, LayoutDuration 0.000s. Local main-thread measurement, not GPU/battery or real-device evidence. Earlier 4.40s sample exposed oversampling and was superseded.
- Conservative opaque-mark contrast bound **3.89:1 minimum**: actual source raster pixels plus computed composition/immediate background, all three visible glyphs in nav/footer, 1440/390 widths, eight anchors and four Dusk entry hours (19, 23, 8, 14). Vector antialiasing is excluded. Initial clipped/edge pixel diagnostics were discarded, not counted as passes.
- Desktop/mobile keyboard: Tab reaches the named profile link with 3px visible focus; Escape closes About and returns focus to its trigger. Native accessible profile names present in Chrome AX tree. Footer hit areas measured 44×44. No overflow/page errors in checked states.
- Reduced-motion startup: Teetotaler, zero running CSS animations, all seven Bedlam scenes hidden, no Hero particle canvas, carousel rotation off. Live preference changes also covered by fixtures/browser. Forced colors retains static CanvasText identity.
- axe: zero WCAG A/AA violations in the checked reduced-motion page and final normal-motion all-instances fixture. No manual spoken screen-reader or exhaustive device audit claimed.
- Final screenshots: final-*.png (nav/footer/header), 1440 and 390, Teetotaler, Bloody Mary, Dusk 19h/8h, forced colors. Before-header screenshots retained for comparison. Default header mask size and linear-gradient scene/opacity are verified separately in final-performance.json/header-check.log.

## Review and remaining work

Review the small material treatment, default header parity, two Dusk states, mobile About navigation, footer focus, and reduced-motion behavior. Owner visual acceptance is pending. The pre-existing full-suite compiler blocker remains unmet acceptance evidence. Facebook remains intentionally hidden until confirmed. No deployment is authorized yet.

Production HTML checked read-only on November 4: existing LinkedIn link present; no new social section/X/Bluesky links. This implementation SHA is not deployed. No production revision was inferred from the historical deployment data.

Receipts: SCRUM-165 Jira ZIP attachment and local tmp/receipts. Reproduction scripts (baseline, contrast, capture, final-performance) are included in the ZIP. Local preview: node scripts/portfolio-review-server.mjs (port 4406).
