# Thingamajob carousel artwork V1

One original image, generated with the built-in imagegen tool (not the CLI),
then delivered as responsive AVIF/WebP. `apparatus-master.png` is the untouched
2172×724 selected master. `source.json` records its SHA-256 and exact crop locations.
Regenerate delivery files with `node scripts/thingamajob-slide/optimize.mjs`.
No runtime image processing or additional application dependency is required.

The mobile 1470×490 crop is a close inspection of the intake rollers, central
mechanism, chemistry chamber, held record and output. It uses the same artwork
and registered coordinates, not another scene. The desktop's loose intake stack
remains outside that crop; the fed record and orderly output are retained.

## Composition and motion

The large open chassis, glass chemistry chamber and held-record window are
separate apertures into deeper machinery. A cutout from the actual indexing
wheel rotates behind its rim. SVG chemistry, a small inspection feed and three
lamps have separate CSS rhythms; the drum, gauge, pipes and retained record remain
static. Enhancement cutouts load only after hydration and first activation.
Fixed material colors retain the machine's physical identity; a small
glass reflection uses the active theme. Motion pauses when the slide is inactive
or the document is hidden, and stops with reduced motion. Forced colors retain
only the semantic title, supporting line and native link.

The destination is isolated in `THINGAMAJOB_SLIDE_DESTINATION`. It currently
uses `/thingamajob#case-study-heading`, an existing case-study section. No new
dedicated case-study route was invented.

The same component is the /thingamajob page hero: `pageHeading` selects its H1
and eager hero-image delivery, `showExplore=false` omits the gateway link. The
interior-only pause control does not change the carousel's rotation controls.
Both consumers use these same tracked production assets and registered motion.

## Generation prompt (verbatim)

Create ONE finished original editorial artwork for a sophisticated professional portfolio carousel, a panoramic composition approximately 3:1 (wide landscape, ideally 3072x1024). NO typography, NO title, NO captions, NO watermark. This is an exquisitely crafted physical evidence-processing apparatus: 1970s experimental research laboratory meets kinetic mechanical music machine meets Cold War analog control room, with restrained lava-lamp chemistry. Absurdly over-engineered yet credible and purposeful, not goofy or toy-like. Cinematic detailed miniature/model photography with beautiful believable materials, exquisite brass and aged steel, oxidized sea-glass painted panels, warm ivory instrument faces, glass, machined screws, deep cast shadows, directional warm coastal daylight and cooler workshop interior. NOT cyberpunk, NOT futuristic AI, NOT a holographic dashboard, NO brain, NO abstract ribbons, NO arrows.
COMPOSITION: leave the leftmost 27 percent mostly quiet dark blue-green workshop shadow, with subtle physical atmosphere and minimal detail, for real HTML title later. The machine dominates the remaining 73 percent, not lost in an enormous room. Clear hierarchy, one impressive central mechanical inspection assembly, separate brass/glass chemical vessel, secondary dark inspection apertures and mechanical discoveries. A loose stack of torn cream documents with tiny illegible marks enters at lower-left of the machine around x32%, gets aligned by an intake roller; mechanical stages align and inspect evidence; an amber-glass side holding well retains questioned document fragments; an old punched record preserved in a side reel while a corrected record moves forward. At far right a small calm output tray holds three neatly aligned modest ivory evidence records, not glamorous or dominant. The machine does not conjure a fictional resume.
SPECIFIC ART-DIRECTION FOR LATER MECHANICAL ANIMATION: design several naturally dark readable inspection openings, NOT one central donut. At about x55%, y49%, a large irregular rounded rectangular open chassis window reveals deep mechanical space and a small indexing wheel; at x73%, y45%, a tall glass chemistry cylinder with a dark interior and copper rim, modest translucent teal liquid; at x85%, y36%, a small round ivory-faced analog gauge with clear bezel, needle can be static and understated. Below central window, a broad rotating evidence drum set in a recessed horizontal aperture. Several open gaps between pipes expose more deep space. Openings belong naturally to apparatus, with realistic occlusion and reflected glass highlights. These separate voids should visibly offer access to deeper machinery. Strong tangible near/mid/far depth, not flat illustration.
AVOID an undifferentiated junk pile: the central inspection window and brass mechanism are focal, a few larger forms anchor the device, smaller knobs/relays/pipes are supporting. Left title zone stays quiet. At small size the silhouette must still read as one impossible purposeful machine with evidence entering and organized records leaving. Absolutely no drink glasses, beach props, palm trees or novelty decoration. Warm neutral physical craftsmanship, rich teal shadows, muted amber chemistry, restrained ruby indicator lamps. Right-side machine should remain coherent when its central/right portion is cropped for mobile. Keep important machine and garnish/details within image edges. Complete artwork, highly polished, curious and mechanically persuasive.
