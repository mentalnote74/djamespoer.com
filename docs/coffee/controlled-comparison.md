# [Larry] SCRUM-215 ? controlled browser comparison

## Cause and replacement

The production PSI proxy starts independent Google jobs. Same API parameters do not control their Chrome hosts or make a failed audit complete. Saved Tom John evidence: upstream HTTP524 after125055ms; Google UI also failed. A successful different-site control did not establish resolution. Replace this execution path entirely.

Browser POST -> Cloudflare same-origin proxy -> authenticated Node/Chrome service -> accepted job ID -> sequential Lighthouse audits in fresh Chrome profiles on one host -> browser polls measured JSON -> existing result display and analytics. No PSI call, independently aged cache, retry, historical substitute, extension or adjusted score. Measured JSON links refer to these runs.

## Execution contract

One selected Desktop/Mobile mode; exact same config, Lighthouse version and Chrome version for both sites. Node24, locked existing Lighthouse/Puppeteer dependencies, host Chrome via CHROME_PATH. Browser.getVersion succeeds before each audit. Explicit Desktop settings or default mobile settings, simulated throttling, en-US, four categories, fresh storage. Result retains actual fetchTime, versions, full configSettings and FCP/LCP/TBT/CLS/Speed Index. Different settings/versions cannot produce a winner. Host/network variability still prevents guaranteed numerical equality to manual tests on another machine.

One job at a time; existing public API per-IP limit; three-minute execution cap; six-minute transient result lifetime. Cancellation aborts Chrome once the job ID has been accepted. Restart/expiry returns a failure, never stale scores. Creation can include host cold-start delay; it does not wait for audits. No durable report claim: job state lives in service memory.

Worker forwards only defined API paths and a dedicated server key; never visitor cookies, query strings or incoming auth. Service key minimum32 random characters, server environments only. Targets reject local/private addresses; page requests reject private DNS destinations. This is not complete DNS-rebinding containment; host must isolate the browser from sensitive networks and credentials. Browser sandbox stays enabled. No URL/page content in logs or GA added by the runner. No public workflow artifacts. Ordinary QA starts INTERNAL before scripts; collectors intercepted equally. Public comparisons preserve page startup scripts and suppress only collection transports equally. Parent analytics retain consent/internal suppression.

## Deployment dependency and concrete commands

No host or billing provisioned. Required: isolated Node24/Chrome host capable of running both audits, HTTPS endpoint, COFFEE_RUNNER_KEY environment secret and CHROME_PATH. Start: node scripts/coffee/service.mjs. /health becomes ready only after an actual Chrome handshake. Configure the existing Cloudflare Worker with COFFEE_RUNNER_URL (HTTPS root URL) and the same COFFEE_RUNNER_KEY secret, then release through normal main pipeline. Never merge/deploy the frontend/proxy without the live runner.

GitHub Actions was rejected before deployment: its terms limit use to development/testing, not production visitor compute. Cloudflare Browser Run has10 free browser minutes/day but browser availability does not demonstrate Node Lighthouse compatibility in a Free Worker. Render Free docs warn against production use and describe cold starts/resource/egress limits. No free-host claim has been verified. Hosting access is an explicit blocker, not another implicit paid purchase.

## Actual verification

Four service/proxy protocol checks passed (auth/validation/concurrency, cancellation, real-score forwarding/no visitor-cookie leak). Production Angular build passed84 prerenders; existing warnings remain. Wrangler dry-run bundled the replacement Worker64.47KiB. Existing focused analytics checks41/41 passed.

Real built-drawer -> new service -> live www.tomjohn.design + djamespoer.com test passed:97/94/100/100 vs95/100/100/100. Actual versions/settings match; eight result-event values equal measured data. INTERNAL before startup on target profiles, all parent/result collectors intercepted; no public GA receipt claimed. Evidence ignored tmp/service-browser-receipt.json. This is LOCAL, not a production receipt. Next gate: actual hosted service and full production-path check of the same failing target; only then declare fixed.
