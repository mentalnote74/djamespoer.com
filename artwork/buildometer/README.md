# Buildometer carousel gateway V1

One original built-in imagegen scene: an absurdly overbuilt period muscle car
under load in a late-1970s/early-1980s chassis-dyno cell. The car is the primary
subject; restraints, rollers, cooling, probes and secondary analog instrumentation
explain measurement attached to the actual work. No project data is pictured.
Dark/unused instrumentation is scenery, not an invented zero or a measurement.

The complete generation prompt is in prompt.txt. dyno-master.png is the unchanged
selected original. source.json records its SHA-256, dimensions, crop and output
sizes. A single dark right-edge padding pixel normalizes 2171×724 to 2172×724.
Mobile uses a registered 1800×600 crop at (300,80), preserving the car and dyno.

Real semantic HTML supplies Buildometer / Know exactly what you are doing. /
Explore. The link uses the existing /buildometer destination. No dashboard, metric
provider or API is mounted by the slide. No copy is embedded in the artwork.

One responsive picture, AVIF with WebP fallback, lazy/async. Desktop candidates
768/1440/2172; mobile 384/768. At the verified sizes, selected image bodies were
74,001 bytes (1440px desktop, DPR1) and 24,507 bytes (390px mobile, DPR2).
A second raster layer was unnecessary: the single scene preserves the car detail
at these sizes without paying for an overlapping focal decode.

The first-use SVG adds only registered local mechanical/instrument response:
blower pulley, feeding strip-chart paper, gauge needle, scope trace and a lamp.
CSS owns motion; no filter surfaces, JS animation loop, dependency or real metric
claims. Artwork pause is independent of carousel auto-advance. Inactive/hidden
documents pause motion. Reduced motion is static; forced colors removes artwork
and retains the semantic title, line and link.

Regenerate delivery assets:

    node scripts/buildometer-slide/optimize.mjs

Verification: production build/budgets without warnings; 23 existing Carousel
tests passed. Built Worker at desktop 1440px and mobile 390px/DPR2: no new image
request before selection, one initial Engineering request, unchanged carousel
height after selection, no horizontal overflow, console errors or failed requests.
Keyboard artwork pause/resume, light/dark theme environments, reduced motion,
forced colors and scoped axe (zero violations) passed. A selector specificity
issue found in forced-colors inspection was corrected before release.
The previews are actual built-component captures, not image mockups.
