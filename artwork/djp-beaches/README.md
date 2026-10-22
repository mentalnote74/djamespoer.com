# Additional djamespoer.com beach carousel scenes

Coach supplied both packages on October 22, 2026 and authorized integration
alongside the existing conservatory. These are djamespoer.com slides, not TCC
or D&R; both rejected slides remain excluded.

Each scene's directory preserves the original masters, prompts, encoding inputs,
manifest, supplier README and supplier verification record. Supplier preview
checks do not stand in for the application's integration checks. Runtime HTML
uses only the supplied byte-identical AVIF/WebP derivatives under
`public/assets/djp-sunset/` and `public/assets/djp-moonlight/`. Source PNGs are
archival inputs and are never application assets.

## Integration

The supplied standalone Angular components retain the shared 2172×724 source
registration, layer stack, masks, motion timings and deliberate 2:1 mobile crop.
Both show real HTML `djamespoer.com` / `The portfolio is the proof.` / `Explore`
with the existing `/work/djamespoer` route. Home passes carousel active state.
Sunset preserves shallow-water refraction, caustics, shore wash and warm light;
moonlight preserves staggered near/far bioluminescence, cloud drift and moonlight.

Animation declarations share the motion stylesheet with their keyframes to
avoid Angular's independent per-stylesheet keyframe renaming. Hosts display as
full-width blocks; controls use the site's existing icon sizing and UI font.
No preview script or new runtime dependency is imported.

The homepage sets one stable mobile 2:1 carousel slot. Existing 3:1 scenes remain
centered with their original geometry, so slide changes cannot crop the new
scenes or move controls/content below the carousel. Desktop remains 3:1.

## Selected AVIF bodies

| Scene | Desktop | Mobile |
| --- | ---: | ---: |
| Sunset | 59,569 bytes | 22,427 bytes |
| Moonlight | 59,138 bytes | 21,845 bytes |

Moonlight's two glow regions reuse one URL/request. All pictures remain lazy;
neither beach requests artwork on the initially selected Engineering slide.

Local integrated Chrome desktop/390px checks cover assembled motion phases,
pointer-depth extremes, keyboard pause/resume, reduced motion, forced colors,
scoped axe, responsive slot stability and Explore navigation. Production build
and existing 23 carousel tests pass. No carousel behavior, existing artwork,
backend, metric, career data or other page implementation changed.
