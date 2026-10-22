# IPS / PowerSchool carousel gateway V1

One original built-in imagegen fixed environment/chassis: railroad signal-tower
interlocking desk crossed with administrative workflow. Its selector socket,
exposed linkage channel and two empty route apertures were deliberately generated
without the primary moving parts. Foreground openings reveal deeper mechanical
logic and the space beneath the desk. This is a visual metaphor, not an IPS
product screenshot or a newly claimed career artifact.

Real semantic HTML: IPS / PowerSchool / Put the rules where the work happens. /
Explore. The link uses the existing /case-studies/ips destination.

## Three readable beats

The registered SVG adds a substantial selector, main transfer rod, two sliding
gate leaves and mechanical locking bolts. Material gradients and edge highlights
keep moving parts in the timber/brass/steel family. Theme colors affect only
route-aperture light and restrained reflections; the machine is not recolored.

One eight-second CSS cycle:

- 0.24–1.12s: selector throws through 72 degrees.
- 1.12–2.24s: linkage travels 65 source pixels.
- 2.24–3.44s: one gate opens while the other closes.
- 3.44–3.92s: the incompatible route bolts shut.
- The chosen state holds, then the gates, linkage and selector reset in order.

The consequential beats complete within a normal five-second carousel visit.
No synchronized glow, moving ribbon, filter surface, canvas, new dependency or JS
animation loop. Artwork pause is independent of carousel auto-advance. First-use
enhancement happens after hydration. Inactive/hidden document motion pauses.
Reduced motion retains a static coherent state; forced colors retains the title,
supporting line and Explore without decorative artwork.

## Layered delivery

Unchanged master: interlock-master.png. Exact prompt: prompt.txt. SHA-256, crop
geometry, encoder settings and output sizes: source.json. Regenerate with:

    node scripts/ips-slide/optimize.mjs

A single right-edge padding pixel normalizes 2171×724 to 2172×724. Cheap room
plate: AVIF28/WebP46, desktop 768/1440 and mobile 384/768. Sharp mechanism strip:
AVIF60/WebP82 at 640/960/1320, source rectangle (760,0,1320,724). A one-percent
edge feather blends it back into the room; moving silhouettes remain vector.

Mobile uses (420,-140,1800,600), padding 140px of the same dark ground above the
original. Both layers and the SVG use that exact coordinate transform. This keeps
the full selector/linkage/two-gate sequence below the copy and preserves a small
margin beneath the lower gate. An ImageMagick gravity carry-over found during
assembled-scene inspection was corrected by explicitly resetting crop gravity to
northwest after padding. Original source pixels and geometry remain unchanged.

Selected complete image bodies: desktop DPR1 89,054 bytes; 390px DPR2 41,409 bytes.
AVIF first, WebP fallback. All images lazy/async; no artwork request before
selection. No new data/provider request or change to Engineering discovery.

## Verification

Production build/budgets pass without warnings. Existing Carousel tests 23/23.
Actual built desktop/390px scene inspected at real-speed 0/1.2/2.4/4-second states:
throw, transfer, gate exchange and lock are distinct. Keyboard artwork pause/resume,
light/dark environments, reduced motion, forced colors and scoped axe passed
(zero violations). No overflow, carousel height change, console/hydration errors
or broken assets. Exact copy/CTA and one initial Engineering image preserved.
The included previews are captures of the assembled component, not mockups.
