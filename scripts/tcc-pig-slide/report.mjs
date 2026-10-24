import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const raw = 'tmp/evidence/pig-sprite',
  out = 'docs/evidence/pig-sprite-comparison';
await mkdir(out, { recursive: true });
const rows = JSON.parse(await readFile(raw + '/results-baseline-sprite.json', 'utf8'));
const decode = JSON.parse(await readFile(raw + '/decode.json', 'utf8'));
const median = (a) => a.toSorted((a, b) => a - b)[Math.floor(a.length / 2)];
const rounded = (n) => Math.round(n);
const range = (a) =>
  `${rounded(median(a))} (${rounded(Math.min(...a))}-${rounded(Math.max(...a))})`;
const render = [];
for (const r of rows.filter((r) => r.rep === 1)) {
  const t = JSON.parse(gunzipSync(await readFile(`${raw}/${r.id}/trace.json.gz`)));
  const entries = t.traceEvents.filter((e) => e.ph === 'X');
  const core = entries.filter((e) => e.name === 'Decode Image');
  const paint = entries.filter(
    (e) => e.name === 'PaintImage' && /\/tcc-pig\/|\/pig-sprite\//.test(e.args?.data?.url ?? ''),
  );
  render.push({
    id: r.id,
    pigPaintCpuMs: paint.reduce((n, e) => n + (e.tdur ?? 0) / 1000, 0),
    pageCoreDecodeCpuMs: core.reduce((n, e) => n + (e.tdur ?? 0) / 1000, 0),
    pageRasterWallMs: entries
      .filter((e) => e.name === 'RasterTask')
      .reduce((n, e) => n + (e.dur ?? 0) / 1000, 0),
  });
}
// Do not publish the exploratory nested-decode accumulator or cumulative task
// counters as per-pig measurements. Proper core CPU/render attribution is above.
const normalized = rows.map((r) => ({
  id: r.id,
  mode: r.mode,
  width: r.width,
  dpr: r.dpr,
  profile: r.profile,
  rep: r.rep,
  scenario: r.scenario,
  cache: r.cache,
  completeAfterArrivalMs: r.completeAfterArrivalMs,
  completeAfterVisibleMs: r.completeAfterVisibleMs,
  openingLcpMs: r.opening?.lcp ?? null,
  initialHeroLcpMs: r.scenario === 'hero' ? r.paint.lcp : null,
  pigRequests: r.pigRequests,
  pigTransferred: r.pigTransferred,
  pigEncodedBytes: r.pigEncodedBytes,
  decodedRgbaBytes: r.decodedRgbaBytes,
  cls: r.paint.cls,
  overflow: r.overflow,
  errors: r.errors,
  states: r.pig.states,
  arrival: r.pig.arrival,
  firstVisible: r.pig.first,
  decodedReady: r.pig.complete,
  resources: r.resources.map((x) => ({ ...x, url: new URL(x.url).pathname })),
  trace: render.find((x) => x.id === r.id) ?? null,
}));
await writeFile(
  out + '/measurements.json',
  JSON.stringify(
    {
      schemaVersion: 2,
      baselineSha: '2842cd73f88c57a5b75d746f3f3f6c9bf1c62213',
      timingDefinition:
        'all five image elements complete, decode() resolved, then two animation frames; readiness proxy, not a GPU presentation timestamp',
      rows: normalized,
      isolatedDecode: decode,
    },
    null,
    2,
  ) + '\n',
);
let report = `# Pig slide: baseline versus one atlas\n\nLocal review experiment, 2026-10-24. **No push or deployment.** Baseline: \`2842cd73f88c57a5b75d746f3f3f6c9bf1c62213\`.\n\n## Decision\n\n**Reject this candidate for production promotion; preserve the atlas experiment for review.** The atlas meaningfully improves visual coherence and decoder/memory efficiency, but it is not a consistent first-carousel-arrival speed win. The repeatable throttled desktop warm-cache readiness regression (133 to 280 ms), higher desktop transfer, and inconclusive opening LCP comparison prevent calling the present implementation an overall delivery win. This does not reject atlas delivery in principle. No further optimization or preload workaround was implemented.\n\n## Cause and local change\n\nThe baseline paints the base and four facial replacements independently. Animation readiness waits for all five, but artwork visibility does not. Actual frames show an isolated eye/mouth before the base, and a base with rectangular eye/mouth holes before replacements arrive. This is piecemeal image presentation, not a demonstrated white CSS placeholder or changed pig artwork.\n\nOne 2172 x 928 atlas holds the original 2172 x 724 base and the four unchanged native photographic patches in a guarded strip underneath it. Five clipped views reuse the same responsive URL, so Chrome performs one network fetch/shared decode. The on-screen stage stays 3:1. Original masters, alpha masks, legacy deliveries and all registered deliveries are preserved byte-for-byte. AVIF first, WebP fallback, 384/768/1200/1440/2172 widths; no carousel-wide preload or eager change. Uniform AVIF quality 66 protects the facial material; baseline used base quality 48 and patch quality 66. This increases desktop base quality/payload instead of disguising a reduction in patch quality. WebP uses quality 84.\n\nNative destination link, PublicTrack attributes, exact copy and animation stylesheet are unchanged. Active/visibility/intersection gates still control the existing four-second expression loop. Atlas packing remains local to this scene.\n\n## Conditions and interpretation\n\n- Chrome headless on Windows, extensions disabled; production builds served locally with gzip text, cacheable images and uncached HTML. No Lighthouse/Lantern simulation. No paid/provider calls.\n- 1440 x 1000 at DPR 1; 390 x 1000 at DPR 2 with touch support. This is desktop Chrome emulation, not an Android hardware test.\n- Native connection/CPU, or CDP 150 ms latency, 204800 bytes/s download (1638.4 Kbps), 84375 bytes/s upload, CPU 4x. Same settings for both variants.\n- Three repetitions in every width/profile/scenario/cache cell; 96 navigations, alternating variant order. New browser context and cleared disk cache for cold; same-context second navigation for warm. Native decoder/resource cache warmth is therefore preserved.\n- Direct \`/case-studies/tcc\` covers initial display. Home uses a deterministic valid shuffle (test-only Math.random=0.37), keeps Conservatory first, then one existing Next action gives the pig its first arrival. No production deck changes.\n- Complete-artwork timing below is a **decoded-composite readiness proxy**: all five images complete, all decode promises fulfilled, then two requestAnimationFrame callbacks. Arrival is Next activation for Home, navigation start for hero. It is not an exact hardware scanout timestamp.\n- All cold Home pig requests start after Next; warm-cache entries may resolve before arrival through existing browser cache behavior. No new preload or forced eager homepage artwork was introduced.\n- Opening LCP is the observed entry immediately before first carousel interaction (load plus 500 ms checkpoint), not a Lighthouse score or a guarantee of later LCP finalization. Different opening values before any cold pig request cannot be attributed to atlas image transfer.\n\n## Decoded-composite readiness, ms\n\nMedian (minimum-maximum), three samples per entry.\n\n| Width | Profile | Cache | Surface | Baseline | Atlas |\n|---|---|---|---|---:|---:|\n`;
for (const width of [1440, 390])
  for (const profile of ['native', 'slow'])
    for (const cache of ['cold', 'warm'])
      for (const scenario of ['home', 'hero']) {
        const values = (mode) =>
          rows
            .filter(
              (r) =>
                r.width === width &&
                r.profile === profile &&
                r.cache === cache &&
                r.scenario === scenario &&
                r.mode === mode,
            )
            .map((r) => r.completeAfterArrivalMs);
        report += `| ${width} | ${profile} | ${cache} | ${scenario === 'home' ? 'First carousel arrival' : 'Direct TCC hero'} | ${range(values('baseline'))} | ${range(values('sprite'))} |\n`;
      }
