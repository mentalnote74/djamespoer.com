# Rigby follow / warmer-colder handoff — October 25, 2026

Local worktree: C:/Users/djame/OneDrive/Desktop/djamespoer.com/tmp/rigby-first-encounter. Changes remain uncommitted and undeployed. Preview: http://127.0.0.1:8849/.

Implemented: sixteen cookies covering every unique destination in the sixteen-slide carousel, plus the preserved Home/About stops. Duplicate beach slides share their destination's cookie. Existing cookie IDs and jar progress survive expansion. Special destinations receive a shared page-end fallback; authored pages keep inline pockets.

Replaced the Home-only roaming instance with a sitewide viewport companion. An 80px content lane prevents resting over text and survives resizing. Walk while scrolling; after 900ms of inactivity, lie bored when cold. Graded pointer/focus/current-cookie proximity controls warmth and tail speed. Measured browser gradient: 0, 0.30, 0.69, 1.0; active wag speeds in that sample 540/432/227/140ms. Cold lying pose has a 3200ms wag. Existing pause, opt-out, reduced motion and hidden-document suppression retained. Cookie reward remains a 256px, three-cycle bounce.

No arrival-time Cookie Jar prompt. Guide is deferred until idle; jar UI loads on demand. Surprise greeting waits at least ten seconds, genuine visitor engagement, settled visible images/fonts/current-page deferred content, a resource/content quiet period and browser idle. Explicit opt-out and previously seen greeting prevent automatic repetition. First surprise does not enable the hunt until the visitor chooses to play. Early saved-lane bootstrap avoids returning-visitor layout shift.

Greeting: run-up, camera lick, brief full-screen black lens, then exact introduction "Hi! I'm Rigby Decaf Poer" with the eighteen-coffee joke. Skip/Escape work. Reduced motion removes run-up, lick and blackout. Forced colors get immediate text. Focus restoration verified back to companion button after closing.

Assets: built-in imagegen generated an eight-pose 4x2 transparent sprite sheet. User-facing master: rigby-behavior-sprites.png beside these notes. Runtime public/assets/rigby/behaviors.webp: 35,816 bytes. Lossless cookie WebP: 74,362 bytes versus PNG 105,077; side profiles: 17,026 versus 21,251. Approved encounter.png remains unchanged. All animations use CSS sprite steps/transforms. Proximity sampling is limited to ten read-only checks/second; no continuous JS animation loop.

Final generation prompt specification: Same shaggy copper-orange, cream-muzzled floppy-eared Rigby as approved front/side references, retro detailed pixel art. Transparent 4-column by 2-row grid, eight full uncropped dog poses, consistent scale. Row one: two right-facing walking strides with alternate tails, then two alert side-profile pointing poses with alternate tails. Row two: two lying-down bored poses with alternate slow-wag tails, then two front-facing joyful long-tongue camera-lick poses. No text, borders, props or ground. Full tails/paws inside cells; match reference identity and palette.

Verification completed:
- 27 focused tests pass: expanded trail coverage, scent math, cookie storage/preferences, About/case-study/Footer components.
- Production build, component/initial budgets and 49 prerenders pass. Final initial bundle 473.22kB, estimated transfer 118.30kB (earlier build 481.11kB / 119.01kB).
- Built Chrome: initially no dialog/companion, delayed greeting, blackout opacity 1, exact introduction, opt-in starts 0/16. All sixteen routes have exactly one collectible and complete jar to 16/16.
- Viewport tracking verified at 1440, 1000 and 390 widths; zero overflow. Walking, bored, graded warmth, reduced-motion no-animation/no-blackout, and restored focus verified.
- Scoped axe: jar, companion and greeting zero violations after counter-label correction. No page errors in the full route walk.
- Six-second idle sample: approximately 0.09 seconds browser task time, zero measured JS animation work and zero layout work. Not GPU/battery evidence.
- Lighthouse cold-load mobile: baseline 90; updated/final 92 (LCP ~2.84s, TBT ~20ms, CLS 0). Correct desktop preset: 100 (LCP ~0.60s, TBT 0, CLS 0). Mobile target near 100 is not yet achieved. Earlier baseline desktop run used mobile throttling and is not a valid desktop comparison.

Deployment grid: live public snapshot checked October 25 with 350 records. Validated and reapplied to the built preview after the final rebuild; tracked source snapshot unchanged. Component already sorts newest first.

Returning-visitor Lighthouse check completed after approval service recovered: Rigby enabled and greeting already seen, mobile 91 (LCP 2.96s, TBT 17.5ms, CLS 0), desktop 100 (LCP 0.60s, TBT 0, CLS 0). Cold-load mobile remains 92. LCP is the opening portfolio paragraph; font faces already use optional display. No proven further optimization has been applied. Mobile near-100 target remains outstanding; do not claim it passes.

Artwork master/prompt and evidence copied into the project. Cookie policy documents greeting-seen storage. Generated build-only churn is backed up before restoration. Full-suite limitations above remain. No push or deployment.

Final rebuild passed with 49 prerenders and 473.22kB initial / 118.30kB estimated transfer. Raw HTTP verification: preview responds 200 with Content-Encoding: br. Runtime artwork uses lossless WebP; JavaScript/CSS are production-minified. Six generated build files were backed up with hash verification and restored; feature changes retained.
