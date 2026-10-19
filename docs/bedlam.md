# Current composition: historical pre-fart rules + new moving material

Composition is restored directly from 909072dbb5471198d253031c8eb526b6e99b8736. Teetotaler and the five other non-dark anchors use an opaque black canonical wordmark over material in the header-clipped navbar field. Rum Runner and Bloody Mary use the canonical letter mask on the scene, navigation-foreground backing, silhouette shadow, hidden separate identity and the historical field opacity. Header/field positioning, default transparency, z-index, overflow and forced-colors rules are the historical rules, not a unified all-theme mask.

The material engine, seed, tuning.ts and component motion/resource handling are unchanged from 40c29f1. Only the renderer wrappers/composition CSS changed. Material backing planes extend beyond the light-theme navbar clip so rotated backing edges are not visible; dark masked planes retain their smaller backing footprint. No new fade mask, palette, theme interpretation or tuning value was introduced. Historical reduced-motion suppression remains removed per owner instruction.

Verification compared computed composition properties against independently compiled historical SCSS in Chrome for all eight anchors at 1440/390px. Matching properties included masks, backgrounds, opacity, shadow filters, positioning, overflow and stacking. Build/prerender/budgets and five focused tests passed, with no overflow/page errors. This is composition parity, not a claim that the new material matches old blob pixels.

---

Earlier descriptions below are preserved history; the all-themes letter-clipped composition was explicitly rejected and corrected above.

# Current Bedlam: moving material underneath the mask

Three static, seeded gradient planes (two on mobile) move under the unchanged canonical CSS alpha mask. Only transforms animate. There are no blobs, SVG noise/displacement filters, emissions, particles, object lifetimes or per-frame JavaScript. Parent shadow follows the actual masked silhouette using the existing theme tokens.

Central controls: src/app/components/bedlam/tuning.ts. Defaults: speed 1.4 (0.1-3), scale 0.85 (0.5-2), variation 0.8 (0-1), contrast 0.85 (0-1), softness 0.05 (0-1), colorInfluence 0.85 (0-1), planes 3 (1-3, mobile capped at 2), enabled true; seed bedlam-material-01. Larger scale means coarser material; variation changes crossing angles/pattern structure; contrast changes plane opacity; softness adds a small static blur. Enabled=false retains the static identity. Instances can independently override seed/config/palette.

Each plane translates by exactly one repeating texture tile per cycle, giving a seamless individual wrap. Different angles, phases and unequal clocks (about 22.66, 33.78 and 49.19 seconds at default speed) prevent a short shared composite restart. This is practical perceptual non-repetition, not a claim of mathematical randomness/infinity. No opacity/scale envelope is animated; linear motion has no dwell/easing endpoints.

Reduced motion deliberately does not suppress Bedlam, per owner instruction. Forced colors hides material and keeps the static CanvasText identity. Offscreen/document-hidden/manual pause still suspend animation. The initial prerender/hydration markup is stable; mobile reduces planes after browser rendering.

Verification: production build/prerender/budgets and five directly affected tests passed. Chrome checked all eight themes at desktop/390px, moving transforms, reduced-motion-on behavior, forced-colors static identity, offscreen pause, no overflow/page errors. Observed 72 seconds desktop and 40 seconds mobile across multiple individual wraps, with no obvious composite restart or blob/puff formation.

Whole-page observation task times were ~8.57s/72s desktop and ~4.58s/40s mobile, including screenshots and other homepage effects; these do NOT isolate Bedlam. A controlled mobile-viewport sample paused other CSS animations and carousel rotation: 12 seconds all-paused used ~0.00176s TaskDuration; Bedlam-only active used ~0.04326s, with zero measured ScriptDuration/LayoutDuration. This is a local main-thread comparison, not a GPU/battery/real-device benchmark. Do not infer rendering cost from JS size.

---

Prior implementations and investigations below are preserved historical evidence, not the current renderer.

# Current feature branch: restored pre-fart blob