report += `\nCold throttled Home barely changes: desktop 552 to 538 ms, mobile 459 to 454 ms. Direct TCC improves: desktop 2622 to 1570 ms, mobile 1568 to 802 ms. Warm desktop throttled Home regresses in all three pairs: baseline 137/133/120 versus atlas 280/384/171 ms. Its cause is not established by decoder work alone; it must not be dismissed as a network win.\n\n## Actual selected AVIF delivery\n\n| Viewport | Selected width | Baseline image bytes | Atlas image bytes | Baseline transfer | Atlas transfer | Requests | Approx. decoded RGBA |\n|---|---:|---:|---:|---:|---:|---|---|\n`;
for (const width of [1440, 390]) {
  const a = rows.find((r) => r.width === width && r.mode === 'baseline' && r.cache === 'cold'),
    b = rows.find((r) => r.width === width && r.mode === 'sprite' && r.cache === 'cold');
  report += `| ${width} | ${width === 1440 ? 1440 : 768} | ${a.pigEncodedBytes} B | ${b.pigEncodedBytes} B | ${a.pigTransferred} B | ${b.pigTransferred} B | 5 to 1 | ${(a.decodedRgbaBytes / 1048576).toFixed(2)} to ${(b.decodedRgbaBytes / 1048576).toFixed(2)} MiB |\n`;
}
report += `\nDesktop transfers 5,143 more bytes (+16.2% including the resource-timing header allowance); mobile transfers 1,158 fewer (-9.1%). Warm image transfer is zero for both. Resource Timing adds a standard 300-byte allowance per network resource; these are browser transferSize figures, not packet captures. Estimated unique decoded RGBA falls about 74.4%. This is dimensions x 4, **not measured GPU/process memory**; AVIF planes, decode caches, tiling and browser retention differ. Five DOM image views remain; this is shared-resource delivery, not a new scene engine.\n\n## Decoder and rendering cost\n\nA separate no-site blank-page decoder check loads exactly the five baseline images or five references to the one atlas, three repetitions, with no unrelated images and no throttling. Core \`Decode Image\` thread CPU excludes nested decoder wrappers.\n\n| Selected width | Baseline cold CPU ms | Atlas cold CPU ms | Baseline cold decode/load wall ms | Atlas cold decode/load wall ms |\n|---|---:|---:|---:|---:|\n`;
for (const width of [1440, 768]) {
  const a = decode.filter((r) => r.width === width && r.mode === 'baseline' && r.cache === 'cold'),
    b = decode.filter((r) => r.width === width && r.mode === 'sprite' && r.cache === 'cold');
  report += `| ${width} | ${median(a.map((r) => r.coreDecodeCpuMs)).toFixed(2)} | ${median(b.map((r) => r.coreDecodeCpuMs)).toFixed(2)} | ${range(a.map((r) => r.decodeWallMs))} | ${range(b.map((r) => r.decodeWallMs))} |\n`;
}
report += `\nChrome records five cold core decode events versus one; warm re-use records zero new core decode events in this check. The atlas therefore has a real decode saving, not just fewer requests.\n\nURL-attributed pig PaintImage CPU in the first cold Home trace is small: native desktop 0.167 to 0.167 ms, native mobile 0.158 to 0.266 ms; throttled desktop 0.488 to 0.575 ms, mobile 0.348 to 0.529 ms. Clipping is not free, but no large CPU rendering penalty appears in these samples. Page-wide raster wall totals are mixed with header/other page work and are not a per-pig GPU benchmark. Traces for repetition one are retained locally; do not treat these single trace samples as statistically established paint improvements. The early exploratory nested decode totals/cumulative page task counters were excluded from the published measurements to avoid double counting or false attribution.\n\n## Opening-page LCP, ms\n\nObserved pre-interaction checkpoint, median (minimum-maximum), three samples. No performance score inferred.\n\n| Width | Profile | Cache | Baseline | Atlas |\n|---|---|---|---:|---:|\n`;
for (const width of [1440, 390])
  for (const profile of ['native', 'slow'])
    for (const cache of ['cold', 'warm']) {
      const values = (mode) =>
        rows
          .filter(
            (r) =>
              r.width === width &&
              r.profile === profile &&
              r.cache === cache &&
              r.scenario === 'home' &&
              r.mode === mode,
          )
          .map((r) => r.opening.lcp);
      report += `| ${width} | ${profile} | ${cache} | ${range(values('baseline'))} | ${range(values('sprite'))} |\n`;
    }
