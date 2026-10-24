# Pig slide: baseline versus one atlas

Local review experiment, 2026-10-24. **No push or deployment.** Baseline: `2842cd73f88c57a5b75d746f3f3f6c9bf1c62213`.

## Decision

**Reject this candidate for production promotion; preserve the atlas experiment for review.** The atlas meaningfully improves visual coherence and decoder/memory efficiency, but it is not a consistent first-carousel-arrival speed win. The repeatable throttled desktop warm-cache readiness regression (133 to 280 ms), higher desktop transfer, and inconclusive opening LCP comparison prevent calling the present implementation an overall delivery win. This does not reject atlas delivery in principle. No further optimization or preload workaround was implemented.

## Cause and local change

The baseline paints the base and four facial replacements independently. Animation readiness waits for all five, but artwork visibility does not. Actual frames show an isolated eye/mouth before the base, and a base with rectangular eye/mouth holes before replacements arrive. This is piecemeal image presentation, not a demonstrated white CSS placeholder or changed pig artwork.

One 2172 x 928 atlas holds the original 2172 x 724 base and the four unchanged native photographic patches in a guarded strip underneath it. Five clipped views reuse the same responsive URL, so Chrome performs one network fetch/shared decode. The on-screen stage stays 3:1. Original masters, alpha masks, legacy deliveries and all registered deliveries are preserved byte-for-byte. AVIF first, WebP fallback, 384/768/1200/1440/2172 widths; no carousel-wide preload or eager change. Uniform AVIF quality 66 protects the facial material; baseline used base quality 48 and patch quality 66. This increases desktop base quality/payload instead of disguising a reduction in patch quality. WebP uses quality 84.

Native destination link, PublicTrack attributes, exact copy and animation stylesheet are unchanged. Active/visibility/intersection gates still control the existing four-second expression loop. Atlas packing remains local to this scene.

## Conditions and interpretation

- Chrome headless on Windows, extensions disabled; production builds served locally with gzip text, cacheable images and uncached HTML. No Lighthouse/Lantern simulation. No paid/provider calls.
- 1440 x 1000 at DPR 1; 390 x 1000 at DPR 2 with touch support. This is desktop Chrome emulation, not an Android hardware test.
- Native connection/CPU, or CDP 150 ms latency, 204800 bytes/s download (1638.4 Kbps), 84375 bytes/s upload, CPU 4x. Same settings for both variants.
- Three repetitions in every width/profile/scenario/cache cell; 96 navigations, alternating variant order. New browser context and cleared disk cache for cold; same-context second navigation for warm. Native decoder/resource cache warmth is therefore preserved.
- Direct `/case-studies/tcc` covers initial display. Home uses a deterministic valid shuffle (test-only Math.random=0.37), keeps Conservatory first, then one existing Next action gives the pig its first arrival. No production deck changes.
- Complete-artwork timing below is a **decoded-composite readiness proxy**: all five images complete, all decode promises fulfilled, then two requestAnimationFrame callbacks. Arrival is Next activation for Home, navigation start for hero. It is not an exact hardware scanout timestamp.
- All cold Home pig requests start after Next; warm-cache entries may resolve before arrival through existing browser cache behavior. No new preload or forced eager homepage artwork was introduced.
- Opening LCP is the observed entry immediately before first carousel interaction (load plus 500 ms checkpoint), not a Lighthouse score or a guarantee of later LCP finalization. Different opening values before any cold pig request cannot be attributed to atlas image transfer.

## Decoded-composite readiness, ms

Median (minimum-maximum), three samples per entry.

| Width | Profile | Cache | Surface | Baseline | Atlas |
|---|---|---|---|---:|---:|
| 1440 | native | cold | First carousel arrival | 111 (75-242) | 61 (56-81) |
| 1440 | native | cold | Direct TCC hero | 342 (251-416) | 339 (242-475) |
| 1440 | native | warm | First carousel arrival | 205 (87-739) | 169 (72-249) |
| 1440 | native | warm | Direct TCC hero | 141 (139-151) | 124 (118-129) |
| 1440 | slow | cold | First carousel arrival | 552 (503-721) | 538 (501-658) |
| 1440 | slow | cold | Direct TCC hero | 2622 (1783-2637) | 1570 (1073-1590) |
| 1440 | slow | warm | First carousel arrival | 133 (120-137) | 280 (171-384) |
| 1440 | slow | warm | Direct TCC hero | 1232 (658-1404) | 1217 (773-1315) |
| 390 | native | cold | First carousel arrival | 78 (52-80) | 78 (44-218) |
| 390 | native | cold | Direct TCC hero | 299 (274-327) | 274 (223-321) |
| 390 | native | warm | First carousel arrival | 38 (38-47) | 53 (32-84) |
| 390 | native | warm | Direct TCC hero | 134 (124-135) | 108 (107-111) |
| 390 | slow | cold | First carousel arrival | 459 (401-487) | 454 (397-538) |
| 390 | slow | cold | Direct TCC hero | 1568 (1055-1620) | 802 (753-1153) |
| 390 | slow | warm | First carousel arrival | 109 (91-118) | 98 (98-113) |
| 390 | slow | warm | Direct TCC hero | 1318 (686-1447) | 900 (701-1468) |

