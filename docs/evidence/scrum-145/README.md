# SCRUM-145 — Big Dumb Bass article slide

**Historical fade checkpoint:** the following captures describe the original
2503567 implementation. The current local revision uses a horizontal approach;
see [current approach and pig rollback integration](approach/README.md).

Local review checkpoint, October 24, 2026. No push/deployment. Based on remote
main `cb09be858d1453302293145f15777a7ef9e0cf07`; the existing pig checkpoints,
dirty protected-client checkout, approved slides and icon work are preserved.
SCRUM-145 was read and matches the supplied handoff. SCRUM-144 is untouched.

## Review

Working local preview: <http://127.0.0.1:8835/?preview=big-dumb-bass>.
The preview-only Node server advances the real carousel with its existing
controls and closes the cookie prompt. No new production route, controls,
shuffle policy or query behavior is added to Angular. The local server remains
running for James; restart with `node scripts/big-dumb-bass-slide/preview.mjs`
from this worktree if needed. API data is unavailable in this static preview;
the server does not proxy production/private APIs. No public source archive.

[Visual sheets](index.html) contain actual final built-page screenshots and
loading/reveal filmstrips at 1440px and 390px. The frames show the existing
Conservatory before arrival, a fish-free opening, the decoded layered scene,
and the Bass gradually emerging. No exposed layer rectangle or partial subject
was seen. The poster itself has a network wait: a dark scene with usable HTML
can appear before it arrives. No inline/preloaded image strategy was invented.

## Implementation and behavior

- Added one `BigDumbBassSlide` through the existing deferred `SlideVisual` and
  slide registry. The existing Blognostisphere slide remains. The prerendered
  Conservatory opener and deck shuffle, nine-second rotation and controls stay.
  Previously rejected TCC/D&R scenes remain excluded; the approved pig remains.
- Exact H2: **Whatever You Do, Do Not Click Here**. No supporting tagline.
  Native full-surface Explore link goes to the existing
  `/blognostisphere/like-a-big-dumb-bass`. Built navigation verifies its existing
  canonical `https://djamespoer.com/blognostisphere/like-a-big-dumb-bass`.
- Standard shared Explore arrow and keyboard-revealed pause styling. Pause is
  a sibling of the native link, positioned at the scene corner when focused,
  so it cannot activate the article or obstruct Explore. Decorative art is
  hidden from AT; copy, focus, native links and keyboard behavior remain HTML.
- Same 2172x724 registration for every plate. Responsive AVIF first, WebP
  fallback, capped 768/1440/2172 widths and intrinsic dimensions; no independent
  cover/crop/translation of the art plates, no PNG runtime sources.
- Fish-free complete opening poster while three selected plates prepare. Both
  loader and actual staged images must decode before all three pinned URLs
  become current together. No per-layer fade-in or white patch/rectangle.
  On failure keep the complete poster/current batch, with no retry timer or
  blocked link. Resize retains the current complete batch until replacement.
- Bass is stationary and absent initially. Once ready/active/in view/document
  visible, hold 2 seconds, then opacity 0→1 over 5.5 seconds, ease-in-out,
  brightness .62. Fill retains the visible fish for the visit. Persistent depth
  wrappers keep the animation instance during responsive batch replacement.
- CSS-only subordinate 16s caustics, 19s motes, 6.8s lure halo and three staggered
  7.6s glints. Names/references share one Angular-scoped motion stylesheet.
- User pause, offscreen and document-hidden states freeze all clocks, including
  reveal delay/fade. Backgrounding does not undo user pause. Only real slide
  departure resets the visit. Reduced motion loads the complete still directly
  with no layered requests or animation; forced colors retains semantic content.

## Analytics proof

Reuses `PublicTrack` → `PublicAnalytics` → `gtag`. Added the finite slide key
`big-dumb-bass` and existing article path to the existing route allowlist.
No custom click router, extra listener, new telemetry stack or free-text data.

At both widths real trusted Enter and pointer activation each produce exactly
one `carousel_cta_click`, parameters:

```json
{"location":"carousel","slide":"big-dumb-bass","destination":"/blognostisphere/like-a-big-dumb-bass","page_path":"/","cta_location":"carousel"}
```

Pause produces no article event. Native navigation and Back work. The test maps
the production hostname to local built files and captures gtag calls while
blocking every external request. This proves actual application transport,
not GA dashboard ingestion, which was not exercised without a release.
Localhost/internal-traffic suppression remains unchanged. See `contracts.json`.

## Delivery and performance

All 30 delivered files match supplied SHA-256; no re-encoding or source editing.
Archive/provenance: [source package](../../../artwork/big-dumb-bass/README.md).