Manual baseline restored from 909072d with no artistic tuning. See [the complete control/evidence guide](bedlam-pre-fart-tuning.md) and `src/app/components/bedlam/tuning.ts`. Bedlam deliberately ignores prefers-reduced-motion on this feature branch, per owner instruction; forced-colors identity and resource pausing remain. NOT deployed. PROD remains the static recruiter-safe fallback.

The following BEANO records are preserved history, not the current feature-branch implementation.

---

# Current BEANO checkpoint: field beneath the mask

Status: experimental feature branch only; recruiter-safe PROD is unchanged.

The field has no knowledge of letters. Two seeded noise textures are sampled/warped on unequal browser-native SVG animation clocks, then tinted and clipped by the unchanged canonical CSS alpha mask in all themes. There is no dilation, contour reaction, letter displacement or outside-mask coverage. No objects spawn, grow or fade. The static identity and its existing theme shadow remain underneath.

Current tuning: scale 1.5, strength 0.65, speed 0.65, detail 1, irregularity 0.75, opacity 0.8, softness 0.08, colorInfluence 0.85. Reach was removed rather than retaining a misleading no-op. Scale controls feature size; strength warps the field, not the wordmark. Mobile caps detail at one octave; reduced motion/forced colors suppress the field; visibility/pause suspend its SVG timeline.

Local checks: build/prerender/budgets passed; directly affected five tests passed; eight themes at desktop/390px, reduced motion, forced colors, offscreen pause and page-error/overflow checks passed. Fifty-six-second observations confirmed continuing field motion. Visual result: cleaner silhouette and shifting material inside letters, but still restrained rather than strongly Bedlam-like.

Performance remains unresolved: the frequency-animated candidate recorded about 7.96 seconds Chrome TaskDuration per 56 seconds; cached-texture/offset candidate about 7.64 seconds. Both include seven screenshot captures, so these are not isolated filter/GPU benchmarks and do not prove a meaningful improvement. JS time was negligible. Do not promote solely on smaller JS or a successful build.

---

The following records preserve earlier architecture/history and are not the current field model.

# Operation BEANO - local field replacement

Status: local architecture checkpoint; not approved for production. Production retains the static recruiter-safe fallback.

Current experimental controls are in `src/app/components/bedlam/tuning.ts`: enabled, scale (0.4-2, larger means coarser detail), strength (displacement), speed (0 freezes), detail (1-3 noise octaves), irregularity (frequency variation), reach (alpha dilation), opacity, softness and colorInfluence. Other continuous controls clamp to 0-1. Instance config/palette/seed remain independent.

One SVG filter combines two seeded, continuously changing noise fields with the canonical wordmark alpha. The field never has a rectangular visible backing. Dark themes additionally clip to the exact original silhouette. The clean identity and shared theme shadow remain underneath. Browser-native SVG animation drives noise frequencies; no JavaScript animation loop or new dependency. Its clocks are deterministic and periodic, not mathematical non-repetition.

Mobile caps fine noise at one octave (desktop two by default). Reduced motion and forced colors suppress the field and retain the identity. Pause, offscreen and hidden-document states suspend the SVG timeline. Server rendering guards the browser-only SVG animation API.

The prior training describes the retired emission engine, not these new controls. Its central finding and release/evidence references are retained in [the evidence bank](case-studies/djamespoer/evidence.md).

---

The following V1 description is preserved as historical design evidence, not current implementation documentation.

# SCRUM-75 â€” BEDLAM V1

The canonical SVG is `public/assets/brand/djamespoer.com.logo.svg`, copied byte-for-byte from James's supplied `djamespoer-lll-mask.svg`. SHA-256: `9a35d8162a08aeedce028bfd487cd2eb610ee425714273ac474ca885e6e4a4a6`. Its vector paths are immutable. Cooper Black-style lettering describes recovery provenance only; no runtime font supplies the silhouette.

The header Home link retains its native navigation semantics and accessible name. Three transparent canvas fields fill the identity container, including the space outside the letterforms. Two fixed CSS masks consume the canonical SVG: a permanent readability anchor and the changing treatment. No letter geometry or position is animated.

