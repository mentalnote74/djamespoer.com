# Rigby cookie dance preview — SCRUM-148

Local-only implementation on `feature/rigby-cookie-dances`, based on `f54e107`.
No deployment. Creative Town remains paused; Bedlam and SCRUM-141/147 are unchanged.

## Audition

Run `npm start -- --host 127.0.0.1 --port 4315` and open
`http://127.0.0.1:4315/?rigbyAudition=1`. Enable Rigby using the existing Cookie Jar
if necessary, then find **Rigby's cookie dance auditions** below his ordinary
controls. All 13 flavor buttons audition without collecting or writing the jar.
The panel requires Angular development mode and the explicit query parameter.
It is not a public route, campaign URL, analytics store or production control.

The 4.2-second routines are cross-paw top rock, shoulder windmill, sticky shuffle,
cookie moonwalk, running pup, biscuit robot, snap and lock, crab-paw footwork,
blue cookie beast, slow body wave, paw-supported freeze, lemon six-step and the
Rigby victory mix, in existing flavor order. TikTok-style movement vocabulary is
inspiration rather than a claim to reproduce a named creator's choreography.
No music or sound is added.

Only successful `collect(id)` calls emit an ID/flavor. Restoration, invalid IDs,
duplicate collections and restart emit no reward. A valid in-memory collection
still counts when optional persistence is blocked. There is one active routine;
the newest successful collection replaces it. Restart, navigation, dismissal,
greeting, scroll and layout changes cancel it. Canceled native animations cannot
complete a newer routine. Manual feed/trick controls also end the dance first.

The complete movement envelope is 192px desktop / 128px smaller screens around
the 96px / 64px sprite. The whitespace solver checks text and controls against
that entire envelope. If it cannot fit, the dance is skipped and the collection
announcement still reports success. No deferred reward queue waits to replay.
Reduced motion uses a static pose. Pause holds a static pose; hidden documents
pause native animation clocks and hide the companion. Greeting state explicitly
excludes the roaming/dance renderer in addition to the existing modal guard.
Native browser Web Animations handle poses/transforms; no animation library,
per-frame Angular work, new dependency, video or audio.

## Asset provenance

- New `public/assets/rigby/dance-poses-v1.webp`, 256 × 256 RGBA, sixteen 64px cells.
- **63,536 bytes**, SHA-256
  `5b26b67781f507ff27c627d3da2a2a6dbfecc14913d5236e136885dfbd8d91a6`.
- Built-in imagegen tool, transparent background; reference `tricks-v1.webp`.
- Generation output ID `exec-dd7722d5-e5c4-40df-8d52-cd77eba40595.png`.
- Source generated at 1254 × 1254. Existing art is preserved. Deterministic
  `scripts/rigby/build-dance-atlas.cjs SOURCE.png` extracts equal grid cells,
  resizes nearest-neighbor with transparent margins and packs lossless WebP.
  It uses Sharp already present in the existing dependency tree; no package added.
- Atlas is only requested by the deferred dance renderer, after a reward/audition.
  The new poses include crouch, shoulder support, back roll, front-paw support,
  threaded footwork and four blue poses. They are not rotations of standing art.

### Final imagegen prompt

> Use case: stylized-concept. Asset: production pixel-art dog animation pose atlas.
> Reference image is Rigby's existing 4x4 trick sprite sheet: preserve his recognizable
> orange chestnut fluffy spaniel, long floppy ears, cream muzzle and chest, dark
> expressive eyes, proportions, pixelated game sprite rendering and compact silhouette.
> Create ONE transparent square atlas laid out in exactly FOUR columns and FOUR rows
> of equal square cells (16 poses). No text, grid lines, borders, scenery, floor,
> shadows or other characters. Every dog fully inside its cell with generous
> transparent margins, same scale and baseline registration. View front three-quarter
> facing right. All poses must have real articulated changes, not rotation of a
> standing dog. Row1 left to right: upright top-rock left forepaw crossed; upright
> top-rock right forepaw crossed; low crouch with both front paws planted and
> hindquarters lifted; crab footwork supported on three paws with one rear paw kicked
> sideways. Row2: windmill floor pose on shoulder with hind legs spread; back roll on
> back with four paws up; supported breakdance freeze on two front paws with hind
> legs raised; low six-step pose with one rear leg threaded beneath body. Row3:
> upright robot angular bent forepaws; side sliding moonwalk rear paw extended;
> running-man lifted front knee; low body-wave long stretch. Row4: transformation
> crouch orange bristled fur; blue Cookie Monster inspired Rigby with same floppy
> ears/face cream muzzle and chest, shaggy cobalt-blue fur, big happy eyes, front paws
> planted wide and puffed chest; blue Rigby stomping with one front paw high, excited
> open mouth; blue Rigby shambling shimmy opposite front paw high. Blue character
> remains clearly Rigby the spaniel, not a different mascot. Genuine alpha
> transparency. Crisp pixel art with no antialias blur. No cookies or props.

Output variation: the first transformation crouch was generated blue rather than
orange. The routine intentionally uses the existing orange crouch first, then the
blue crouch, and ends on an orange pose. Source poses are compact first-pass
stylizations. James approved the audition as "good enough" on October29 (Jira
comment10204, implementation4e70380). Release remains unrequested; no deployment.

## Local verification receipt

Four focused files / 14 tests passed: cookie collection dispatch, choreography
bounds/flavor coverage, whitespace placement including narrow-gap size rejection,
and greeting behavior. Production build passed: initial 465.99 kB / estimated
transfer 116.62 kB. Existing warning thresholds remain exceeded for guide CSS
(now4.51kB) and greeting CSS (4.89kB); no budgets were raised. Known unrelated
full-suite baseline failures were not pursued.

Chrome at1440px and390px verified all13 auditions, no jar writes, viewport/text/
control clearance, one renderer, latest-wins, completion, static reduced motion,
pause, real successful collection dispatch, duplicates and restart, light/dark,
and greeting reopen. Native background-tab clocks paused at both widths; desktop
resumed running, mobile cleanly canceled on return. No duplicate/stuck Rigby
observed. Audition-panel axe returned zero violations at both widths. These are
local Chrome checks, including an emulated narrow viewport, not a claim of real
Android/long-idle SCRUM-147 reproduction or production verification.
