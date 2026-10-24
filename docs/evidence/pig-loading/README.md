# Complete pig loading — separate assets

Local review checkpoint, 2026-10-24. **No push or deployment.**
Baseline: `2842cd73f88c57a5b75d746f3f3f6c9bf1c62213`.
The atlas experiment remains isolated at `f23d1cea5e45e66de94546bf3fc2e839345b842c`;
none of its runtime code or artwork is promoted here.

## Result

Actual baseline frames reproduce isolated facial patches and rectangular eye/mouth
holes. The fixed build's captured frames show a complete, softer pig during
preparation and a complete detailed pig after the grouped reveal. No partial face
or hole was seen in the fixed desktop/390px filmstrips. Load/decode failure keeps
the complete static pig; a failed responsive replacement retains and freezes the
last complete detailed frame. Navigation stays usable.

This fixes the demonstrated assembly failure, **not a delivery-speed improvement**.
The fallback is intentionally only 384 × 128 and visibly softer on desktop.
Throttled direct TCC hero detail readiness and desktop hero LCP regress materially;
review that tradeoff before any production promotion. Homepage opening LCP varies
in both directions; these results do not establish a consistent opening-page win
or regression. No carousel-wide preloading was added to disguise the delay.

## Small runtime change

- Original five responsive separate images remain the preparation path, with the
  same AVIF/WebP sources, sizes, hero priority and loading policy. Masters,
  registered image files, motion stylesheet, carousel controls and tracking are
  unchanged.
- A complete inline rest/kiss preview is composited from the existing approved
  base/open-eye/mouth pixels by `scripts/tcc-pig-slide/fallback.mjs`. It needs no
  network request and is present in prerendered HTML. Reduced motion selects the
  complete kiss preview even if every detailed request fails.
- All five selected loader images must decode. Their `currentSrc` values are
  pinned into a hidden rendered batch; the actual five buffered DOM images must
  also decode before one group becomes current. There are no per-feature fades.
- Responsive replacement keeps the old complete, fixed-URL batch until its
  successor decodes. Generation guards reject obsolete async work. Old batches
  are removed after the new group is presented. Failure discards the pending
  batch and leaves the complete cover/current frame; there is no application
  retry timer. The browser's initial native request activity is finite (ten
  aborted requests in the forced-network-failure checks, five on decode failure).
- Animation eligibility begins only after the first complete batch is presented.
  The existing four-second timeline is unchanged: winks near 1.5/5.5 seconds,
  kisses near 2.4/6.4 seconds after animation starts. The carousel's nine-second
  dwell is unchanged; slow preparation consumes part of that dwell. Manual pause
  freezes, inactive/offscreen/hidden resets, reduced motion stays static, forced
  colors hides artwork. No new dependency or animation system.

## Review artifacts

- [Visual index](index.html): actual screenshot/CDP filmstrips, not a decode-only assertion.
- [All readiness/LCP medians and ranges](timings.md) — milliseconds, three samples per cell.
- [Decode/paint/raster summaries](costs.md) — cold-cache medians, milliseconds.
- [All 96 measured navigations](measurements.json).
- [Separate visual pass metadata](visual-measurements.json),
  [failure/motion/accessibility contracts](contracts.json),
  [responsive replacement contracts](replacement.json).

The early direct-hero CDP sheets include browser blank-before-content frames.
After the scene first paints, the fix has a whole fallback. A final assembled
snapshot is explicitly labelled as later, not assigned an invented presentation
timestamp. Screenshot-loop sheets begin after navigation resumes and can miss
the earliest hero assembly; the independent CDP sheets preserve that evidence.

Full local captures, timestamps, screenshots and gzip traces remain under
`tmp/evidence/pig-loading/` in this worktree. They are not application assets and
are not bundled. The compact sheets and all measurement rows are retained here.

## Conditions and interpretation

Chrome headless on Windows with extensions disabled, production/prerendered
builds served locally with gzip text and cacheable image responses. Desktop:
1440 × 1000, DPR 1. Mobile emulation: 390 × 1000, DPR 2, touch. This is not an
Android hardware or Cloudflare HTTP/2 test. No Lighthouse or paid provider call.

Native connection/CPU and CDP throttling: 150ms latency, 204800 B/s download
(1638.4 Kbps), 84375 B/s upload, CPU 4×. Three repetitions per
variant/width/surface/profile/cache cell, 96 navigations total. New context and
cleared cache for cold, second same-context navigation for warm; mode order
alternates. A test-only deterministic valid shuffle keeps Conservatory first
and pig next. The real existing Next button triggers first pig arrival. No
production slide-order change. Direct `/case-studies/tcc` covers initial display.

Readiness is a proxy: complete loaders, decoded images, then two animation
frames, and for the fix a current five-image rendered batch. It is measured
from Next click on Home or navigation start for the hero. The fallback was
already decoded at the first observer-visible stage in every fixed timing row.
That alone is not visual proof; actual screenshots/CDP frames provide separate
evidence. They bracket presentation rather than proving every GPU scanout frame.

Opening Home LCP is the observed browser entry before interaction, after load,
font readiness and a 500ms settling checkpoint. It is not a simulated Lighthouse
score. Direct-hero LCP is a separate metric and can select the later full-detail
image. The independent visual pass adds screenshot overhead and is excluded
from the 96-navigation timing table.

The final build includes one generation-cleanup guard (`>= presented` instead
of `=== presented`) added after the timing matrix so an older cleanup cannot
delete a newer staged responsive batch. Final build, visual pass, focused tests
and responsive browser contracts include it. Normal non-resize matrix behavior
is otherwise unchanged; the 96-navigation table was not wastefully repeated.

