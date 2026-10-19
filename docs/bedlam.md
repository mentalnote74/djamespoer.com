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
