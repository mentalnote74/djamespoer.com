# Registered slide geometry and destination heroes — October 23, 2026

The repair brief described the 14-card deck before the approved piglet was added.
All **15 currently deployed cards** were audited. **Eight of the original 14 sets,
plus the piglet (nine of 15)** needed correction. Engineering, UX, Accessibility,
AI, Impact and Creative already preserve their 3:1 raster geometry.

## Findings and correction

There was no evidence of an automatic codec trim. Earlier recipes deliberately
exported tightly cropped effects/foreground strips/face patches, independently
resized layers and reconstructed them with CSS boxes. Sunset caustics were then
stretched into a different ratio. Several original imported masters had one- to
three-pixel edge-size differences. Buildometer's retained ImageMagick gravity
also clipped its mobile crop to 384×124 / 768×248; IPS cropped past the right edge.

Regenerated from the actual archived PNG masters, not damaged delivery files:

- Conservatory: background, foreground, interior, reflections.
- Sunset: background, shore, foreground, swash, caustics.
- Moonlight: background, shore, foreground, glow, cloud, moon.
- EXL: infrastructure and service bay.
- IPS: room and interlock hardware.
- Thingamajob: apparatus, index wheel, inspection record.
- Buildometer: dyno, including its corrected mobile camera crop.
- Blognostisphere: sky, foreground, two cloud depths, wisp, spectral, amber, cyan,
  reflection and brass plates, using the original registered masks.
- TCC piglet: base plus open/wink eye and rest/kiss mouth, using the original
  registered holes/alpha overlap and expression masters.

The established source space remains **2172×724**. Local source selections are
placed back at native coordinates on that full transparent stage BEFORE export.
Mobile camera crops apply identically to all layers in a family. Out-of-bounds
camera space is explicitly padded. Sources and archived masters remain unchanged.
No automatic trim, nonuniform reconstruction or upscaling of damaged assets.

Current recipes: scripts/slide-assets/sets.mjs; generator: generate.mjs in that
folder. Old per-component optimize entry points delegate to this corrected path.
Scene-specific preparation remains in the two small prepare.mjs mask/face recipes.
Runtime assets: public/assets/registered-slides/<set>/<desktop|mobile>/.
The reusable SlideImage picture only owns AVIF/WebP sources, dimensions and load
priority; existing scene components retain all behavior, composition and Magic.

Desktop candidates are **768×256, 1440×480, 2172×724**. Mobile candidates start at
**384×128, 768×256, 1200×400**; magnified world sets additionally offer 1440×480
and native 2172×724. EXL's native camera crop caps at **1050×350** instead of 1200.
Every layer and format shares its family's exact targets. Sizes accounts for
mobile world magnification/overscan, not just viewport width. Native focal art
supplies 2× at the destination hero's **1086px** cap, with no fabricated 2560px art.
The common mobile carousel slot and every scene stage are now consistently 3:1.

## Destination composition and tall-hero defect

SlideHero now places the page's real H1 in the selected registry heroCopy zone.
Desktop/mobile alignment, usable width, ink and the optional Creative readability
shade live beside visual/destination metadata. Original scene scrims are retained.
No duplicate external H1, title baked into art, hidden identity or self-CTA.
Native perspective and Thingamajob heroes already own their H1 in the correct
copy-safe zone and retain that implementation; their presentation is capped too.
Existing copy, subtitles, page content, metadata and routes remain intact.

A separate actual hydration defect caused excessive height: changing the selected
variant before the initial deferred view hydrated retained BOTH conservatory and
beach nodes (724px total at 1086px wide). A tiny SlideVisualReady directive signals
from the real hydrated child view. Only then does the existing one-time random
selection run. The formerly failing sunset initialization now contains ONE 362px
scene; repeated ready events cannot reshuffle. No timer guess, eager all-art import,
random server rendering or shuffle rewrite. Physical carousel DOM/order logic,
IDs, labels, controls and approved cards are unchanged; rejected old TCC/D&R art
remains excluded.

## Delivery impact

Actual selected image-body bytes, carousel viewport 1440 / 390, **DPR 2** both
before and after. Duplicate URLs count once; Thingamajob includes its SVG rasters.
This compares real resolution choices, not encoded folder totals or PNG masters.

| Set | Desktop before → after | Mobile before → after |
| --- | ---: | ---: |
| djp-conservatory | 64,560 → 129,521 B | 24,958 → 54,170 B |
| djp-sunset | 59,569 → 152,736 B | 22,427 → 57,999 B |
| djp-moonlight | 59,138 → 155,110 B | 21,845 → 60,482 B |
| exl | 81,949 → 101,332 B | 41,893 → 26,771 B |
| ips | 131,560 → 151,526 B | 41,409 → 24,226 B |
| thingamajob | 133,884 → 139,537 B | 30,851 → 37,004 B |
| buildometer | 142,761 → 142,983 B | 24,507 → 21,399 B |
| blognostisphere | 120,774 → 279,247 B | 44,053 → 103,967 B |
| tcc-ux-pig | 46,789 → 64,451 B | 13,299 → 11,260 B |


Higher DPR-appropriate resolution and retained canvases cost more bytes in some
sets; this is reported rather than disguised as a compression win. Mobile exports
remain separate and capped; supporting qualities remain lower than focal plates.
Six unaffected slide payloads did not change. Initial app bundle: approximately
459.46 → 459.57 kB before the tiny hydration-ready signal; final build receipt
records the release's actual total. No new dependencies, JS animation loop,
canvas/WebGL, backend/data changes or broad performance claims.

## Guardrail and verification

npm run check:slides performs header-only validation of **626 active image files**,
checking exact family targets, common layer dimensions, 3:1 ratio and missing files.
Registry visual coverage is checked. Retired cropped URL prefixes cannot re-enter
application source. This runs before every production build, requires no image
codec/dependency in Cloudflare, and fails loudly. Two focused checks reject the
real clipped crop, trimmed effect and wrong-resolution target cases.
Legacy exports/URLs and historical recipes remain preserved in Git/evidence;
they are no longer consumed by the live implementation.

Production build/style budgets and 37 focused carousel/case-study/hero tests pass.
Built-site browser verification: all 15 cards and 13 destinations at desktop/390px,
each of three forced djp initializations, one stable selected view, real H1,
registered images, reduced motion, forced colors, keyboard and scoped axe (zero
violations). Inspected assembled scenes and moving extremes. No normal-size
horizontal overflow, missing assets, browser/hydration errors or hidden headings.

/work/djamespoer Lighthouse 13.5 under the same 1440×900 DPR-2 simulated settings:
**Best Practices 92 → 100; image-aspect-ratio and image-size-responsive fail → pass.**
Same settings are retained in the local JSON reports; this is not an observed
paint-timing investigation or a broad Lighthouse sweep.

At 200% text sizing the changed hero retains all text without internal overflow.
An unrelated pre-existing Bedlam/header identity becomes 384px wide and expands
the 390px document to 416px, reproduced identically on old PROD and this build.
It remains untouched and is not claimed fixed by this scoped repair.

Local machine receipts/screenshots: ignored tmp/evidence/geometry/. Source masks,
original PNGs and prior experiment/product history are preserved. Production
read-back and version receipts are recorded there after the normal Git release.