report += `\nThe first native desktop baseline has a 1436 ms outlier followed by 184/184 ms; the atlas native desktop values are 220/188/196 ms. Throttled desktop atlas values 684/1052/1616 ms are substantially more variable than baseline 740/820/676 ms. Mobile cold throttled is 1272/1028/1116 versus 1432/1208/1180 ms. These data **do not establish an opening-page LCP improvement or a clean LCP nonregression**. The later pig request cannot explain an earlier difference; no speculative opener changes were made.\n\n## Filmstrip evidence\n\n[Open the visual review sheet](index.html). The separate screenshot-sampled pass uses the same throttled settings and shows actual artwork, not load counters. Screenshot overhead is deliberately excluded from the 96-navigation timing table. Labels are capture-start times relative to Next (Home) or first visible pig stage (hero); capture is not instantaneous. Early hero CDP frames supplement the screenshots because initial markup can paint before DOMContentLoaded returns to the capture loop.\n\n- [Desktop Home](1440-home-comparison.jpg): baseline isolated facial rectangles at 349 ms; complete by the 558 ms capture. Atlas empty at 90 ms, complete by the 707 ms capture. Better coherence, not a faster sampled complete frame in this pair.\n- [390px Home](390-home-comparison.jpg): baseline isolated eye at 165 ms and complete by the 928 ms capture; atlas empty at 145 ms, complete by the 442 ms capture.\n- [Desktop direct hero](1440-hero-comparison.jpg) and [390px direct hero](390-hero-comparison.jpg): preserved initial/final composition, with the raw CDP stream showing earlier blank/partial states where captured.\n- Readiness counters find mixed 1/0 image states in 11 of 24 baseline cold navigations versus 1 of 24 atlas cold navigations. These are **image readiness states, not compositor flash counts**. One native atlas hero run still reports base-ready before other views; one shared URL alone is not a formal atomic-paint guarantee. No claim that every possible flash is eliminated.\n\n## Verification and limitations\n\n- Original masters/source metadata hash-checked and all existing registered assets preserved. No archival PNG requested at runtime.\n- Build/style budgets pass; initial 468.57 kB / 115.95 kB estimated transfer versus baseline 468.57 / 115.97; no meaningful initial-JS growth at reported precision. Normal nonfatal module-type warnings remain.\n- Thirty existing carousel/hero tests pass, plus one atlas receipt/registration test covering all ten candidates and source hashes.\n- Real desktop/390px: two wink/kiss sequences in a nine-second dwell, no doubled facial features, keyboard pause freezes/resumes, static reduced-motion kiss, forced-colors artwork suppression, scoped axe zero; native link/GA contracts are unchanged. Lifecycle check initially hit its mobile 12 s arrival timeout with a random deck; the deterministic shuffle/20 s guard passes without application changes.\n- No overflow/application errors in any of the 96 timing navigations. Mobile observed CLS is zero in both variants. Whole desktop page CLS is not uniformly zero: Home maxima 0.01625 baseline / 0.01495 atlas, direct hero maxima 0.01466 / 0.00836; no attribution to pig geometry is claimed. The stage retains its intrinsic 3:1 footprint.\n- Local HTTP/gzip/cache behavior is not Cloudflare HTTP/2/3 or real Android scheduling. CDP CPU slowdown and headless rendering are approximations. LCP values are observed, not Lantern-simulated. Source cache/OS warmness and trace/screencast overhead remain noise sources; cold means browser resource cache, not a rebooted machine.\n- Full browser frames/trace files remain in ignored \`tmp/evidence/pig-sprite\`; compact results, decoder trials and review filmstrips are committed here. Raw submitted content/provider data is absent.\n- WebP candidates are generated and geometry/hash validated; the 96-run transfer/timing comparison selects AVIF. It is not a WebP or cross-browser performance claim.\n\n## Reproduction\n\n1. Build baseline SHA 2842cd7 in a separate worktree; copy its browser output to \`tmp/baseline-browser\` here.\n2. \`node scripts/tcc-pig-slide/sprite.mjs\`; \`npm run build\`.\n3. \`node scripts/tcc-pig-slide/compare.mjs\` for the default 96-navigation matrix.\n4. Set PIG_REPS=1, PIG_PROFILES=slow, PIG_CACHES=cold, PIG_VISUAL=1 and run compare again for the separate eight-navigation visual pass.\n5. \`node scripts/tcc-pig-slide/decode.mjs\`; \`node scripts/tcc-pig-slide/filmstrip.mjs\`; \`node scripts/tcc-pig-slide/report.mjs\`.\n6. \`node --test scripts/tcc-pig-slide/sprite.test.mjs\`; focused Angular carousel/hero suites. No scripts deploy or call a paid evaluation.\n\nOriginal artwork history remains under \`artwork/tcc-pig-slide\`; generation receipts are in \`sprite-manifest.json\`. This local branch changes only pig delivery and directly related evidence. Production remains untouched.\n`;
report = report.replace(
  'Early hero CDP frames supplement the screenshots because initial markup can paint before DOMContentLoaded returns to the capture loop.',
  'Early hero CDP frames supplement the screenshots because initial markup can paint before DOMContentLoaded returns to the capture loop: [1440px early frames](1440-hero-cdp.jpg), [390px early frames](390-hero-cdp.jpg).',
);
await writeFile(out + '/README.md', report);
for (const width of [1440, 390])
  for (const scenario of ['home', 'hero'])
    await copyFile(
      `${raw}/review/${width}-${scenario}-comparison.jpg`,
      `${out}/${width}-${scenario}-comparison.jpg`,
    );
