# TCC — wink, then kiss

Owner-directed photorealistic piglet, replacing the rejected cartoon direction.
One new TCC slide is authorized; the earlier rejected TCC/D&R artwork stays excluded.
Exact visible HTML: **Like the status quo? Then pucker up.**
Explore → `/case-studies/tcc`, accessible name **Explore the TCC case study**.

## Sources and registration

The built-in image_gen tool generated the resting master and two localized edit
references. Complete prompts: [prompts.json](prompts.json). Original PNGs are
archival, never requested by the application. SHA-256 receipts, crop coordinates,
responsive widths and encoded sizes: [assets.json](assets.json).

The original is 2172 × 724 (3:1). The kiss edit returned 2171 × 724; the optimizer
normalizes that one-pixel width difference before extracting only the mouth.
Runtime uses the unchanged head/background from the resting master, with holes
under the one eye and mouth. Four snug photographic patches fill those holes,
with opaque overlap and feathered skin edges. The alternate poses replace the
resting features; they do not stack eyes/lips or distort the snout/head.

Regenerate encoded assets with `node scripts/tcc-pig-slide/optimize.mjs` using
ImageMagick (existing local tool; no application dependency). Runtime files live
in `public/assets/tcc-pig/`: AVIF first, WebP fallback, base capped at 1440/768 px,
eyes at 185/96 px, mouth at 400/192 px. All have intrinsic dimensions and lazy
loading; there are no runtime PNG or full-frame pose replacements.

## Motion and responsive behavior

CSS discrete registered replacements: wink at 1.50 s, open again at 2.05 s,
kiss at 2.40 s, rest at 3.40 s. Period 11.40 s: eight seconds of rest afterward.
The rest of the pig and background never move. No animation library or JS loop.
Animation names and keyframe references share one Angular-scoped stylesheet.

All five images must be loaded before the sequence starts. Active slide,
intersection and document visibility gate animation eligibility. Losing any
gate removes the animation and resets to rest; reactivation restarts from rest.
The existing artwork pause button freezes/resumes the current expression.
Reduced motion shows open eyes and a puckered kiss with no timed changes;
forced colors removes decorative artwork and preserves semantic copy/link.

The slide itself stays 3:1 on desktop and mobile. No shared carousel geometry
changed: its existing mobile 2:1 slot centers this uncropped 3:1 scene. Copy is
left, full piglet face right. Through the existing shared registry, the TCC
destination also reuses the same artwork as its hero without duplicate copy/CTA.

## Verification — October 22, 2026

- Production build/style budgets pass: initial JS/CSS remains 459.46 kB.
- Existing focused carousel/case-study tests: 34 pass, including new TCC routing.
- Built-site Chrome, 1440 and 390 px: one complete 11.4 s sequence plus restart,
  actual wink/kiss visibility, no doubled features, seams, overflow or clipped
  ears/lips/copy/CTA. Keyboard pause/resume, inactive reset, offscreen and actual
  hidden-tab reset, static reduced-motion kiss and forced colors verified.
- Scoped carousel axe: zero violations. No console/hydration errors. Browser
  cancellation of inactive lazy images was distinguished from asset failures.
- Actually selected AVIF totals (all five images): **46,789 desktop bytes** /
  **13,299 mobile bytes**. WebP fallbacks: 37,914 / 9,026 bytes.
- Local screenshots and machine receipts: ignored `tmp/evidence/tcc-pig/`.

No prior approved slide, case-study prose, shared carousel controls, layout or
animation architecture was redesigned. Artwork judgment remains the owner's.
