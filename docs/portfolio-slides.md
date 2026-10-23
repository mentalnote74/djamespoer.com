# Carousel deck and destination heroes

Current geometry/hero correction: [registered slide contract](slide-geometry.md).
All scenes and the shared mobile slot now use 3:1. Page H1s occupy the registry
copy-safe zones instead of sitting above a separate banner. djp selection waits
for the initial deferred view to hydrate before its one-time variant switch.
The release history/initial verification below predates that correction.

`src/app/content/portfolio-slides.ts` is the shared metadata source. Fifteen
slides, thirteen destinations. The approved artwork/assets and Magic are reused.
One new owner-authorized TCC piglet is included; rejected old TCC artwork and
Dreyer & Reinbold stay excluded.

| Slide ID | Destination | Hero |
| --- | --- | --- |
| djp-conservatory | /work/djamespoer | Random djp variant |
| djp-sunset | /work/djamespoer | Random djp variant |
| djp-moonlight | /work/djamespoer | Random djp variant |
| engineering | /engineering | Existing canonical perspective |
| ux | /ux-product | Existing canonical perspective |
| accessibility | /accessibility | Existing canonical perspective |
| ai | /ai | Existing canonical perspective |
| creative | /creative | Existing canonical artwork; no new carousel CTA |
| impact | /impact | Existing canonical perspective |
| thingamajob | /thingamajob | Existing Thingamajob composition |
| exl | /case-studies/exl | Reused EXL LifePRO component |
| buildometer | /buildometer | Reused dyno-cell component |
| ips | /case-studies/ips | Reused interlock component |
| blognostisphere | /blognostisphere | Reused layered sky/machinery component |
| tcc-ux-pig | /case-studies/tcc | New authorized photorealistic wink/kiss piglet |

Home runs `shufflePortfolioDeck` exactly once after hydration: uniform selection
among `family: 'djp'`, then Fisher–Yates over all fourteen remaining slides. The
two unselected djp variants receive ordinary shuffle treatment. Registry arrays
are never mutated. No random work occurs in templates, effects, navigation,
autoplay, focus, resize, themes or reduced-motion updates.

Carousel receives an optional logical ID order; other consumers retain their
existing order by default. Physical slide/template nodes remain stationary.
Current index, visible slide, announcements and indicator positions resolve
against the logical deck. This prevents the duplicate accessible region seen
when moving projected incremental-hydration boundaries during initialization.

The site is statically prerendered: HTML always has a conservatory opening
fallback and real image markup. Browser initialization selects the final deck
after the initial hydration pass, with no hydration-time random divergence.
Consequently the fallback can be briefly visible or requested before another
runtime djp variant is chosen; it is still an approved card in the same deck.
This is not per-request SSR. The old fixed Engineering opener is intentionally
superseded. Perspective priority follows active state, and djp focal foreground
priority follows activation, instead of promoting a hidden Engineering image.

SlideVisual renders the actual artwork components. Project implementations are
separate lazy chunks and activate within their existing responsive carousel
staging. Destination SlideHero uses the same registry and visual renderer, not
another carousel. The djp page samples once after hydration and retains that
choice for its component lifetime. New hero presentation suppresses duplicate
copy/self-links while preserving each page's H1, content, artwork suspension,
motion controls and responsive crop. Existing perspective and Thingamajob hero
semantics are preserved.

Initial shared-registry release verification (before the new piglet): production
build/budgets pass without style warnings; 46 public
documents prerender. Initial bundle 459.46 kB versus 459.74 kB previously.
Existing carousel/case-study surface: 34 tests passed, including uniform anchor
selection intervals, complete/unmutated remainder, registry mappings and stable
physical DOM with logical playback/announcements. Browser checks at 1440/390px:
twelve reloads showed changing openers/remainders, every deck contained the same
14 unique IDs, all cards cycled correctly, previous/next and timed Play/Pause
worked, and resizing/motion preferences/focus/actual theme selection did not
reshuffle. All twelve destinations retained one H1 and no embedded carousel;
all five added hero destinations passed scoped main-region axe checks and kept
their own page headings. All three djp destination variants appeared in four
initializations in the retained local sample. No overflow, broken assets,
hydration or browser errors. Reduced-motion/forced-colors hero checks passed.

Local evidence and screenshots: ignored `tmp/evidence/slide-heroes-shuffle.json`,
`slide-heroes-modes.json`, `deck-home-*` and `hero-*`. Production release and live
read-back receipts are retained there separately after normal Git deployment.

New TCC slide verification and exact registered patch/asset details:
`artwork/tcc-pig-slide/README.md`. The component remains 3:1 at every width;
no shared slot geometry changed.
