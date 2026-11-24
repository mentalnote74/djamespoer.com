# [Larry] SCRUM-215 ? direct Cloudflare Lighthouse comparison

## Execution

The PSI path returned an upstream524 for Tom John after125055ms, also failed in Google's tester, and could not control the two execution hosts. This replacement removes PSI entirely.

Existing drawer POST -> same-origin Worker validation/per-IP limit -> existing account Browser Run binding acquires Chrome -> official browser-compatible Lighthouse13.6.0 bundle executes both sites sequentially in separate fresh contexts within that one browser -> actual scores/provenance -> measured JSON summary in existing R2 -> drawer/established analytics helper. No separate Node host, paid Container, GitHub Actions backend, new credential, npm dependency, cache fallback or score adjustment.

The standalone Node prototype4ba49a8 and its host blocker are superseded. Existing Cloudflare Browser Run already works using normal Wrangler authentication. Production uses the binding, not token extraction or browser-admin credentials.

## Matching and lifecycle

One explicitly selected Mobile/Desktop test, four categories, en-US, simulated throttling, fresh storage. Desktop includes all official desktop settings: form factor,1350x940 viewport, desktop user-agent and Dense4G throttling. Default Lighthouse wait bounds30s FCP/45s load; script110s/client130s safety ceilings. Actual Chrome version, Lighthouse version, timestamp and complete configSettings must agree before awarding a verdict. Hardware/network/browser differences mean manual tests on a different machine need not return identical numbers.

Browser.getVersion completes before auditing. Every context closes; the Worker closes the acquired session on success, failure or client cancellation. No background waitUntil dependency. Cold start is measured elapsed time. Quota/creation rate failures are explicit; no automatic retry or paid fallback. Free plan includes10 browser minutes/account/day and at most one new browser per20s; daily exhaustion resets at midnight UTC. Other account usage shares this allowance.

QA/demos set portfolio.analytics.internal before first script. Public comparisons preserve normal startup scripts. Both sites' collection transports receive intercepted204 responses rather than network errors: QA never sends their pageviews/actions, and blocked collectors do not fabricate console-error penalties. Parent result events still respect consent/internal marking. No page content, secrets or raw audit details added to GA; only existing approved result parameters. JSON summaries contain tested public URL, scores, metrics, failed audit IDs and actual provenance; opaque UUID report links, no public listing. Raw HTML/private career material never stored. Existing R2 stores these small immutable summaries; no new bucket or cleanup.

## Evidence and reproducibility

Official DevTools bundle source commit/hash/license and third-party classifier provenance: vendor/README.md. Runtime is committed server-only text, not client JavaScript or a runtime CDN dependency. The classifier is the real already-installed third-party-web API, not a scoring stub. Custom serialized function source is comparison.js.txt, avoiding bundler helper leakage into the isolated script.

Five focused handler checks pass: same measured pair/lifecycle, mismatch/failure, input/origin, cancellation and free quota. Production build84 prerenders passes with existing warnings; Worker upload approximately2.4MiB, gzip0.7MiB. Focused analytics checks are reused/rechecked for the added error enums.

Actual built drawer -> deployed Cloudflare preview backend -> live www.tomjohn.design and DJP completed in about35s:99/94/100/100 and99/100/100/100. Both Lighthouse13.6.0/Chrome152.0.7977.64, exact matching desktop settings including non-mobile UA. All8 intercepted result-event values equal measured response, exactly one result event. Targets INTERNAL; no public collection. Evidence ignored tmp/cloudflare-browser-receipt.json and tmp/browser-proof/. This is preview evidence; production receipt follows release, not assumed from a build.

Normal production pipeline: main Cloudflare Workers Build reads wrangler browser binding; no external-host setup or approval outstanding. Verify actual production commit and the same Tom John comparison after deploy. Keep experiment inactive and unrelated work intact.

## Manual fallback when the account allowance is exhausted

The current Workers Free deployment checks Browser Run usedBrowserTimeSeconds against600 before acquisition; it returns browser_quota without launching Chrome when exhausted. This is the actual current plan limit, not an increase in capacity. Revisit the guard if the owner changes plans. The existing drawer supplies both site links and manual Chrome DevTools instructions, hides repeat automated controls for that state, and asks the visitor to reload after the midnight-UTC reset. Manual settings: same Chrome/Incognito environment and viewport/DevTools placement, Navigation, same selected Desktop/Mobile device, Performance/Accessibility/Best Practices/SEO only, identical throttling/storage choices, loaded page/full state URL, one audit at a time and saved JSON reports. Confirm each report preview shows the rendered page. Sources: https://developer.chrome.com/docs/devtools/lighthouse/ and https://developer.chrome.com/docs/devtools/open/.

This fallback neither fixes nor conceals previously observed rendering differences in automation. No live audit is needed to verify it; quota responses are mocked and QA starts INTERNAL.