for (const width of [1440, 390])
  await copyFile(`${raw}/review/${width}-hero-cdp.jpg`, `${out}/${width}-hero-cdp.jpg`);
await writeFile(
  out + '/index.html',
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pig atlas comparison - local review</title><style>body{font:16px/1.5 system-ui;background:#f5f1e9;color:#182b33;margin:2rem}main{max-width:110rem;margin:auto}img{max-width:100%;height:auto}a{color:#16485b}a:focus-visible{outline:3px solid}figure{margin:2rem 0}figcaption{max-width:70ch}</style><main><h1>Pig slide: baseline versus atlas</h1><p>Local comparison only. Top row baseline; bottom row atlas. Actual throttled browser screenshots. Click images for full resolution. <a href="README.md">Measurements, recommendation and limitations</a>.</p>${[1440, 390].flatMap((width) => ['home', 'hero'].map((s) => `<figure><h2>${width}px - ${s === 'home' ? 'first carousel arrival' : 'direct TCC hero'}</h2><a href="${width}-${s}-comparison.jpg"><img src="${width}-${s}-comparison.jpg" alt="${width}px ${s}: baseline and sprite progression with capture-start time labels"></a><figcaption>150ms latency, 1.6Mbps download, 4x CPU. Frames sample the transition; screenshot overhead is excluded from performance medians.</figcaption></figure>`)).join('')}</main></html>`,
);
const sheet = await readFile(out + '/index.html', 'utf8');
await writeFile(
  out + '/index.html',
  sheet.replace(
    '</main>',
    [1440, 390]
      .map(
        (width) =>
          `<figure><h2>${width}px - early direct-hero CDP frames</h2><a href="${width}-hero-cdp.jpg"><img src="${width}-hero-cdp.jpg" alt="Early direct-hero filmstrip with baseline facial holes and a later assembled snapshot"></a><figcaption>CDP sampling supplements the screenshot loop; the final assembled snapshot is later and is not assigned a fabricated presentation time.</figcaption></figure>`,
      )
      .join('') + '</main>',
  ),
);
console.log(out + '/README.md');
