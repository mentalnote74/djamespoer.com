# SCRUM-145 — shared article hero and carousel copy

Local review checkpoint; no push/deployment. Continues the Bass approach revision
a9ea4ac on top of main's pig rollback 9fdc46d. No pig, SlideHero implementation
or shared slide-action changes. Source/runtime art and hashes are unchanged.

## Live previews

- [Carousel](http://127.0.0.1:8835/?preview=big-dumb-bass)
- [Article](http://127.0.0.1:8835/blognostisphere/like-a-big-dumb-bass)

The same running local static server serves both actual built routes. Its Home
preview helper selects Bass through existing Next controls; no runtime preview
route or production behavior was added. APIs are unavailable in this preview.

## Changes

Article derives an optional hero destination by matching its canonical route in
the existing slide registry, then uses the existing SlideHero/SlideVisual scene
path. Only Bass currently matches. Its unchanged title, **Like a Big Dumb Bass**,
is rendered as the single semantic H1 by SlideHero, with the original dek,
byline/date, body and links retained. Other articles retain their existing H1.
The Bass scene's hero mode suppresses the slide H2, Explore and destination
link, while retaining its independent keyboard pause. Ordinary article H1 styles
are narrowed to the original article header, preserving shared hero typography.

Carousel headline remains exact HTML: **Whatever You Do, Do Not Click Here**.
Explicit start alignment fixes the previously inherited centered heading versus
left-aligned Explore. Vertical flex composition, UI typeface/weight, fluid
spacing and shared Explore treatment follow existing slide conventions. Its
art-specific copy zone keeps the headline left of the lure; 390px uses the
existing compact .9rem heading convention to fit all copy and the standard 44px
Explore in the unchanged 3:1 scene. The pause control remains a separate sibling.
Hero metadata gives the article title its own 27% copy zone; its content ends
before 25% of the scene width at desktop and 390px. No art translation/crop,
baked-in text or shared carousel geometry changes were introduced.

The same supplied three decoded plates, fish-free loading/failure poster,
two-second hold and 5.5-second horizontal approach remain. Shadow brightness .62,
stationary lure, final head position, no-contact hold, pause/background/offscreen
freezing, visit reset, reduced still and canonical native GA link stay intact.

## Verification and evidence

- Production build/style budgets pass; 656 registered image checks and 48-route
  prerender pass. Initial bundle 468.61kB raw / 115.99kB estimated transfer;
  Bass remains deferred, 12.79kB raw / 3.82kB estimated transfer. Existing module
  type warnings remain nonfatal.
- Focused five-suite run: 49 passed, one new test assertion failed because the
  image `loading` binding is a DOM property in the test environment, not a
  reflected attribute. Corrected that assertion; focused article/hero/Bass
  recheck passes 10/10. The other 40 cases passed and were not redundantly rerun.
- [Built-page contracts](contracts.json): desktop/390px carousel copy fits the
  unchanged 3:1 stage, natural approach completes, clocks freeze/resume, revisit
  resets, responsive replacement retains animation, failure poster and reduced
  still work. Trusted keyboard/pointer each produce one existing GA event; pause
  produces none. No application errors or overflow; scoped axe zero.
- Article navigation has one H1, no extra H2/Explore/self-link, accessible
  keyboard pause and complete approach. Scoped article axe zero at both widths.
- [Final direct-page read-back](direct-hero.json) confirms HTTP 200, artwork and
  one H1 in prerendered HTML, and final title bounds entirely inside the left
  quarter (24.05% desktop / 24.32% mobile). Direct browser loads preserve the
  canonical title, 3:1 composition, no self-link/overflow/errors, and zero axe
  violations. Mobile reduced motion retains a complete still and no clocks.
- Actual assembled views: [desktop carousel](1440-revealed.jpg),
  [390px carousel](390-revealed.jpg), [desktop article](1440-article-hero.jpg),
  [390px article](390-article-hero.jpg). Pause is visible where keyboard focus
  was used during checks; it remains hidden in normal use.

Image bytes unchanged: 303080 desktop / 116584 mobile, including opening poster.
No new asset strategy or performance campaign. The previously documented cold
loading plus 7.5s sequence can still exceed the nine-second carousel dwell;
no whole-carousel preload, interval change or unrelated fix was added.
