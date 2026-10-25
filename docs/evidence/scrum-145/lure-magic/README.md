# SCRUM-145 — stronger lure pulse and metallic shimmer

Owner-approved production follow-up to d233437. The shared Bass scene supplies
both Home carousel and `/blognostisphere/like-a-big-dumb-bass` article hero.

## Treatment

Cyan/amber halo colors are stronger; a smooth 4.8-second opacity cycle runs
between .45 and 1. Two broad, independently timed light bands cross the metallic
surfaces (5.9s cyan / 7.3s amber, staggered). They reuse the current decoded lure
plate as an alpha mask, restricted to its core. Only gradient transforms and
opacity animate. No geometry/hook/line translation, zoom, animated blur/filter,
flashing, dependencies, new imagery or effects runtime. Pond effects unchanged.

The mask follows the existing responsive batch's selected URL/current state.
Loading/failure posters, atomic reveal, shadowed Bass 2s hold/5.5s approach,
unchanged final position, copy, native destination links, GA and independent
keyboard pause remain. All lighting elements inherit the existing paused-world
rule, freezing on manual pause/offscreen/hidden. Reduced motion still uses only
the complete static fallback; forced colors keeps native content/links.

## Checks

- Production build/style budgets pass, 49 routes prerendered; 656 geometry checks
  and all 30 supplied Bass runtime hashes pass. Initial 468.82kB unchanged;
  deferred Bass chunk grows 12.79 → 14.44kB raw, ~3.81 → 4.16kB transfer.
- 50 focused scene/carousel/article/hero/analytics tests pass. Actual decoded
  plate is asserted as the mask source; two highlight bands are decorative.
- Built-page desktop/390px contracts pass for both surfaces: pulse extremes,
  moving band clocks, stationary lure, all three light clocks freezing under
  user/offscreen/hidden pause, revisit, responsive replacement, failure/reduced
  fallback, forced colors and native keyboard/pointer links. GA stays one event
  per activation, pause excluded. Scoped axe zero, no app errors/overflow.
- [Contracts](contracts.json) include paused CSS-clock samples at 0/2400/4800ms,
  not a claimed natural filmstrip. [Desktop](1440-article-peak.jpg) and
  [390px](390-article-peak.jpg) show assembled peak light without moving artwork.
- [Cold delivery](delivery.json): four actual image downloads, plus one CSS mask
  cache lookup with zero transfer, at both sizes. Body delivery remains 303080B
  desktop / 116584B mobile including poster. Do not sum encodedBodySize of the
  cached mask as another network download. No whole-carousel preload.

## Bounded rendering cost

Same local built article, extension-free headless Chrome, viewport1440/DPR1 and
390/DPR2. One ten-second observation per version/width after the Bass completes.
Whole-page counters include the unchanged site shell; this is not isolated GPU
utilization, real Android hardware, a repeated benchmark or Lighthouse.

| Whole-page ten-second sample | Desktop baseline → updated | 390px baseline → updated |
| --- | ---: | ---: |
| Main-thread TaskDuration | 994 → 1168ms | 1149 → 1147ms |
| Style recalculation | 314 → 360ms | 309 → 300ms |
| PrePaint trace time | 191 → 243ms | 268 → 270ms |
| Layout time/count | 0 → 0 | 0 → 0 |
| Paint events after settling | 0 → 0 | 0 → 0 |
| rAF gap p95 | 8.4 → 8.4ms | 8.4 → 8.4ms |
| Maximum rAF gap | 8.9 → 33.6ms | 25 → 16.8ms |
| Gaps over50ms | 0 → 0 | 0 → 0 |

[Baseline](baseline-cost.json) / [updated](candidate-cost.json). Desktop sample
adds ~174ms whole-page task time over10s; mobile is effectively unchanged. No
claim of a speed improvement or guaranteed GPU/memory behavior. No full-frame
repainting or layout loop observed. Original traces remain in ignored tmp.

Existing cold preparation plus the full7.5s approach can exceed the9s carousel
dwell; untouched. Live release verification uses headless
`node scripts/big-dumb-bass-slide/verify-lure-production.mjs`, without opening a
preview pane, changing production data or generating paid evaluations. Final
release receipt is recorded in SCRUM-145; production screenshots/JSON remain in
ignored `tmp/evidence/scrum-145/lure-magic/production/`.
