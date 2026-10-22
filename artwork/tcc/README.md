# SCRUM-135 — TCC human-factors proving ground

Built-in imagegen original: lab-master.png. Prompt: prompt.txt. Hash, original
dimensions and crop/encoder lineage: source.json. Fictional period lab metaphor,
not a historical photograph or a new claim about equipment TCC used.

People test two materially different physical prototypes. Researchers observe
through glass; the hybrid takes the circular control AND the stepped control
strip. Neither source design is declared the winner. The large CSS sequence is
human control action → observation card → two modules fitted into the hybrid.
Assembly reaches the combined state within 3.76 seconds. Reduced motion retains
both modules fitted and the recorded observations. Artwork pause is independent
of carousel rotation; hidden slide/document motion pauses; forced colors leaves
semantic HTML and Explore. No research-count or fabricated measurement in art.

Real HTML: TCC Software Solutions / Take the guesswork out of your users. /
Explore → existing /case-studies/tcc. Theme colors influence glass/reflections,
not skin, clothing or lab material identity.

Layered AVIF/WebP: aggressively compressed room 768/1440 and mobile384/768;
sharper people/prototypes crop (510,0,1660,725) at384/768/1280/1660.
Original2170×725 normalized to2175×725 with five dark right-edge padding pixels.
Mobile crop (370,-100,1800,600), with100px top padding. SVG and raster transforms
share those exact source coordinates. Intrinsic3:1 ratio; lazy/async images.
Regenerate: node scripts/tcc-slide/optimize.mjs.

Sequential-batch checkpoint b86ae18 preserved before starting SCRUM-137. The
shared build/browser/test pass followed BOTH implementations. Existing Carousel
suite23/23; assembled desktop/390px, real-speed observation/assembly, keyboard
artwork pause, reduced-motion/forced-colors and scoped axe zero passed. No
overflow, console errors, missing assets or carousel height change. Selected
artwork bodies:70,024B desktop DPR1 /30,815B390px DPR2. Source review removed an
unintended global-origin rotation from the observation card before shared build.