| Actual selected AVIF | 1440px viewport | 390px / DPR2 |
|---|---:|---:|
| Candidate width | 1440 | 768 |
| Pond + Bass + lure | 199607 B | 76790 B |
| Opening poster | 103473 B | 39794 B |
| Total, four requests | **303080 B** | **116584 B** |
| Resource Timing transfer (cold) | 304280 B | 117784 B |
| Complete reduced-motion still only | 113296 B | 42501 B |

The poster costs bytes in addition to the layers; it is not described as free.
Warm transfer is zero. Warm-cache Chrome can resolve four image resources before
arrival from cache despite their lazy declarations. Cold runs request zero Bass
images before Next; there is no whole-deck preload or eager Bass promotion.
The three full-image surfaces plus poster remain a real decode/compositing cost;
no memory or GPU-efficiency claim from the smaller lazy JS alone.

Matched opening-page checks: Windows headless Chrome, local gzip production
builds, cacheable assets, 150ms latency, 204800 B/s down, 84375 B/s up, CPU 4x;
1440/DPR1 and 390/DPR2/touch. Two repetitions of cold+warm for baseline and
candidate at each width, alternating mode order (16 navigations). Opening LCP
is the observed browser entry before interaction after load/fonts + 500ms,
not simulated Lighthouse and not the post-click artwork readiness measurement.

| Viewport/cache | Baseline opening LCP samples | Candidate opening LCP samples |
|---|---|---|
| 1440 cold | 1144, 556ms | 568, 564ms |
| 1440 warm | 484, 508ms | 524, 464ms |
| 390 cold | 892, 896ms | 912, 948ms |
| 390 warm | 876, 872ms | 796, 892ms |

Final component-only stacking/control placement corrections were followed by
one final cold candidate capture per width, rather than repeat the whole matrix:
opening LCP 1704ms desktop / 1168ms mobile, zero cold pre-arrival Bass images.
These higher isolated samples are retained, not discarded or called a causal
regression. The small sample and runtime variance do not establish a startup
speed win or prove zero effect. No speculative optimization/Lighthouse campaign.

Initial candidate cold ready-after-Next: desktop 2109/1957ms, mobile 1112/1087ms;
warm 175/193ms and 197/176ms. Final capture 2013/1156ms. Timing is DOM/decode-gate
readiness, not exact hardware scanout; independently captured frames provide
the visual evidence. The matrix predates the two CSS/placement corrections;
final browser contracts and final filmstrips include them. Assets and preparation
logic are identical. `performance.json` and `final-performance.json` retain rows,
actual URLs, request timings, decode completions and LCP candidates.

**Autoplay limitation:** cold throttled desktop preparation (~2s) + required
7.5s reveal can exceed the existing nine-second dwell. The Bass still emerges,
but may not finish its fade before rotation. Existing manual Next pauses
rotation, so preview/keyboard/manual visits show the complete sequence and hold.
No interval change, early clock start, preloading or timing shortcut was applied.

## Verification and final build

- Final focused tests: **44/44**, new slide loading/failure/visit/stale-decode,
  existing carousel/deck and public analytics suites. No broad unrelated suite.
- Final production build/style budgets pass; **48 routes** prerender; geometry
  validation covers **656 assets / 16 slides**. Existing nonfatal module-type
  warnings remain. No lint claim (no lint script).
- Initial bundle **468.66kB / 116.02kB estimated transfer** versus baseline
  468.62kB / 115.97kB. New slide remains lazy **12.71kB / 3.78kB estimated**.
  Home HTML 338379→353201 raw B, 46905→48528 gzip B (+1623 gzip); image bytes
  are not embedded into initial HTML. No new runtime dependency.
- Final browser checks at both widths: natural 2s hold / 5.5s fade / held end,
  user pause in delay and fade, paused background persistence, actual same-window
  hidden tab, offscreen freeze/resume, revisit reset, persistent animation during
  responsive replacement, native keyboard/pointer/Back, exact copy/canonical,
  shared arrow, source hashes, failure poster, reduced still, forced colors,
  no overflow/application exceptions and **zero scoped axe violations**.
- Removing AVIF source choices in the final mobile preview verifies native WebP
  selection decodes and atomically replaces the three plates.
- Headline stays inside the slot at 34.5px desktop / 16.8px mobile; lure and fish
  are retained in the full 3:1 canvas. Final focus-revealed pause sits away from
  Explore. A discovered artwork z-stack overlap and focused-control overlap
  were corrected before this checkpoint; no art pixels changed.
- Initial harness issues (async Angular class updates, same-window tab selection,
  and waiting for active slide ID before its deferred child) were fixed in the
  local checks. Final checks exit zero. No paid evaluation, external GA emission,
  public API writes, credentials or career records used/changed.

Full capture frames and local outputs remain under `tmp/evidence/scrum-145`.
Compact final sheets/measurements are retained here. Static preview APIs return
unavailable rather than fabricate live project/evaluation data. Source masters,
component and evidence are in the local commit; generated build/date/sitemap
churn is excluded. No push/deploy; Jira completion is not claimed.
