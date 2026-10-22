# djamespoer.com — sunset

This is a djp.c portfolio slide. Route: /work/djamespoer. Copy: djamespoer.com / The portfolio is the proof. Recruiter is the viewer; no person belongs in the image.

## Drop in

Copy assets/ to public/assets/djp-sunset/. Copy angular/ to the matching src/app/components/djp-sunset-slide/ directory. Add DjpSunsetSlide to the carousel imports and pass its active state to [active]. The adapter uses the repository's RouterLink, PublicTrack and Lucide controls. Do not run preview.js inside Angular. Run the app build, style budgets, focused carousel checks, keyboard, real reduced-motion and accessibility checks before publishing. This package has not been deployed.

scene.html + scene.css is the native browser version. preview.js is demo-only lifecycle wiring. Serve index.html over HTTP for the standalone preview. The native Explore link uses the public absolute URL; the Angular link is a client route.

## Composition and magic

independent shallow-water refraction, caustics through natural pool openings, slow extracted shore wash, changing warm light

Background has 8% overscan per side and restrained pointer depth; focal foreground remains almost fixed. Alpha gaps in palms, rock rims and pools expose deeper layers. Supporting detail plates are intentionally low fidelity. Source edits share a common 2172 × 724 CSS registration space, with a few pixels of generated size variation; these are artistic reconstructions, not pixel-identical separations.

Desktop is 3:1. Mobile is deliberately taller at 2:1, retaining full vertical scenery and a central-right crop. Carousel host must allow that shared mobile height; do not force this into a 3:1 mobile slot. The mobile layer choices are explicit, avoiding accidental high-DPR downloads. Desktop sizes select the large capped plate. No full master is requested by runtime HTML.

Motion pauses manually, offscreen, with document hidden, when inactive in Angular, and under prefers-reduced-motion. Forced-colors displays semantic copy and controls. Use [active] from the existing carousel. Scope theme influence to light, not material recoloring.

## Browser image bodies

AVIF desktop 59569 bytes; mobile 22427 bytes. WebP fallback desktop 206118 bytes; mobile 69296 bytes. These are file body totals, excluding HTML/CSS/JS and HTTP overhead. Reused moonlight glow images download once. Source PNGs are archival only, supplied separately.
