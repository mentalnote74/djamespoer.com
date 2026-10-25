# Rigby first encounter — local review, October 25

Source: SCRUM-123 comment 10161 and supplied rigby-art-direction/READ-ME-FIRST.md.
Based on main c73eb54. First encounter only; no full trail, new route or deployment.

Home has a normal-flow, server-rendered encounter slot before Buildometer. Rigby
never overlays content. Visible, decoded arrival moves 32px inside his slot over
600ms. The stationary native biscuit button starts three 700ms pogo bounces
(28px peak), switching registered excited ear/tongue poses, then a still. Feeding
never navigates. A separate native link goes to /case-studies/tcc via PublicTrack.
Dismissal focuses that remaining link and persists for this tab session; one feed
also persists. Storage failure is harmless. No sound, rewards or branching.

Reduced motion uses an excited still with equivalent actions/feedback. Forced
colors uses native text controls without waiting for hidden lazy artwork. Polite
status excludes decorative motion. Pause/offscreen/document visibility freeze the
bounded clock. Idle/settled states schedule no animation frames.

Original master, exact prompt and source hashes/paths: artwork/rigby-first-encounter/.
Private photos remain at their supplied private location, never committed or
published. Only public/assets/rigby/encounter.png reaches the client: **8,803 bytes**,
192x64, three 64px cells, 14 resulting colors including transparency, integer 2x
display. Lossless PNG preserves pixels/hard alpha; no runtime archival masters.
Likeness, exaggeration and placement await James's visual review.

## Verification

- Focused Angular encounter + existing analytics tests: **19 passed** (6 + 13).
  This Windows environment needed the current-release dependency tree and temporary
  Vitest config `{test:{pool:'threads',maxWorkers:1}}`; default fork startup timed
  out. No dependencies/lockfile changes. Config remains in tmp/rigby-vitest.config.mjs.
- npm run build: **passed**, 49 prerendered routes, all build/style budgets.
  Initial bundle 468.82kB raw / 116.00kB estimated transfer; Home 25.40kB raw.
  Existing module-type warnings remain. Sandboxed esbuild directory access failed;
  successful checks ran outside that filesystem restriction.
- node scripts/rigby-first-encounter/verify.mjs: built Chrome at 1440px and 390px;
  Enter/Space feed, two expression poses, fixed biscuit rectangles during reaction,
  bounded settle, pause/resume, offscreen freeze, native evidence navigation,
  no overflow or JS errors; scoped axe zero violations at both widths.
- Reduced/forced-color static equivalents, dismissal focus, reload/session
  dismissal and deliberately failed artwork recovery passed in Chrome. Hidden
  clock gating is unit-checked; no real-device background benchmark is claimed.
- Sequence sheets + browser-results.json retained here. Full raw PNG captures
  remain local in tmp/rigby-browser-captures, outside the commit.

The encounter sits before viewport-hydrated Buildometer, keeping that component's
existing expansion below the biscuit. This does not claim site-wide CLS or change
Buildometer behavior. Rigby's reveal changes only visibility and transforms inside
reserved geometry.

## Review

http://127.0.0.1:8849/ — scroll to Rigby just before Buildometer. Existing loopback review server
serves built public assets only; local API data can be unavailable. No provider
calls, preview pane, push or deployment. SCRUM-123/124/125 are not marked shipped.
