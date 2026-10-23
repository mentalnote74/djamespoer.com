# Interior content rail

Page applies `page__content--interior` only to non-independent routes. Home remains
independent, with its original CSS defaults and geometry unchanged.

At the existing `navigation-wrap` breakpoint (64rem), the shared editorial grid is
2fr / 8fr / 2fr inside the existing 80rem shell. Below that breakpoint, the content
track fills the available shell, retaining its ordinary responsive gutters.

`--editorial-tracks`, `--editorial-section-span` and `--editorial-section-tracks`
are inherited layout policy, consumed by `editorial-content`. Ordinary sections,
including raised/inset cards, occupy the center track. Existing card appearance,
heading hierarchy and text reading measures remain component-owned. Removed the
separate inset-card and cookie-policy width caps that conflicted with this rail.

`editorial-wide` remains the explicit breakout. Existing carousel-backed 3:1
heroes, the Buildometer dashboard and the two-column Thingamajob workspace retain
their wider presentation. No new heroes or responsive TypeScript were added.

The destination hero is a single keyed view. After the first hydrated artwork is
ready, djp.c selects one variant from `destinationSlides()` exactly once; switching
the key destroys the entire previous deferred artwork tree. The registry remains
open to further variants. Direct loads and client-side Work revisits were checked.

## Routes without heroes (left intact)

- `/about`
- `/work/exl`, `/work/ips`, `/work/tcc`, `/work/dr`
- `/case-studies/dr`
- `/cookie-policy`
- `/product-journal` and `/product-journal/:date`
- `/blognostisphere/how-do-i-make-it-to-the-top-of-the-stack`
- `/blognostisphere/honey-should-i-add-bot-herder-to-my-resume`
- `/blognostisphere/like-a-big-dumb-bass`

## Verification

Production build/budgets pass: initial output 460.17 kB (previously 459.57 kB).
Hero and case-study tests pass (10 tests). The older `app.routes.spec.ts` reports
10 stale failures: flat-route assumptions, superseded authored-copy/date assertions,
and heading-sibling expectations incompatible with existing composed heroes. Those
route/test/content contracts were already unchanged from the preceding release;
no unrelated test rewrite was included. Two other route tests pass.

Built-Worker checks cover 25 interior URLs at 1440px and 390px, including a dated
journal entry: rail positions, 3:1 artwork, one H1, no horizontal overflow or browser
errors. Scoped main-landmark axe checks pass on About, djp.c, Buildometer and an
article at both sizes. Home's measured geometry matches the pre-change production
baseline at both sizes. Additional 1024/960px checks verify the shared breakpoint;
hero keyboard pause, reduced motion and forced colors retain their behavior.
Local evidence: `tmp/evidence/interior/` (ignored verification artifacts).
