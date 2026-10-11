# SCRUM-75 — BEDLAM V1

The canonical SVG is `public/assets/brand/djamespoer.com.logo.svg`, copied byte-for-byte from James's supplied `djamespoer-lll-mask.svg`. SHA-256: `9a35d8162a08aeedce028bfd487cd2eb610ee425714273ac474ca885e6e4a4a6`. Its vector paths are immutable. Cooper Black-style lettering describes recovery provenance only; no runtime font supplies the silhouette.

The header Home link retains its native navigation semantics and accessible name. Three transparent canvas fields fill the identity container, including the space outside the letterforms. Two fixed CSS masks consume the canonical SVG: a permanent readability anchor and the changing treatment. No letter geometry or position is animated.

## Replaceable cartridges and slots

Each cartridge implements `step`, `draw`, `chatter`, and `destroy`. A factory receives dimensions and an independent random source. `pool.ts` is the only membership list. The controller takes an injectable registry and has no concrete algorithm branches. Removing/replacing cartridges requires only changing the pool; at least three distinct IDs must remain.

Partial Fisher–Yates selects three distinct entries and assigns them in order to A/B/C, yielding 60 ordered arrangements from five. Only those three are instantiated, stepped and drawn. All five implementations and the controller are behind the component's dynamic runtime import.

| Cartridge                | V1 mechanism                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physarum                 | Three directional trail sensors, steering, deposition, diffusion and decay                                                                                             |
| Cyclic cellular automata | Eight cyclic states, synchronous successor updates, Moore neighborhood and toroidal boundaries                                                                         |
| Point-vortex dynamics    | Four interacting signed softened vortices with passive tracers; simultaneous core updates; tracer wrapping is a visual boundary treatment, not a periodic fluid solver |
| Gray–Scott               | Two concentration fields, reaction/feed/kill equations and explicit diffusion                                                                                          |
| Curl-noise advection     | Finite-difference curl of a smoothly interpolated random scalar potential; slowly translated field, toroidal particles                                                 |

All return bounded state-derived centroid/energy chatter. Chatter controls its own layer's translation (±4%), rotation (±4°), scale (1.06–1.12) and opacity (0.10–0.20). Slot A controls mask color; B opacity (0.90–1); C shadow depth (1–4px). Slot behavior does not depend on cartridge identity. Chatter is clamped and low-pass filtered; raster color/alpha changes are slew-limited. There are no canned CSS keyframe animations.

## Motion, lifecycle and limits

`Bedlam.speed` is a normalized 0–1 input, default 0.12. It controls the clock for complete fixed simulation steps, preserving diffusion/deposition/neighbor-rule relationships even when slowed dramatically. Default is approximately 0.96 steps/second; maximum is eight. Presentation is capped at 30 updates/second. Raster fields are only 96×32; particle counts are 160–180. No dependencies or auxiliary textures are required.

The adjacent native toggle button pauses/resumes the identity. Reduced motion prevents scheduling animation, including after live preference changes. Document visibility and IntersectionObserver suspend offscreen/background work. Destruction cancels animation, disconnects observers, removes listeners and releases cartridge state. Canvas/import failure leaves the fixed SVG identity available. There is no catch-up burst after inactivity.

Engineering checks do not establish visual acceptance, screen-reader/device acceptance, measured battery cost, or production Lighthouse/axe results. James must inspect readability and composition on desktop/mobile, pause/focus behavior and reduced-motion presentation. Some seeded numerical systems can settle into less interesting states; V1 does not manufacture arbitrary resets to conceal that behavior.