Cold throttled Home barely changes: desktop 552 to 538 ms, mobile 459 to 454 ms. Direct TCC improves: desktop 2622 to 1570 ms, mobile 1568 to 802 ms. Warm desktop throttled Home regresses in all three pairs: baseline 137/133/120 versus atlas 280/384/171 ms. Its cause is not established by decoder work alone; it must not be dismissed as a network win.

## Actual selected AVIF delivery

| Viewport | Selected width | Baseline image bytes | Atlas image bytes | Baseline transfer | Atlas transfer | Requests | Approx. decoded RGBA |
|---|---:|---:|---:|---:|---:|---|---|
| 1440 | 1440 | 30299 B | 36642 B | 31799 B | 36942 B | 5 to 1 | 13.18 to 3.38 MiB |
| 390 | 768 | 11260 B | 11302 B | 12760 B | 11602 B | 5 to 1 | 3.75 to 0.96 MiB |

Desktop transfers 5,143 more bytes (+16.2% including the resource-timing header allowance); mobile transfers 1,158 fewer (-9.1%). Warm image transfer is zero for both. Resource Timing adds a standard 300-byte allowance per network resource; these are browser transferSize figures, not packet captures. Estimated unique decoded RGBA falls about 74.4%. This is dimensions x 4, **not measured GPU/process memory**; AVIF planes, decode caches, tiling and browser retention differ. Five DOM image views remain; this is shared-resource delivery, not a new scene engine.

## Decoder and rendering cost

A separate no-site blank-page decoder check loads exactly the five baseline images or five references to the one atlas, three repetitions, with no unrelated images and no throttling. Core `Decode Image` thread CPU excludes nested decoder wrappers.

| Selected width | Baseline cold CPU ms | Atlas cold CPU ms | Baseline cold decode/load wall ms | Atlas cold decode/load wall ms |
|---|---:|---:|---:|---:|
| 1440 | 22.72 | 6.35 | 83 (53-94) | 32 (22-39) |
| 768 | 8.33 | 2.36 | 31 (24-34) | 15 (12-16) |

Chrome records five cold core decode events versus one; warm re-use records zero new core decode events in this check. The atlas therefore has a real decode saving, not just fewer requests.

URL-attributed pig PaintImage CPU in the first cold Home trace is small: native desktop 0.167 to 0.167 ms, native mobile 0.158 to 0.266 ms; throttled desktop 0.488 to 0.575 ms, mobile 0.348 to 0.529 ms. Clipping is not free, but no large CPU rendering penalty appears in these samples. Page-wide raster wall totals are mixed with header/other page work and are not a per-pig GPU benchmark. Traces for repetition one are retained locally; do not treat these single trace samples as statistically established paint improvements. The early exploratory nested decode totals/cumulative page task counters were excluded from the published measurements to avoid double counting or false attribution.

## Opening-page LCP, ms

Observed pre-interaction checkpoint, median (minimum-maximum), three samples. No performance score inferred.

| Width | Profile | Cache | Baseline | Atlas |
|---|---|---|---:|---:|
| 1440 | native | cold | 184 (184-1436) | 196 (188-220) |
| 1440 | native | warm | 156 (116-232) | 124 (120-228) |
| 1440 | slow | cold | 740 (676-820) | 1052 (684-1616) |
| 1440 | slow | warm | 736 (724-1072) | 700 (640-1436) |
| 390 | native | cold | 204 (180-252) | 188 (180-200) |
| 390 | native | warm | 124 (120-140) | 132 (116-132) |
| 390 | slow | cold | 1116 (1028-1272) | 1208 (1180-1432) |
| 390 | slow | warm | 1092 (1000-1132) | 1108 (1096-1280) |

The first native desktop baseline has a 1436 ms outlier followed by 184/184 ms; the atlas native desktop values are 220/188/196 ms. Throttled desktop atlas values 684/1052/1616 ms are substantially more variable than baseline 740/820/676 ms. Mobile cold throttled is 1272/1028/1116 versus 1432/1208/1180 ms. These data **do not establish an opening-page LCP improvement or a clean LCP nonregression**. The later pig request cannot explain an earlier difference; no speculative opener changes were made.

