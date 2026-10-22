# TCC Conservatory — Larry drop-in

James approved the conservatory and its Milky Way at twilight. This handoff develops that approved graphic. Do not return to the rejected paper models, mechanical lab, chrome sculpture, or case-study storytelling. The slide is a beautiful invitation to click.

## Start here

Open `index.html` through a static HTTP server. `scene.html` is the reusable scene fragment; `scene.css` contains component-scoped production styling. `preview.js` is a small demonstration adapter for pause, visibility, pointer depth and the light/depth controls. It is not a new application framework. An Angular adapter is included under `angular/`.

Runtime assets are all in `assets/`. Everything under `sources/`, the approved master, and the generation prompts is archival/build input: NEVER ship those PNGs to the browser. The finished visual is assembled from four small image layers plus native CSS/SVG light, mist, stars and masks.

## Layer stack, back to front

1. **Far background:** independent opaque clean plate with a Milky Way, twilight, cliffs, mist and open water. The conservatory has been removed and scenery reconstructed behind it. Display at 116% width/height, centered, to provide 8% overscan per side. Maximum demo pointer travel is 12.6 CSS px at depth 2; do not make travel consume the overscan.
2. **Stars + far mist:** native CSS. Fine star points twinkle at independently staggered periods. No diamond glitter, full-scene pulse, generic data ribbon or particles.js. The distant mist moves independently behind the architecture.
3. **Interior:** cropped from the approved scene, with the lit garden/canopy/stair retained. Placement in the common 2172×724 scene is x=1100, y=40, width=900, height=520. A traced main-aperture mask confines this layer; a 4.5% scale reserve and small opposing translation permit depth without exposing its edges.
4. **Water reflections:** severely compressed strip, at x=0, y=454, width=2172, height=270; a native polygon excludes the building and nearest leaves. Gentle independent refraction motion. Supporting blur is intentional; its role is moving reflection, not focal detail.
5. **Transmitted light:** SVG/CSS behind the foreground. A broad warm wash is clipped to the arch and canopy interior. The theme's `--selected-background` influences water light; fixed architecture/material identity remains unchanged. Reuse the site's existing theme/environment tokens.
6. **Foreground:** full-canvas transparent architectural/plant cutout. The central arch, low opening, narrow glazing and exterior gaps genuinely contain alpha. Crisp stone, copper, foliage and rim detail receive the largest quality budget. This foreground occludes all deeper layers.

The clean background has real replacement content, not empty holes. The foreground is not a rectangle crop of the original illustration. `aperture.json` records the main transparent opening traced from the alpha channel, with underlap beneath the opaque rim. CSS/SVG clipping is lossless and does not depend on a lossy raster mask.

## Coordinate contract

Use one shared `world` element for ALL layers. Desktop uses the full 2172×724 source space. Mobile displays the source window x=680, y=100, width=1440, height=480. The supplied transform applies that exact window to the whole stack; do not crop the background, foreground, masks and light independently.

The image generator returned slightly different dimensions for the three masters (recorded in `manifest.json`). All plates register to the common CSS space; original PNGs are preserved unchanged. This is not a claim of pixel-identical foreground extraction. The delivered preview was visually inspected as a composite.

The default scene preserves a 3:1 ratio and intrinsic dimensions. The 390px composition is an intentional close crop of the arch, garden and leaves. Desktop retains the larger Milky Way. Do not stretch the desktop screenshot down to mobile or send a 1440px foreground there.

## Asset-body budget (decimal KB)

| Layer | Desktop AVIF | Mobile AVIF | Desktop WebP | Mobile WebP |
|---|---:|---:|---:|---:|
| Background | 3,307 B | 1,260 B | 11,210 B | 3,576 B |
| Interior | 17,381 B | 5,396 B | 50,426 B | 17,284 B |
| Reflections | 875 B | 875 B | 2,898 B | 2,898 B |
| Foreground | 42,997 B | 17,427 B | 104,398 B | 38,912 B |
| **Total** | **64,560 B** | **24,958 B** | **168,932 B** | **62,670 B** |

These are selected encoded image bodies, excluding HTML/CSS/JS/headers and caches. AVIF first, native WebP fallback. Mobile sources deliberately cap resolution per layer. No master PNG is a runtime dependency. Star/mist/light/masks add no raster requests. Re-evaluate only if the assembled result visibly fails at actual viewing size.

## Integrate into djamespoer.com

Copy `assets/` into `public/assets/tcc-conservatory/`. Copy all files under `angular/` into `src/app/components/tcc-conservatory-slide/`. Styles are colocated by responsibility: art geometry/materials, copy/controls, and motion/accessibility. Import `TccConservatorySlide` into Home and add only its carousel template with `[active]="active"`. Existing heading/supporting line/Explore route are supplied. Preserve rejected TCC V1 assets and history. Do not change D&R, the portfolio slide, Carousel architecture, backend or case-study content in this handoff. Run the repository's existing style/bundle budgets after integration; do not raise them.

Meaningful copy stays real HTML. Artwork is decorative. Bind running state to active slide, document visibility, intersection visibility, independent pause and reduced motion. The adapter implements these without an animation loop or new dependency. If more than one instance is mounted, pass unique `sceneId` values to avoid SVG-ID collisions.

Do not import `preview.js` or preview toolbar into production. The demo's Light control shows limited token influence; it is not a replacement for Living Themes. Pointer depth is optional, mouse-only, disabled while paused or reduced motion. Touch never becomes a scroll trap.

## Checks actually completed

- Desktop and 390px assembled Chrome previews inspected.
- All four selected AVIF images loaded in each composition; filenames matched the size budget above.
- Pause changed the control and running state; Resume restored them.
- No production/repository integration, full Angular build, actual OS reduced-motion emulation, axe audit, or production deployment is claimed. Reduced-motion/forced-colors rules and keyboard-native controls are supplied; Larry should run the normal single focused integration check and inspect those states in the assembled application.

Serve locally, for example `python -m http.server 8811`, from this directory, then open `http://localhost:8811/`. ImageMagick 7 is needed only to regenerate derivatives, not to run the scene. `node sources/encode.mjs` regenerates the encoded layers; set `MAGICK_BIN` if `magick` is not on PATH. Preserve the original masters.

**Protect the focal layer. Murder the supporting layers. Judge the stack.**