## Replaceable cartridges and slots

Each cartridge implements `step`, `draw`, `chatter`, and `destroy`. A factory receives dimensions and an independent random source. `pool.ts` is the only membership list. The controller takes an injectable registry and has no concrete algorithm branches. Removing/replacing cartridges requires only changing the pool; at least three distinct IDs must remain.

Partial Fisherâ€“Yates selects three distinct entries and assigns them in order to A/B/C, yielding 60 ordered arrangements from five. Only those three are instantiated, stepped and drawn. All five implementations and the controller are behind the component's dynamic runtime import.

| Cartridge                | V1 mechanism                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physarum                 | Three directional trail sensors, steering, deposition, diffusion and decay                                                                                             |
| Cyclic cellular automata | Eight cyclic states, synchronous successor updates, Moore neighborhood and toroidal boundaries                                                                         |
| Point-vortex dynamics    | Four interacting signed softened vortices with passive tracers; simultaneous core updates; tracer wrapping is a visual boundary treatment, not a periodic fluid solver |
| Grayâ€“Scott               | Two concentration fields, reaction/feed/kill equations and explicit diffusion                                                                                          |
| Curl-noise advection     | Finite-difference curl of a smoothly interpolated random scalar potential; slowly translated field, toroidal particles                                                 |

All return bounded state-derived centroid/energy chatter. Chatter controls its own layer's translation (Â±4%), rotation (Â±4Â°), scale (1.06â€“1.12) and opacity (0.15â€“0.25). Slot A controls mask color; B opacity (0.90â€“1); C shadow depth (1â€“4px). Slot behavior does not depend on cartridge identity. Chatter is clamped and low-pass filtered; raster color/alpha changes are slew-limited. There are no canned CSS keyframe animations.

## Motion, lifecycle and limits

`Bedlam.speed` is a normalized 0â€“1 input, default 0.12. It controls the clock for complete fixed simulation steps, preserving diffusion/deposition/neighbor-rule relationships even when slowed dramatically. Default is approximately 0.96 steps/second; maximum is eight. Presentation is capped at 30 updates/second. Raster fields are only 96Ã—32; particle counts are 160â€“180. No dependencies or auxiliary textures are required.

The footer pause/play wiring retains application-owned pause state shared with the header identity, but its control is hidden with display: none by product direction. The logo is the sole Home link; motion controls do not occupy primary navigation. Reduced motion prevents scheduling animation, including after live preference changes. Document visibility and IntersectionObserver suspend offscreen/background work. Destruction cancels animation, disconnects observers, removes listeners and releases cartridge state. Canvas/import failure leaves the fixed SVG identity available. There is no catch-up burst after inactivity.

Engineering checks do not establish visual acceptance, screen-reader/device acceptance, measured battery cost, or production Lighthouse/axe results. James must inspect readability and composition on desktop/mobile, pause/focus behavior and reduced-motion presentation. Some seeded numerical systems can settle into less interesting states; V1 does not manufacture arbitrary resets to conceal that behavior.


## Operation BEANO checkpoint verification - October 19, 2026

Production build/prerender and budgets passed after guarding the server-absent SVG pause API. Five directly affected tests passed. Chrome checks covered eight themes at 1440px/390px, reduced motion, forced colors and offscreen pause, with no page errors/overflow. A corrected 56-second on-screen observation (seven screenshots) confirmed continuing noise mutation; the initial observation was discarded because media/viewport state had paused evolution.

That active sample recorded 6.30 seconds of Chrome TaskDuration and about 0.0003 seconds of ScriptDuration over 56 seconds, including screenshot work. This is not an isolated filter-cost or GPU/battery measurement. The filter redraw cost remains a concern despite reducing initial JS from 442.66 kB to 436.64 kB. Do not claim a general performance improvement. Visual acceptance remains withheld: fine mottling/roughened lettering is not yet a convincing disturbance field. No production deployment.
