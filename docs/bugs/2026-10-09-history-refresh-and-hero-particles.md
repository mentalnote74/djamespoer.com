# SCRUM-63 and SCRUM-61 bug-pass handoff

## Resolution update ? 2026-10-09

The investigation below is a point-in-time record. James accepted retaining the
48rem compact particle suppression as intentional artwork containment. SCRUM-61
is Done; no mobile data/battery savings are established. Responsive particles
are a possible future enhancement, not an active ship requirement. The rejected
experiment was removed from product source and archived under ignored
`tmp/scrum-61-responsive-particles-experiment/`.

Jira now contains the SCRUM-61 resolution and SCRUM-63 diagnosis/verification
comments. SCRUM-63 remains open: build-only configuration, shipment of the local
fix, live production refresh verification and deployed JSON/grid acceptance are
still required. The current attempt's final outcome may lag by one successful
refresh/build. SCRUM-58 is Done after human acceptance of responsive Smart Grid.

## SCRUM-63 — missing production refresh

Confirmed source cause: the manual snapshot generator was not part of `npm run
build`. Prebuild only generated the display timestamp. Cloudflare's configured
command therefore bundled the unchanged Oct. 6 asset on later builds. The loader
uses a cold same-origin HTTP request with validation, without persistent application
caching; Smart Grid simply presents those received rows.

The build hook now mandates the existing sanitized atomic refresh for Cloudflare
main builds before timestamp generation and Angular compilation. Local/preview
builds stay offline. A failed production refresh stops publication and preserves
the prior snapshot. Read credentials are separate from deployment credentials.
See the deployment-history README for setup, security and self-observation limits.

No live credential input was available to the agent. The Oct. 6 asset was not
edited or regenerated. Real current rows require James's credential-bearing shell
or separately configured build-only read secret. No production result is claimed.

## SCRUM-61 — A: intentional visual suppression

Jira describes the observed Samsung absence and mobile-rendering expectation;
there are no comments supplying an original performance rationale. Git commit
`9478254` introduced the explicit narrow-screen rule; `9505c5d` later centralized
the same 48rem breakpoint. The committed rule remains:

```scss
/* Until the layer system becomes responsive,
 * hide particles on narrow screens rather than
 * letting them escape the donut hole. */
&__particles {
  display: none;
}
```

That establishes intentional composition protection. The desktop window is clipped
to the artwork's donut hole; cover-cropping and percentage coordinates can diverge
on narrow screens. The current production source's media rule explains absence
at/below 48rem without requiring a Samsung-specific rendering failure.

**Performance/data-saving intent is not established.** The original and current
Hero TypeScript check reduced motion, wait 500ms, then load the same-origin script
and JSON and initialize regardless of width. There is no device sniffing, Save-Data
check, connection check or narrow-layout initialization gate. Hiding the container
alone does not prove avoided downloads or animation-loop/CPU/battery cost. Canvas
initialization may happen with zero dimensions under `display:none`.

Reduced motion is a distinct, explicit policy: CSS hides particles and TypeScript
does not initialize them when reduced motion is requested at view creation. Its
initialization test covers that gate. The Hero does not listen for later preference
changes; this is a pre-existing limitation, not changed in this diagnosis.

No Hero/application code was changed in this bug pass. The earlier uncommitted
SCRUM-61 responsive plane experiment and its tests are preserved, not ratified as
a bug fix. Its compact CSS intentionally differs from production; passing those
local tests does not prove the committed suppression is retained or that mobile
rendering is accepted. Exclude that pending experiment from a SCRUM-63 commit.

### Product decision and Jira recommendation

Smallest question: retain the intentional <=48rem Hero suppression, or explicitly
replace it with responsive particles subject to a defined mobile cost/acceptance
policy? This is Hero-specific; it must not automatically enable every future
carousel particle effect.

If retaining it, close the rendering defect as expected behavior or rewrite it as
a policy/documentation story. If changing it, rewrite acceptance as an intentional
responsive enhancement and decide whether hidden effects should also avoid loading
and animation work. The original temporary composition policy is proven; its
continued product desirability and performance rationale require James.

Recommended future regression coverage should encode the approved policy: compiled
compact CSS, desktop visibility and reduced-motion suppression; if a cost policy
is approved, test script/config/initialization avoidance separately from appearance.

Real-device checks, once direction is approved: Samsung Chrome and DuckDuckGo in
portrait/landscape, actual CSS viewport and reduced-motion setting, desktop control,
and iPhone when available. For retained suppression, absence <=48rem is expected;
for a responsive enhancement, verify alignment/clipping and resizing plus measured
network/animation cost. No such device verification was performed by the agent.

No Jira status, Cloudflare setting, deployment, content draft, carousel candidate,
Creative artifact, SCRUM-58 implementation or SCRUM-67 work was changed.

## Verification and delivery state

- Refresh/acquisition/storage focused Node tests: 51/51 passed, including eight new
  build-lifecycle tests and a safe missing-read-secret CLI failure.
- Unchanged local Hero lifecycle/reduced-motion tests: 3/3 passed.
- Sass foundation tests: 8/8 passed. The compact-visibility test belongs to the
  preserved earlier responsive experiment, not the committed production policy.
- Separate read-only compilation of committed Hero Sass confirms both the compact
  `display:none` rule and independent reduced-motion suppression.
- Production compilation passed without budget warnings: 279.08 kB initial,
  75.42 kB estimated transfer. Local context explicitly skipped acquisition.
- Full Angular suite was not rerun: this pass changed no application behavior.
- Generated timestamp restored; public snapshot bytes/hash unchanged. No live
  Cloudflare request, commit, push or deployment occurred.
