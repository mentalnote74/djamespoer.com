# Missing interior heroes — asset mapping only

Audit basis: the no-hero list in `docs/interior-layout.md`, current interior router,
and `src/app/content/portfolio-slides.ts`. No route/template/registry wiring or
artwork generation was performed. Existing approved imagery remains 3:1.

| Route | Existing relationship | Preparation result |
| --- | --- | --- |
| `/work/exl` | Approved `exl` / LifePRO carousel art already serves `/case-studies/exl`; the work-history page is the same employer/product context. | Clear existing reuse candidate. No new art needed. Keep the Work History heading and existing content if separately authorized to wire it. |
| `/work/ips` | Approved `ips` / PowerSchool art already serves `/case-studies/ips`; the Work History is the same IPS/PowerSchool engagement. | Clear existing reuse candidate. No new art needed. |
| `/work/tcc` | Approved `tcc-ux-pig` art serves `/case-studies/tcc` and the established TCC lipstick story. | Existing employer-level candidate, with a scope qualification: the Work History covers more than that UX story. It can use the approved piglet without restoring rejected old TCC art; obtain the presentation decision before wiring. |
| `/work/dr` | Historical D&R month-end artwork remains in `artwork/dr`, but was explicitly rejected and is absent from the live registry. | Not implementation-ready. Needs new approved art or explicit reversal of the rejection; retained assets are evidence, not permission to reactivate. |
| `/case-studies/dr` | Same rejected historical D&R scene. | Same approval/art gap; do not silently restore it. |
| `/about` | No existing slide destination or approved About/identity hero. | No obvious direct mapping. Leave the text-led page intact; any hero needs an approved art/relationship decision. |
| `/cookie-policy` | No corresponding carousel scene. | Utility document with no approved hero relationship. Leave hero-free. |
| `/product-journal` and `/product-journal/:date` | No corresponding carousel scene. Buildometer is related project evidence, but its car is not an approved journal hero. | Leave hero-free; do not invent a Buildometer-to-journal relationship. One eventual decision could cover index and dated entries. |
| `/blognostisphere/how-do-i-make-it-to-the-top-of-the-stack` | Approved Blognostisphere artwork exists for the series index, not this article. | Series-level candidate only; no approved article-specific mapping. Leave the authored article header intact. |
| `/blognostisphere/honey-should-i-add-bot-herder-to-my-resume` | Same series artwork; no dedicated Bot Herder asset. | Same editorial decision needed; no new art invented. |
| `/blognostisphere/like-a-big-dumb-bass` | Same series artwork, discussed by the article, but no approved article-hero wiring. | Strong series context, still an editorial choice rather than an automatic route mapping. |

## Reuse boundaries

Existing `SlideHero`/`SlideVisual` and registered responsive image sets can serve
the clear candidates without a new renderer. Do not copy the scene components or
change the carousel destinations/order. The current destination registry does not
associate these Work History routes with their counterpart case-study scenes;
that association would be a later explicit implementation change.

The three djp.c variants already belong to `/work/djamespoer`, which has a hero and
is not a missing-hero task. They are not spare generic artwork for unrelated pages.
The rejected TCC/D&R scene batch stays excluded. No source PNG becomes a runtime
asset through this preparation work.

Smallest clear next hero implementation: reuse approved IPS or EXL artwork on its
corresponding Work History route, using the existing shared hero architecture.
Tonight's authorization is audit/prep only, so neither is implemented here.
