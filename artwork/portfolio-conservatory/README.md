# djamespoer.com conservatory carousel artwork

Coach supplied the two archives on October 22, 2026, then explicitly corrected
their destination: this is the **djamespoer.com** slide, not TCC. The original
package filenames and `supplied-instructions.md` retain their historical TCC
labels; those labels do not control the application integration.

The existing PortfolioSlide hosts the supplied four-layer conservatory scene.
Its semantic copy remains `djamespoer.com`, `The portfolio is the proof.`, and
`Explore`, pointing to `/work/djamespoer`. No TCC carousel entry was restored.

## Preservation and delivery

- `sources/` preserves supplied masters, generation prompts and encoding script.
- `manifest.json` preserves source/output hashes and common scene coordinates.
- `aperture.json` preserves the supplied lossless aperture trace.
- `verification.json` records the supplier's preview checks, not application QA.
- Production derivatives live only in `public/assets/portfolio-conservatory/`.
- Original rejected TCC/D&R artwork and the earlier portfolio-plane artwork
  remain preserved independently; no historical assets were deleted.

All 14 AVIF/WebP derivatives are copied byte-for-byte. Selected AVIF bodies are
64,560 bytes desktop and 24,958 bytes mobile. The original 2172×724 shared space,
8% background overscan and mobile window (680,100,1440,480) remain unchanged.

## Angular integration

Artwork is decorative; real HTML owns the title, supporting line and Explore
link. Fixed architecture/material colors remain supplied artwork; the existing
selected-background token influences transmitted water light.

Motion requires active slide, visible document, intersection visibility, no
individual pause and no reduced-motion preference. Pointer depth is mouse-only
and resets on pause/leave/reduced motion. Forced colors keeps semantic copy and
controls, hiding decorative art.

The supplied separate stylesheets exposed an Angular emulated-encapsulation
issue: keyframe definitions were renamed while animation references in another
stylesheet were not. References now share the motion stylesheet with their
keyframes. Timings, geometry and artwork remain the supplied recipe.