## Filmstrip evidence

[Open the visual review sheet](index.html). The separate screenshot-sampled pass uses the same throttled settings and shows actual artwork, not load counters. Screenshot overhead is deliberately excluded from the 96-navigation timing table. Labels are capture-start times relative to Next (Home) or first visible pig stage (hero); capture is not instantaneous. Early hero CDP frames supplement the screenshots because initial markup can paint before DOMContentLoaded returns to the capture loop: [1440px early frames](1440-hero-cdp.jpg), [390px early frames](390-hero-cdp.jpg).

- [Desktop Home](1440-home-comparison.jpg): baseline isolated facial rectangles at 349 ms; complete by the 558 ms capture. Atlas empty at 90 ms, complete by the 707 ms capture. Better coherence, not a faster sampled complete frame in this pair.
- [390px Home](390-home-comparison.jpg): baseline isolated eye at 165 ms and complete by the 928 ms capture; atlas empty at 145 ms, complete by the 442 ms capture.
- [Desktop direct hero](1440-hero-comparison.jpg) and [390px direct hero](390-hero-comparison.jpg): preserved initial/final composition, with the raw CDP stream showing earlier blank/partial states where captured.
- Readiness counters find mixed 1/0 image states in 11 of 24 baseline cold navigations versus 1 of 24 atlas cold navigations. These are **image readiness states, not compositor flash counts**. One native atlas hero run still reports base-ready before other views; one shared URL alone is not a formal atomic-paint guarantee. No claim that every possible flash is eliminated.

## Verification and limitations

- Original masters/source metadata hash-checked and all existing registered assets preserved. No archival PNG requested at runtime.
- Build/style budgets pass; initial 468.57 kB / 115.95 kB estimated transfer versus baseline 468.57 / 115.97; no meaningful initial-JS growth at reported precision. Normal nonfatal module-type warnings remain.
- Thirty existing carousel/hero tests pass, plus one atlas receipt/registration test covering all ten candidates and source hashes.
- Real desktop/390px: two wink/kiss sequences in a nine-second dwell, no doubled facial features, keyboard pause freezes/resumes, static reduced-motion kiss, forced-colors artwork suppression, scoped axe zero; native link/GA contracts are unchanged. Lifecycle check initially hit its mobile 12 s arrival timeout with a random deck; the deterministic shuffle/20 s guard passes without application changes.
- No overflow/application errors in any of the 96 timing navigations. Mobile observed CLS is zero in both variants. Whole desktop page CLS is not uniformly zero: Home maxima 0.01625 baseline / 0.01495 atlas, direct hero maxima 0.01466 / 0.00836; no attribution to pig geometry is claimed. The stage retains its intrinsic 3:1 footprint.
- Local HTTP/gzip/cache behavior is not Cloudflare HTTP/2/3 or real Android scheduling. CDP CPU slowdown and headless rendering are approximations. LCP values are observed, not Lantern-simulated. Source cache/OS warmness and trace/screencast overhead remain noise sources; cold means browser resource cache, not a rebooted machine.
- Full browser frames/trace files remain in ignored `tmp/evidence/pig-sprite`; compact results, decoder trials and review filmstrips are committed here. Raw submitted content/provider data is absent.
- WebP candidates are generated and geometry/hash validated; the 96-run transfer/timing comparison selects AVIF. It is not a WebP or cross-browser performance claim.

## Reproduction

1. Build baseline SHA 2842cd7 in a separate worktree; copy its browser output to `tmp/baseline-browser` here.
2. `node scripts/tcc-pig-slide/sprite.mjs`; `npm run build`.
3. `node scripts/tcc-pig-slide/compare.mjs` for the default 96-navigation matrix.
4. Set PIG_REPS=1, PIG_PROFILES=slow, PIG_CACHES=cold, PIG_VISUAL=1 and run compare again for the separate eight-navigation visual pass.
5. `node scripts/tcc-pig-slide/decode.mjs`; `node scripts/tcc-pig-slide/filmstrip.mjs`; `node scripts/tcc-pig-slide/report.mjs`.
6. `node --test scripts/tcc-pig-slide/sprite.test.mjs`; focused Angular carousel/hero suites. No scripts deploy or call a paid evaluation.

Original artwork history remains under `artwork/tcc-pig-slide`; generation receipts are in `sprite-manifest.json`. This local branch changes only pig delivery and directly related evidence. Production remains untouched.
