# Big Dumb Bass slide — Larry handoff

Status: prepared design/asset package, October 24, 2026. Queue until Larry finishes his current assignment. No site code changed, no dispatch, no deployment. James approved the zoomed concept as good enough and requested independent compressed layers, magic, and an initially absent bass that subtly fades in.

## Start here

Open preview.html locally. It is a standalone design reference, not replacement production code. Integrate with existing Angular slide components, responsive image delivery, shared Explore arrow, hidden keyboard-accessible pause control, and PublicAnalytics/PublicTrack. Inspect current main and local work first; preserve unshipped e4f3e5e icon changes. Do not replace the existing Blognostisphere slide without checking carousel placement: this concept is a dedicated link to the Big Dumb Bass article. Confirm its current route from routing/content; known article slug is `like-a-big-dumb-bass`, not an invented `/big-dumb-bass` URL.

Exact HTML heading: **Whatever You Do, Do Not Click Here**. Standard Explore with right arrow. Neither text nor controls are baked into artwork. GA measures the slide destination's native click/keyboard activation once through established plumbing, identifies this slide separately, and excludes pause. No new analytics stack. Jira design/measurement provenance: SCRUM-128 comments 10150–10152.

## Assets and z-stack

All image plates use one 2172 × 724 (3:1) registered canvas. Stack absolute inset:0; width/height:100%; no independent crop/cover/translation per layer. Scale/crop the whole world together only if needed. At 390px preserve both lure and bass discovery; do not crop away the lure. Keep HTML readable and ensure controls do not obstruct the central object.

| z | Layer | Treatment |
|---|---|---|
| 0 | pond | Opaque background; log, plants and base particles intentionally remain merged |
| 5 | pond-caustics | CSS only, slow low-contrast light |
| 10 | bass | Transparent cutout; fixed position; brightness .62; opacity 0 initially |
| 20 | lure-halo | CSS cyan/amber radial glow, low amplitude |
| 30 | lure | Transparent cutout including all tackle/line and baked highlights; stationary geometry |
| 40 | glints and motes | A few CSS points; no runtime canvas/WebGL or effect dependency |
| 60+ | HTML copy/destination/control | Existing component architecture and focus behavior |

`masters/` contains four original PNGs (approved concept plus three AI-reconstructed plates). `assets/` contains AVIF and WebP at 768, 1440 and 2172 pixels wide. Alpha is retained for bass/lure. `opening-*` is the fish-free pond+lure poster. `fallback-*` is the complete still scene with fish; use for reduced motion/static end state, NEVER under the animated opening because the bass would be visible immediately. `manifest.json` records dimensions, bytes and SHA-256. Do not ship PNG masters or every size/format to the browser; let picture/srcset select candidates. Full concept exports are reference-only.

These are image-generation reconstructions, not pixel-exact segmentation. Preserve the accepted surreal fish depiction; do not silently redesign the approved image. Cutout highlights/edges differ from source. Inspect compressed composition at actual slide size before accepting. No separate hook/facial tiles: keeping tackle attached avoids registration and partial-face defects.

## Motion specification

Start the clock only after required plates decode, the slide is active/in viewport, and document visible. Initial view is pond+lure, bass completely absent. Hold 2 seconds, then fade bass opacity 0→1 over 5.5 seconds with ease-in-out; darkness is controlled separately by brightness .62. Hold visible for remainder of visit. Reset only on a real new slide visit, never from an intersection/visibility toggle. Preview Replay explicitly starts a new visit. No fish movement, bite, chase, mouth animation or repeated disappearance.

Lure glow: 6.8-second smooth breath, opacity .35→.72→.35 on the separate halo. Metal, line and hooks do not distort. Three staggered glints over 7.6 seconds; soft highlights, no hard flashes. Pond caustics: 16-second alternate drift under 1% of width, opacity .025–.065. Four small motes: 19-second drift, maximum 3px sideways/6px upward at reference preview, opacity about .15. Pond magic must remain subordinate to lure. Do not brighten fish enough to reveal it before intended fade.

All motion, including reveal delay, freezes on pause/offscreen/hidden; resumes from same point. User pause persists within the visit and backgrounding must not override it. Reduced motion: no timed reveal, shimmer, movement or transitions; show complete static scene with subtly visible bass. Forced colors: preserve semantic copy/link/controls; decorative effects may disappear. Pause remains keyboard/screen-reader reachable and visibly revealed on focus. Do not introduce rapid flashes or sound.

## Seamless loading / failure behavior

Use the fish-free opening poster as immediate complete imagery. Decode pond, bass and lure through actual selected responsive image elements before swapping to layers in one frame. Start reveal only after the swap. Keep poster if any layer fails; no partial layers, blank white state, indefinite spinner, unhandled rejection or retry loop. Keep destination usable throughout. On resize/srcset changes retain a complete scene until replacement candidates decode. No eager loading of the entire carousel. Opening slide/LCP priority must follow existing policy rather than assigning high priority everywhere. A poster adds bytes if fetched alongside full layers: measure that cost and consider existing prerendered static delivery/reuse before shipping.

## Verification and delivery

Compare existing homepage versus new slide with repeated cold/warm desktop and 390px runs, including throttled first arrival. Filmstrip must show complete opening then subtle fish reveal, no rectangular holes/white blocks. Record selected formats, bytes, request count, decode/readiness, LCP and limitations; no invented performance claims. Verify failed-image fallback, rapid next/back, revisit reset, hidden/offscreen pause, user pause/resume mid-delay and mid-fade, reduced motion, responsive registration, native destination/GA event count and scoped axe. Run focused tests and repository-required build/budgets. Update AI_HANDOFF.md. Stop at reviewable local commit for Codex; no push/deploy in this handoff.

Package validation: all 36 compressed variants passed dimensions, hashes and transparency checks. Local Chrome at 1440 and 390px confirmed initial bass opacity 0, final opacity 1, reduced-motion opacity 1 with no animation, no horizontal overflow and no page errors. Screenshots and browser-checks.json are included. Opening poster was visually inspected fish-free; mobile revealed composition was inspected. Copy is necessarily small at strict mobile 3:1 size; Larry must verify it against established site typography and actual content placement. No production integration, axe or performance acceptance is claimed. Three 1440px AVIF plates total 199,607 bytes; equivalent WebP plates total 292,660 bytes, excluding the opening poster. Measure the full selected delivery path before release.
