# Blognostisphere carousel gateway

Approved source: `magic-v2.png`, supplied by James on October 22, 2026. The earlier
`concept-v1.png` was inspected for reference; it is not runtime artwork. The focal
machinery/platform retains the approved source pixels. Neither archival PNG is
served or requested by the Angular slide.

`scripts/blognostisphere-slide/optimize.mjs` separates registered silhouettes,
framework/arch openings and feathered photographic effect plates with ImageMagick,
then encodes bounded AVIF/WebP assets. `source.json` retains master hashes,
coordinates, quality settings, dimensions and per-file bytes. Regenerate from the
repository root with `node scripts/blognostisphere-slide/optimize.mjs`.

The only generated artwork is `sky-inpaint.png`, an occluded background fill made
with the built-in imagegen tool. Original open-sky pixels are composited back over
it before compression. The inpaint does not replace the approved focal machinery.
Prompt:

> Edit target: the supplied approved 2172x724 panoramic Blognostisphere illustration.
> Make ONLY a clean background plate for layered compositing: remove all foreground
> brass machinery, glass fins, cylinders, cables, stone platform, railings and arches
> on the right. Fill the removed areas with a continuation of the existing distant
> twilight mountains, deep blue starry sky and luminous soft cloud sea. Retain the
> exact sunset on the left and its palette, horizon position and the existing
> left-side mountain/cloud composition. Keep wide 3:1 framing, no text. This is a
> background-only support plate; no new focal objects. The original foreground will
> be composited back over it unchanged. Preserve plausible cloud depth and sky
> rather than creating a new scene.

Ten runtime plates: sky/mountains; far clouds; near clouds; arch wisps; original
foreground; spectral light; amber chamber; cyan chamber; wet-stone reflections;
selective brass highlights. Scene-specific CSS finishes the glass refraction,
contained amber circulation, cyan directional bands and four staggered stars.
There is no whole-image transform, blanket glitter, animated filter or JS loop.
Keyframes and their references share the motion stylesheet for Angular scoping.

Desktop is 3:1. Mobile uses the existing stable 2:1 carousel slot and a 150%-wide
world shifted -45%, retaining both chambers, fins and the platform. Lower-resolution
supporting layers are intentionally soft; foreground remains protected. AVIF
selected totals: **120,774 desktop / 44,053 mobile bytes**. WebP fallback totals:
353,916 / 115,606 bytes. No desktop image is selected at <=600px.

Motion runs only for the active, onscreen, foreground-document instance. The
keyboard-accessible artwork pause button suspends every layer independently of
carousel auto-advance. Reduced motion keeps the composition static, including the
vortex pseudo-element; forced colors retains semantic title/Explore without art.
The single Explore link is named Explore Blognostisphere and goes to the existing
index. No tagline added. Existing approved slides remain intact; TCC/D&R excluded.

Verification receipts and moving-extreme captures are under ignored `tmp/evidence/`.
Local Chrome viewport measurements are checks of this machine, not claims about
physical-phone frame rate or Lighthouse score.

Production build/budgets and 23 existing carousel tests passed. The initial
bundle remains 459.74 kB; the lazy home chunk increases from 102.18 to 114.35 kB
(approximately +1.82 kB estimated transfer). No added dependency. Focused
desktop/390px checks cover all 15 scoped CSS animations, actual selected image
bytes, zero new-slide art requests on initial Engineering startup, one Engineering
image fetch, stable carousel height, normal playback CLS 0, keyboard interaction,
all suspension conditions, reduced motion, forced colors, scoped axe and clean
browser/asset responses. Playback samples recorded no layout work. Frame timing
varied on this machine: one 390px run had nine >50 ms gaps; a subsequent paired
three-second comparison had zero while active and three while paused. Paired
active/paused task time was approximately 613/250 ms desktop and 477/206 ms at
390px; layout was below 0.3 ms in each paired sample. These are local whole-page
observations, not a physical-phone benchmark. Deliberate accessibility-mode
switches caused whole-page reflow (including ~0.012 at 390px), recorded separately
from ordinary playback.
