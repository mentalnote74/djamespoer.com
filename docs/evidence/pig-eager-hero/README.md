# Direct TCC hero: eager preparation checkpoint

2026-10-24. Local only; no push/deploy. Parent is `e406a5c1ddc29d1977021c7a76f119b6138bd847`.
Original baseline is `2842cd73f88c57a5b75d746f3f3f6c9bf1c62213`.
Atlas `f23d1cea` remains isolated. No image, priority, expression timing or
pig-engine changes in this commit.

## Implementation

`SlideHero` mounts the existing `TccPigSlide` directly for the TCC visual,
with `hero=true`, instead of passing it through `SlideVisual`'s deferred
artwork boundary. It retains the existing ready notification convention.
Other visual branches continue through `SlideVisual`. The carousel template,
deferred visual branch, controls, links and tracking are unchanged.

The first visual check caught the directly mounted pause button outside the
shared keyboard-reveal selector, making it visible over the heading. The same
shared selector now includes `app-tcc-pig-slide`. No new treatment or animation.
Final keyboard/focus checks and final filmstrips include that correction.

All of e406a5c1's complete fallback, responsive pinned-image batches, loader
and actual-image decode gates, atomic reveal, failure retention, generation
guards and reduced-motion behavior remain byte-for-byte unchanged.

## Outcome: modest improvement, material remaining dependency

Preparation starts earlier in the final comparison, but is still blocked by
Angular bootstrap/initial rendering before `afterNextRender`. This change does
not return detailed artwork to the baseline's prerender-time presentation.
The remaining delay is reported here; no attempt was made to broaden the fix
into bootstrap, a new asset strategy, more preloads, or priority changes.

Times are ms after navigation. Two observations per viewport; not Lighthouse
scores and not a statistical claim from two samples.

| Viewport / repetition | e406 first readiness check | Eager first readiness check | e406 reveal gate | Eager reveal gate | Original baseline LCP | e406 LCP | Eager LCP |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1440 / 1 | 3670 | 3325 | 3798 | 3474 | 1124 (base image) | 3848 | 3520 |
| 1440 / 2 | 3845 | 3731 | 3960 | 3864 | 692 (H1) | 4016 | 3912 |
| 390 / 1 | 3853 | 3091 | 3966 | 3176 | 1068 (base image) | 604 | 1244 |
| 390 / 2 | 3797 | 2983 | 3888 | 3112 | 684 (base image) | 512 | 608 |

Desktop first preparation is 345/114ms earlier; LCP improves 328/104ms toward
baseline but remains far slower. Both desktop fix variants report the detailed
`.layered-pig.current > img.base.plate` as LCP. At 390px both retain the complete
inline preview as LCP; those numbers do not measure detailed-art readiness.
The mobile reveal is 790/776ms earlier, despite mixed preview LCP.

Desktop final eager image responses all finish by 2269/1148ms (observed complete
state 2639/1153ms), but preparation only starts at 3325/3731ms. In repetition 2
that is another ~2.58s after images are complete. Mobile complete states are
2416/1025ms, first checks 3091/2983ms. The late gate is still an application
startup dependency, not proof of slow image transfer or multi-second decode.
Native decode calls/resolutions, selected candidates, priority changes, JS
request chains and exact LCP elements are retained in the JSON rows.

## Conditions and bounded repetition

Production/prerendered builds served locally as gzip text plus cacheable images;
Windows headless Chrome, no extensions. Cold browser context/cache for every
navigation. CDP 150ms latency, 204800 B/s down, 84375 B/s up, CPU 4x.
Desktop 1440x1000/DPR1; mobile 390x1000/DPR2/touch. No Android hardware,
Cloudflare transport or Lighthouse simulation claim. No paid provider calls.

An initial two-repetition three-variant comparison ran at each viewport,
alternating order. Following the pause-selector regression, only the final
candidate was repeated twice at each width to verify the corrected build;
baseline and e406 evidence were reused under the identical conditions rather
than repeating the whole comparison. The table uses the final candidate runs.
Instrumentation/native-decode wrappers and first-repetition CDP screencasts
are equivalent; absolute timings include observation overhead. Do not treat
one pair's delta as a guaranteed production gain.

## Visible assembly and accessibility

[Visual index](index.html): original baseline / e406 / final eager CDP frames.
White frames before any page content are labelled at their real frame times;
they are not described as a partial face. Once artwork is visible, the final
eager frames retain a complete softer fallback, followed by a complete detailed
pig. No isolated facial patch, rectangular face hole, or doubled feature was
seen in these final captured frames. This is frame evidence, not proof of every
hardware scanout frame. The fallback remains softer and retains its existing
network/decode-failure behavior.

Final built direct-hero checks at both widths pass: pause initially clipped but
keyboard-focusable, reveals on focus, Space pauses/resumes, reduced motion has
zero animations and a visible kiss, forced colors hides art, no horizontal
overflow, no application exceptions, zero scoped hero axe violations. Heading
overlay is unchanged and no longer has the accidentally exposed control.
The component motion stylesheet/timing is unchanged.

## Carousel preservation and build tradeoffs

Cold/throttled real homepage checks compare e406 and the eager code at both
widths. Before native Next activation, neither pig artwork nor the pig
component-code chunk was requested. After first arrival both request exactly
the same five candidates: desktop `desktop/*-1440.avif`, **30299 encoded B**;
390/DPR2 `mobile/*-768.avif`, **11260 encoded B**. Same current sources,
3:1 artwork, copy, native destination and ready/reveal behavior. No new preload
or homepage eagerness. [Read-back](carousel.json).

This is preservation of deferral and image delivery, not a claim that the
compiled JS graph is byte-identical. The bundler shares the 14170-byte pig
component chunk between the direct hero and the deferred carousel entry;
the carousel gets a 204-byte re-export entry (an extra module request on arrival).
Also, the shared destination-hero module now statically imports that pig chunk,
so other routes loading `SlideHero` inherit that code dependency even when
their selected art is not the pig. This bundle tradeoff is explicitly retained
for review, not silently described as a TCC-only network change. Avoiding it
would need another bounded design decision; no broader routing changes made.

Initial JS remains unchanged; shared CSS grows 52 raw bytes. Final initial
JS/CSS total **468.62 kB / 115.97 kB estimated transfer**, versus e406's
468.57 kB / 115.95 kB. Build/style budgets pass; 48 static routes prerender.
35 focused tests pass (pig decoding, existing carousel, hero composition plus
one new direct-TCC eager-mount check). No unrelated suite or paid acceptance.
Existing nonfatal MODULE_TYPELESS_PACKAGE_JSON warnings remain.

The carousel diagnostic saved all passing assertions then stalled during local
server teardown; its owned process was stopped. Results were preserved. Final
hero diagnostic tears down cleanly and exits zero. The carousel check predates
the CSS-only selector correction; its code/image loading is unchanged by that
correction, which is covered by final hero focus checks.

## Evidence and remaining work

`results-1440.json` / `results-390.json` contain original and gated captures plus
the final eager candidate. `contracts-*.json` retain final keyboard, reduced,
forced-color and axe results. Raw traces, every recorded frame and diagnostic
scripts remain local in `tmp/evidence/pig-eager-hero*` and
`tmp/diagnose-eager-hero.mjs`, `tmp/check-final-hero.mjs`.

**Stop here for review.** Angular's remaining startup/initial-render dependency
is material; desktop LCP is not restored to baseline. The static hero import's
shared-route bundle effect also needs review before promotion. No production
deployment, asset strategy change, bootstrap optimization or atlas promotion.
