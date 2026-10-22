# EXL LifePRO carousel gateway V1

One new eighth slide, after Thingamajob. Engineering stays first. Explore uses the
existing `/case-studies/exl` destination. Carousel architecture, existing slides,
routes, EXL content and product functionality are unchanged. This is a local review
checkpoint only; Coach explicitly requires review before any PROD push/deployment.

## Artwork and layers

Built-in imagegen produced one original `infrastructure-master.png`; see the exact
prompt in `prompt.md` and original hash/crop/encoding lineage in `source.json`.
The 2171×724 original is preserved. Delivery adds one dark right-edge pixel to
normalize 2172×724 / 3:1 coordinates without stretching any machinery.

The first read is a large, still-operating steel enterprise installation. The
second read is the small silver bridge module in its service bay, with incoming
tangled infrastructure and ordered outgoing connectors in the same old chassis.
The lower modules remain evolutionary additions, not a fantasy replacement system.

Two raster layers share the exact original coordinates:

- Deep infrastructure: AVIF 34 / WebP 58; desktop 768/1440, mobile 384/768.
- Foreground jamb, service bay, retrofit, contacts and monitor: AVIF 58 / WebP 82;
  widths 384/640/930. This layer receives the detail budget. Its strip boundaries
  blend over the same source pixels; they are not decorative scene boundaries.

The mobile scene is a deliberate 1050×350 crop at (850,100), not a shrunken entire
installation. Its prominent old chassis frames the small fix at readable size.
The focal strip is registered at (900,0), 930×724 in both compositions.
All runtime files live under `public/assets/exl-lifepro-slide/`. The master/review
images are references, never browser dependencies. Regenerate only with
`node scripts/exl-lifepro-slide/optimize.mjs`; no application dependency was added.

## Donut and Magic

The service opening, gaps around the wiring, instrument glass and empty rack slot
are natural apertures. No decorative hole was drawn. Local SVG instrument behavior
occupies the existing diagnostic glass: an irregular trace yields to a steadier
reading. The retrofit contact and inspection lamp have separate slow rhythms;
downstream lamps register in order. Steel, wiring, fan and chassis stay static.
There is no moving ribbon, animated stroke traveling along a wire, global glow,
JS animation loop, canvas or generic visual-effects system.

CSS/SVG provide the diagnostic material and restrained theme-fed reflections, so
they require no extra raster downloads. Materials retain their fixed steel/cream/
warm-metal identity. A dedicated keyboard-accessible motion control is independent
of carousel auto-advance. Off-slide/document-hidden motion pauses; reduced motion
is static, with the architectural story intact. Forced colors retain title/copy/link.

## Composite evaluation

Actual built-Worker Chrome renders were inspected at desktop 1440px/DPR1 and
390px/DPR2, with light/dark environment changes, actual-speed 4/8-second frames,
and frozen reduced-motion states. Mobile's main read remains big chassis/small fix;
the finer diagnostic screen is more apparent on desktop. No visible strip seam or
alpha halo was found at normal size. There are no lossy raster masks; clipping is
the unchanged SVG/CSS aperture geometry. Detail is spent on the service bay rather
than forcing the deep racks to look pristine in isolation.

Observed cold encoded artwork bodies (HTTP headers/page bytes excluded):

| View | Background | Focal bay | Total |
| --- | ---: | ---: | ---: |
| Desktop 1440px/DPR1, AVIF | 22,197 | 34,323 | **56,520 B** |
| Mobile 390px/DPR2, AVIF | 7,570 | 34,323 | **41,893 B** |
| Mobile 390px/DPR1, WebP fallback | 6,924 | 27,670 | **34,594 B** |

Both pictures remain lazy; zero EXL image requests occur before slide selection.
Engineering retains its single initial parser-discovered request. Intrinsic 3:1
geometry is stable when switching slides. Focus/keyboard, independent artwork
pause/resume, forced colors, reduced motion, CTA navigation and scoped axe pass;
no overflow, missing assets or browser errors were observed. Production build and
existing budgets pass without warnings; the existing carousel suite passes 23/23.
No Lighthouse, paid evaluation, case-study rewrite, new route or PROD deployment.