## Readiness cost and opening LCP

Cold throttled first Home arrival: desktop **549 → 621ms**, mobile **499 → 601ms**
(medians). Warm: desktop **132 → 138ms**, mobile **139 → 115ms**. The complete
fallback covers preparation in the fixed captured sequences.

Cold throttled direct hero detail readiness: desktop **1611 → 3809ms**, mobile
**1031 → 3829ms**. Warm hero: desktop **814 → 1805ms**, mobile **756 → 1870ms**.
Cold throttled desktop hero observed LCP **980 → 3828ms**; mobile **852 → 520ms**
(the complete preview can remain the reported candidate). A low preview LCP
must not be presented as faster full-detail readiness. Native hero readiness
also adds delay; see all ranges in the timing table.

Cold opening Home LCP: native desktop **200 → 232ms**, mobile **196 → 192ms**;
throttled desktop **1112 → 716ms**, mobile **1112 → 1072ms**. Warm throttled:
desktop **704 → 588ms**, mobile **1044 → 1156ms**. Variance is large, including a
1328ms native baseline outlier. No speculative LCP cleanup follows from this.

## Delivery, memory and rendering

Selected artwork is unchanged: desktop 1440px candidates **30,299 encoded B**,
**31,799 Resource Timing transfer B**, five requests; 390/DPR2 selects 768px
candidates **11,260 encoded B**, **12,760 transfer B**, five requests. Warm
image transfer is zero for both. Resource Timing includes the browser's
300-byte/resource allowance, not a packet capture.

The complete inline preview is not free: rest 1508B and kiss 1502B WebP binary,
plus base64/markup. Home HTML grows **333,553 → 338,289 raw B**,
**43,113 → 46,904 gzip B** (+3791 gzip). TCC HTML **144,647 → 149,383 raw B**,
**24,581 → 28,405 gzip B** (+3824 gzip). The pig lazy chunk grows
**7221 → 14,212 raw B**, **2730 → 6981 gzip B**; no initial JS chunk added.
Final initial JS/CSS total **468.57kB / 115.95kB estimated transfer**, within
budgets. The same preview strings occur in prerendered HTML and the lazy chunk.

The original five registered images still have estimated unique RGBA size
**13.18MiB desktop / 3.75MiB mobile** (dimensions × 4). Both 384 × 128 complete
previews add at most **0.375MiB** on that basis. Hidden loaders and rendered
buffers refer to the same URLs; requests are reused in the captures. During
replacement old/new candidates coexist. This is not measured GPU/process
memory, and decoder/cache residency is browser-dependent; do not claim an
atlas-like memory reduction.

Trace decode/paint/raster totals cover the whole observed page and overlap
threads; they are not additive critical-path attribution. Reused image decode
does not create a clear CPU-cost increase in the recorded medians, but neither
does that explain away the observed hero-readiness regression. No process-memory
or energy claim. JS heap samples remain in the raw rows but are GC-sensitive.

## Verification

- Production build/style budgets pass; all 48 routes prerender.
- 34 focused tests pass: pig decode/rejection/generation/replacement cases and
  existing carousel/slide-hero suites. No broad unrelated suite.
- Desktop and 390px built-page checks: native click/tap destination and tracking
  attributes; exact copy/3:1 composition; repeated arrival; two winks/two kisses
  without doubled features; keyboard pause/resume; actual background tab and
  offscreen suspension/reset; reduced-motion kiss; forced-colors suppression;
  zero scoped carousel axe violations and zero application exceptions.
- Forced network/decode failure: complete static face, no current layered group,
  no animation, stable request count during observation, link works. Reduced
  motion still has its complete kiss. Responsive holds retain the previous
  complete batch, successful replacement changes all five pinned URLs, failed
  replacement freezes the last complete batch.
- No horizontal overflow in the 96 measured navigations. Whole-page observed
  CLS ranges 0–0.0147 in both builds; some throttled desktop cells have nonzero
  medians. No claim that the unrelated page always has zero CLS. The pig stage keeps its 3:1
  geometry; preparing/replacement adds no in-flow artwork.
- A harness assertion initially read `currentSrc` synchronously after changing
  reduced-motion media; it now waits for native picture selection. The resize
  probe initially changed touch capability, which makes Puppeteer reload the
  document; it now resizes within the same device/session. These were harness
  corrections, not product changes. Final contracts pass.

Build emits the existing nonfatal MODULE_TYPELESS_PACKAGE_JSON warnings.
Generated build/date/sitemap churn is excluded from the focused commit. The
original dirty checkout, résumé checkpoint and atlas branch remain untouched.

## Reproduction

Build the baseline into `tmp/baseline-browser` from the baseline commit in an
isolated checkout, then run the candidate build. `compare-loading.mjs` serves
only those two local directories; it does not proxy APIs. Default is the full
three-repetition matrix. Environment filters are documented at its top.

For independent cold/throttled screenshot sampling: `PIG_REPS=1`,
`PIG_PROFILES=slow`, `PIG_CACHES=cold`, `PIG_VISUAL=1`. Then run
`scripts/tcc-pig-slide/loading-filmstrip.mjs`.
`scripts/tcc-pig-slide/check-loading.mjs` covers lifecycle/failure/accessibility;
run again with `PIG_CHECK=replacement` for held/rejected responsive decode.
These are local evidence helpers, not a new application test framework.
