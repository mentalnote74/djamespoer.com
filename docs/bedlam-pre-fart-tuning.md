# Restored pre-fart Bedlam: manual controls

Feature branch only. No artistic tuning; no production deployment.

Historical source: `909072dbb5471198d253031c8eb526b6e99b8736`, the immediate parent of emission build `406a35e42d3c10563bfe2451e3e31451aea853d8`. Bedlam files there exactly match the last Bedlam-changing revision `9ee64f23e8b205bd05d834c8ddb2cba92591826f`. Defaults produce exactly the same engine recipes for three verified seeds. The restored HTML/SVG/filter/gradient/geometry/motion structure is retained. Changes are explicit parameter extraction and removal of Bedlam reduced-motion suppression, not a new visual recipe.

Edit `src/app/components/bedlam/tuning.ts`. Each instance can override configuration or seed. Numeric ranges are clamped; density/count/detail-like choices are discrete where noted. Increasing beyond a maximum does nothing.

| Handle | Restored value; range | Increase | Decrease | Interactions |
|---|---|---|---|---|
| BEDLAM_SEED | djamespoer-header; any string/number | Different arrangement, no ordering | Same | Hold fixed when comparing knobs; deterministic positions/phases/colors |
| scale | 0.95; 0.7-2 | Larger transformed forms | Smaller forms | Depth adds scale; physical travel grows with element size |
| density | 0.4; 0-1 | More nebulae, 2-5 in steps | Fewer nebulae | More overlap/work; changes following seeded slots; mobile cap below |
| speed | 0.12; 0-1 | Faster cycles | Slower; 0 explicitly pauses | CSS motionRate also divides duration; static grain unaffected |
| motionRate | 1.44; 0.25-4 | Faster playback | Slower playback | Extracted historical CSS divisor; use speed first, keep this fixed |
| horizontalTravel | 1; 0-4 | Farther horizontal drift | Shorter; 0 removes X travel | Multiplies original turbulence-dependent distance; not starting position |
| verticalTravel | 1; 0-4 | Farther vertical drift | Shorter; 0 removes Y travel | Multiplies original depth-slot distance; no cloud rise simulation |
| opacity | 0.95; 0-1 | Stronger visibility | Fainter | Multiplied by intensity, per-layer weights and sceneOpacity |
| intensity | 0.95; 0-1 | Stronger visibility | Fainter | Same mathematical role as opacity, not extra energy or motion |
| sceneOpacity | 0.72; 0-1 | Stronger whole procedural composition | Fainter composition | Extracted CSS constant; dark readable base remains opaque |
| blur | 7; 0-20 | Softer nebulae | Sharper; 0 removes Gaussian blur | Actual blur=(1-distance)*depth*blur; SVG displacement/lighting remain |
| turbulence | 0.8; 0-1 | More static distortion, rotation and X travel | Calmer distortion/rotation/travel | Noise is static, not a simulation; separate X multiplier available |
| depth | 0.9; 0-1 | More scale/blur/shadow separation | Flatter, less blur | Does not add depth slots or reorder elements; more can look cloudier |
| symmetry | 0.08; 0-1 | Centers/scatters positions less | Wider scatter | No mirrored pairs; concentrated forms may overlap more |
| derivedColorMix | 0.6; 0-1 | More mathematically derived color | More original theme palette | hueRotation controls derived hue; no animation effect |
| hueRotation | 150; -180 to 180 degrees | Rotates derived hues farther as magnitude grows | Toward 0 reduces hue shift | Sign swaps alternating rotations; not a brightness slider |
| blend | normal; normal/screen/overlay/soft-light | Not ordered | Not ordered | Background/theme/opacity determine result |
| direction | normal; normal/reverse | Not ordered; reverse reverses playback | Not ordered | Historical explicit animation-direction overrides shorthand alternate; not ping-pong |
| positionX | 0; -25 to 25% | Right base offset | Left base offset | Animated keyframe transforms overwrite it while running; not a reliable live placement knob |
| positionY | 0; -25 to 25% | Down base offset | Up base offset | Same running-transform limitation; retained honestly as legacy setting |
| particles | false; boolean | true permits dots | false removes dots | particleCount and layer switch must also permit them; mobile always off |
| particleCount | 8; 0-24 rounded | More dots | Fewer dots | No effect while particles=false |
| layers.nebula | true; boolean | Enable soft gradient/noise-lit forms | Remove them and their SVG filters | density controls count; primary cloud/blob contributor |
| layers.rings | true; boolean | Enable diagonal band (despite its name) | Remove band | One layer, not density-controlled; mobile always off |
| layers.rays | true; boolean | Enable angular gradient fragment | Remove fragment | One layer, not density-controlled |
| layers.grain | true; boolean | Enable clipped static dot texture | Remove texture | No animation; speed does not change it |
| layers.particles | true; boolean | Permit particles | Remove particles | Does not override particles=false |

## Plain-language combinations

- Smaller blob: scale down; original 0.7 minimum remains intact.
- Faster: speed up, holding motionRate fixed.
- Travel farther: horizontalTravel/verticalTravel up; turbulence also changes X distance and distortion.
- Less cloudy/sharper: blur down; reducing/disabling nebula changes composition rather than just sharpness.
- More overlap: density up and/or scale up; lower symmetry scatter by increasing symmetry. No independent overlap knob.
- More chaotic: turbulence up or compare a different seed. No dynamic per-frame randomness.
- Fainter: opacity down, holding intensity and sceneOpacity fixed.

No persistence/lifetime control exists: these forms remain present while their CSS transform cycles. No independent blur-free depth control, overlap solver, contour influence, individual layer palette/opacity slider, or simulation evolution rate is invented. Static SVG noise frequency/octaves/lighting and original per-layer gradient/shape constants remain as restored, rather than creating a graphics configuration framework.

## Mobile and mask behavior

Mobile <=600px retains the historical density cap 0.4, removes rings/particles, and retains one strongest near-field nebula. Default desktop has six layers/three nebula filters; mobile three layers/one nebula filter. Changes to desktop density do not bypass that profile. Historical transparent navbar composition and canonical wordmark geometry are unchanged; Rum Runner/Bloody Mary retain silhouette-only containment. No new mask interaction or visible panel is added.

## Reduced-motion evidence and caveats

At the restored historical baseline, `prefers-reduced-motion: reduce` set `.bedlam__layer { animation: none; }`. This froze the procedural forms at their base styling; it did not remove the scene or merely slow playback. BEANO later explicitly paused its SVG timeline and hid the field under reduced motion. Both behaviors are removed from this restored Bedlam only; other site features retain their existing behavior.

Prior emission browser-check scripts explicitly enabled reduced motion for a separate suppression assertion after checking moving transforms, then cleared it. The corrected BEANO observation logged `reduced:false`, `forced:false`, `paused:false` and scroll=0 before collecting its active sample. Its first paused sample was discarded; the retained record does not isolate reduced motion as that sample's cause. Earlier manual observation settings and unrecorded browser/OS preferences cannot be established. Do not attribute Coach's stationary-blob observation to reduced motion without that evidence. The original slow duration itself is reproduced independently (~106.587s sampled desktop layer, ~49.365s sampled mobile near-field layer).

Restoration verification: exact recipe equality for three seeds; extracted X/Y/blur factors doubled their original values at factor 2; Chrome transforms changed under both reduced-motion settings at desktop/390px. Forced colors retains static identity, offscreen pausing works, and build/prerender/budgets pass. Visibility/document-hidden listeners remain the historical implementation. No artistic acceptance claim or PROD deployment.
