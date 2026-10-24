# SCRUM-145 — horizontal Bass approach

Local revision, October 24, 2026. No push/deployment. Preview:
<http://127.0.0.1:8835/?preview=big-dumb-bass>.

## Narrow change

The persistent Bass wrapper now translates horizontally from 40% of scene width
to zero over 5.5 seconds after the existing two-second ready/active hold. The
head is off the right edge initially, then approaches the stationary lure and
holds its original final position. No opacity animation, bite, contact or loop.
The existing brightness .62 keeps the head shadowed. Assets, decode/reveal gate,
poster, responsive candidates, priorities, clocks and analytics are unchanged.

The full registered head plate has transparent space on the left and a cropped
right boundary. Rightward starting translation keeps that cut boundary outside
the scene for the entire movement; no vertical movement brings the upper/lower
canvas cuts inside. The natural leading mouth contour is what enters the scene.
Actual cold throttled [desktop](1440-approach.jpg) and [390px](390-approach.jpg)
filmstrips show the complete sequence without an exposed straight cut edge.
No source generation, repainting, asset re-encoding or cropping was needed.

## Integration and verification

Based on remote main 9fdc46d, which includes the rollbacks of both pig loading
experiments. Pig component, SlideHero and shared slide-actions match main exactly.
The original protected-client dirty checkout is untouched. Prior Bass fade
evidence remains in the parent evidence directory; original commit 2503567 and
pig experiment history remain in Git. Historical handoff notes are explicitly
marked rolled back rather than represented as current behavior.

- Production build/style budgets pass; 48 routes prerendered. Initial bundle
  468.61kB raw / 115.94kB estimated transfer; deferred Bass 12.76kB / 3.79kB.
  Existing module-type warnings remain nonfatal.
- 656 registered image geometry checks pass; all 30 supplied Bass runtime hashes
  remain identical. No PNG/master runtime requests.
- 44 focused Bass/carousel/analytics tests pass.
- [Built-browser contracts](contracts.json) pass at 1440px and 390px: opacity
  remains 1 at start/end, translation .4 → 0, animation ends at 7500ms; pause,
  real hidden tab and offscreen preserve its clock; departure/revisit resets.
  Resize retains the same animation and current decoded plates. Native keyboard
  and pointer each emit one existing carousel GA event; pause emits none.
- Failure retains the complete fish-free opening poster and usable native link.
  Reduced motion loads only the complete static fish/lure composition. Forced
  colors preserves native content/link. Scoped axe: zero violations at both
  widths; no application browser errors or horizontal overflow.
- Running preview confirmed at both widths; browser-selected WebP fallback also
  decodes and presents atomically.

## Bounded cold capture and limitations

[Capture data](cold-capture.json): one fresh navigation per width, Chrome desktop,
150ms latency / 204800B/s down / CPU4x, then first arrival via actual Next button.
This is edge/motion evidence, not a repeated performance comparison or Lighthouse.

| Viewport | Selected AVIF bytes, incl. poster | Ready after Next | Opening LCP |
| --- | ---: | ---: | ---: |
| 1440px, DPR1 | 303080 | 1956ms | 1480ms |
| 390px, DPR2 | 116584 | 1037ms | 1308ms |

Four selected images per scene; zero Bass images requested before arrival.
Desktop opening cumulative layout shift recorded .00695, mobile zero; no
attribution or regression claim is made from these single opening samples.
The existing nine-second autoplay dwell can still expire before a cold desktop
preparation plus the full 7.5-second hold/approach. No timing or whole-deck preload
change was made. The preview selects via real Next, which pauses autoplay and
allows the full approach to be inspected. Static preview APIs are unavailable.
