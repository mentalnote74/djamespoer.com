# Rigby living-presence prototype — October 25

James approved the pixels in 82ea845a and superseded the confined one-biscuit
interaction. Source: SCRUM-119 comment 10073, SCRUM-123 comment 10161 and the
current owner directive. SCRUM-125 now includes this local prototype expansion.
The previous first-encounter evidence is retained as history.

## What changed

No dedicated dog field/card or reserved 12rem section. Rigby is absolutely placed
relative to Home, using existing introduction, Thingamajob, journal and telemetry
regions as candidate anchors. Native text-line rectangles and whole controls,
forms, imagery and tables are excluded with a six-pixel buffer. A few candidate
positions near those regions and the outer gutters are checked; direct or simple
gutter corridors are sampled before travel. Changed layout invalidates unsafe
positions/paths. No new layout space is created for the dog.

Roaming uses crisp two-pixel steps and small scamper hops; a 600ms notice/stop
precedes the stationary 44px biscuit target. Feed starts the same three 700ms
grin/ear/tongue pogo cycles, a short rest, then another clear stop and biscuit.
The approved 64px pixels, three frames, masters and 8,803-byte sprite are unchanged.
The previous 2x rendering is now native 1x to fit real whitespace; bounce height
is proportionally 14px. No continuous excited bounce or nag timer while begging.

Stable native keyboard controls remain in one DOM location at the end of Home;
a focus-visible shortcut reaches them. They are controls, not Rigby's enclosure.
Local pointer feeding and stable keyboard feeding use the same handler. Focus
never follows the dog. Feeding from offscreen, reduced/forced colors or explicit
pause uses repeatable excited still feedback. Every second feed offers a separate
optional TCC evidence link in those stable controls. Feeding never navigates.

Form entry or an open header menu/dialog suppresses the overlay and its clock.
Explicit pause, offscreen and document-hidden states freeze nonessential motion.
Dismissal is session-only and preserves the existing key. The old terminal `fed`
session state is intentionally ignored. No new persistence, engine, dependency,
account, points, rewards, sound or cross-route trail. Existing PublicAnalytics
shown/fed/dismissed and PublicTrack evidence link respect existing exclusions.

## Verification

- **22 focused Angular tests passed**: nine loop/geometry/accessibility cases and
  13 existing analytics cases. Same temporary single-thread Vitest configuration
  as the earlier local run; no dependency or lockfile change.
- Production build/style budgets pass; 49 prerendered routes. Initial raw bundle
  468.82kB; Home 32.13kB raw / approximately 9.06kB transfer (about +6.73kB raw /
  +1.97kB transfer over the approved single-encounter version). Existing module
  type warnings remain. One unchanged 8,803-byte sprite, no other runtime art.
- Built Chrome at **1440px and 390px**, two pointer feed/celebration/scamper cycles
  each. Three distinct safe stops at each width; sampled footprint never intersects
  visible text, controls, forms, images or tables. Biscuit bounds stay fixed while
  offered. No overflow or JS errors. Scoped axe: **zero violations**.
- Native Enter/Space feeding retains focus on stable controls. Keyboard pause,
  form/menu suppression, session dismissal, reduced/forced-color repeatable stills
  pass. Hidden/offscreen clock gating is additionally unit-covered; no physical
  Android or background-device performance benchmark is claimed.
- Browser exposed a stale scroll-state edge when focusing controls; activation now
  checks actual geometry so offscreen keyboard feeding remains repeatable. Dialog
  recovery now reconsiders mobile space after close. Test waits acknowledge Angular
  rendering instead of sampling aria/state before the render.

Run `node scripts/rigby-first-encounter/verify-roaming.mjs` against the local built
review server. JSON results and compressed desktop/mobile visual sheets are here;
raw PNG captures are local under tmp/rigby-roaming-captures.

## Review and limits

**http://127.0.0.1:8849/#rigby-start** opens at the existing Thingamajob anchor and
Rigby's first visible pockets. Close the normal cookie dialog if it is shown.
No preview pane was opened. No push or deployment.

Home only. No space or safe corridor means stay in place or suppress decoration;
never force a route through content. Mobile uses compact local pockets, not a
desktop traversal. Scrolling does not make Rigby chase the visitor. Static keyboard
feeding works even while he is offscreen. This prototype still needs James's
judgment on freedom, scale, scamper personality and control/link placement.
No site-wide CLS, Lighthouse score or conversion improvement is claimed.
