# Buildometer: first evidence-backed instruments

## Product question and hierarchy

The page asks whether this project is progressing toward done. Completion dominates; shipping, pace, scope and quality support it; dated evidence comes last. A prominent uncalibrated instrument is intentional when the denominator is unknown. It must never show 0% merely because data is missing.

The first implementation does not fetch Jira directly or publish issue descriptions. Repository inspection found no complete public Jira snapshot, scope membership, estimates, completion events or bug/reopen history. Connecting those sources is a subsequent data integration, not a reason to invent numbers now.

## Sources actually available

- `public/data/deployment-history.json`: existing validated version-4 snapshot, successful activations, build attempts, source checked/generated timestamps. The established production-refresh/build pipeline remains unchanged. Refresh occurs during the existing production release command; no new credential or pipeline.
- `public/data/product-journal.json`: dated published notes, generated/published dates and source-commit provenance. Existing journal navigation is reused. Notes are qualitative; no NLP/commit-message inference or invented item counts.
- `scripts/scrum-brief/status.json`: explicit public status metadata, verified October 17 and valid through October 24 at implementation. Not a numerical Jira dataset. Read during discovery only; the Buildometer consumes published journal content, not a parallel scheduler/status pipeline.

## Metric contracts

| Instrument | Formula / inclusion | Current availability |
| --- | --- | --- |
| Complete | 100 x done committed items / all active committed items; whole-percent rounding | Pending a complete versioned committed-scope snapshot |
| Completed / remaining | Done / open items in that same committed scope | Pending |
| Velocity | Sum of completed estimates per agreed interval, with estimate coverage | Pending estimates, dates and stable scope; item counts cannot substitute |
| Throughput | Historical completion cycles per interval; a later completion requires an evidenced reopen | Pending completion events; commits/deployments/journal bullets cannot substitute |
| Burndown | Remaining committed work at each dated snapshot; scope changes separate | Pending historical scoped snapshots |
| Deployments / 7 days | Count distinct retained activation IDs with production + succeeded + deployed; timestamp in (checkedAt - 7 days, checkedAt] | Available; explicitly recorded deployments, not features or unique revisions |
| Scope change | Entries/exits from committed scope, net = added - removed, same window/version lineage | Pending membership events; total backlog noise excluded |
| Bug duration | Mean classification-or-reopen to Done time for observed closed cycles; show cycle/issue sample sizes and exclude open cycles | Pending lifecycle events; no mean from open ages |
| Bug creation / elimination | First evidenced classifications / closed bug cycles per matched window | Pending classified bug events |
| Bug rate : rework rate | Separate events with an agreed denominator and explicit rework classification | Pending taxonomy; fixes are not automatically rework |

Completion contract: explicit `committed` items only. Uncommitted backlog, cancelled and superseded items are excluded. No scope or zero scoped items means unavailable. Duplicate work IDs are rejected, not silently counted twice. A scope version is mandatory. Changes to membership require a new version and scope-change reporting. This is a proposed committed-scope policy, not an assertion that Jira already encodes it.

Shipping time: seven exact rolling 24-hour buckets end at the source check timestamp, not browser render time. Boundary timestamps belong to one bucket only. Future records and records exactly on the opening boundary are excluded. A source older than 24 hours, or ahead of the client clock, is flagged. Snapshot retention is not proof of complete lifetime history; the UI names the count as retained/recorded evidence. Failed builds and preview deployments are excluded. Repeated activations of the same revision count because they are separate shipping operations.

Journal dates remain the published artifact dates. Old entries are not relabeled today. Each excerpt links to its complete dated journal entry; this page neither rewrites nor regenerates briefs.

## Design decisions retained

- Kept the large completion gauge as the visual anchor; rejected a decorative needle/value with no denominator.
- Rejected nine equal KPI cards and chart salad. One shared raised console, inset dial/pace instruments, an open scope row, a dedicated bug container, and editorial journal rows create differentiated hierarchy.
- Kept velocity and throughput distinct; rejected deployment counts as a proxy for either.
- Refined the deployment signal to seven-day retained activations with timestamped textual history. Bars answer when shipping happened; they do not imply work-item completion.
- Considered candlestick bug history, deferred it: no lifecycle distribution exists to justify candles, quartiles or ranges.
- Kept bug and rework rates separate/unmeasured rather than inventing classifications or a ratio.
- No forecast or estimated finish date: without stable scope/history it would be false precision.
- The existing Deployment History grid remains parked, unmodified and absent from home. Only its validated data is reused here; no eager homepage fetch.

## Architecture, access and performance

Lazy `/buildometer` route under the existing lazy interior routes; direct route maps to the CSR shell. Typed pure derivations and validated public data boundaries; no Jira structures or calculations in templates. Two public JSON requests start only after this route renders. Failures are independent, explicit and retryable; no fabricated fallback dataset. No chart dependency, JS animation loop or component animation.

Native SVG gauge and CSS bars have textual equivalents. Decorative gauge/bar geometry is hidden from assistive technology; the data/history is ordinary text/list content. Missing completion is not exposed as a false numeric meter. Native details controls keep keyboard/focus behavior. Existing theme, typography, depth, focus and forced-color tokens remain authoritative. Mobile stacks the same instruments and keeps deeper history behind disclosures. No alternate app or duplicated mobile data.

Verification: six focused derivation tests; production build/budgets; desktop/390px direct and SPA navigation; matching independently counted shipping records; eight-theme reflow; keyboard disclosure and focus outline; reduced motion/forced colors; two scoped main-content axe checks; source-error/retry recovery; no homepage Buildometer chunk or deployment-history request. No Lighthouse run.

## Next source gate

Agree the initial committed scope/version and publish a complete sanitized work-item snapshot with lifecycle/estimate coverage. Until then, completion and work/bug rates remain unavailable. Do not substitute repository commit count or subjective progress percentages.


## SCRUM-120: dynamic instrument skins

The previous page required reading a report before finding the project signals. The primary viewport now contains eight instruments in semantic order: completion, done/remaining, velocity, throughput, deployments, scope change, burndown and bug health. Interpretation, evidence/journal, and methodology follow. No data contracts or formulas changed.

Architecture: sources -> existing validated derivation -> normalized DashboardMetric array -> one InstrumentCluster HTML tree -> selected InstrumentSkin recipe. The cluster owns presentation only. Each recipe declares identity, geometry and bounded presentation tokens. Business values never enter recipe code and selecting a skin never reloads sources. Async recipe loads use a request counter, so the latest selection wins. Failed skin loads retain the previous presentation (or host-theme fallback) with a visible status; metrics stay readable. Skin choice is session-local; no new persistence.

Reference: Night Driver, K.I.T.T.-inspired but using original CSS/SVG rather than franchise artwork. Recessed dark instrument housings, segmented main scale, warm high-contrast digital readouts, open/solid source lamps with explicit text, chassis highlight/shading and a slow decorative scanner. Workshop proves independent geometry with an analog scale and host-theme materials. Both use the identical metric DOM. Actual completion drives the progress arc and analog needle only when level is non-null; unknown completion has neither. Scanner motion is atmosphere, never a fabricated rate or healthy status.

Conceptual layers: rear chassis (cockpit surface/gradient); instrument face (housing, scale/bezel); motion (conditional arc/needle and scanner); atmosphere (restrained scanner light and material highlight); semantic HTML (names, values, notes/status); interaction (native labelled select, links and disclosures). Decorative geometry is aria-hidden. Forced colors removes art while preserving text and selection; reduced motion freezes the scanner. No animation is necessary to read a value.

Desktop uses a 12-column instrument cluster: prominent completion spans four columns and two rows, six compact readouts and a wider bug-health housing fill the remainder. At 1440x900 the cluster ends around 745px including site header. Mobile uses a full-width completion instrument, paired compact metrics and full-width bug health, not a scaled-down desktop cockpit. DOM/focus order stays unchanged.

Recipe modules are dynamically imported on selection behind the already-lazy Buildometer route. Only the chosen recipe is requested; shared layout/art CSS remains with the cluster. No chart library, images, new dependencies, JS animation loop or homepage source fetch. Build verification tracks the small shared compiler-byte change separately from route-local skin code.

Future skins: General Lee-inspired analog racing, Batmobile-inspired tactical arcs, Speed Racer-inspired retro instruments and Hydrogen Generating Astro Balloon lift/pressure instruments are design directions, NOT selectable implementations. Add a typed recipe/loader and scoped decorative treatment as needed; reuse DashboardMetric and semantic cluster. Do not invent data to animate an instrument or create per-skin dashboards. Load substantial future artwork only for the selected skin.

Verification: eight focused derivation/normalized-model tests; Chrome desktop/390px switching with identical values, no source refetch, eight-theme reflow, labelled native selector/focus, reduced motion and forced colors. Four scoped axe runs (two skins x two widths) have zero violations. Homepage requests neither the Buildometer route nor deployment snapshot. Data honesty and original metric rationale above remain authoritative.


### Throughput / bug cohort correction

Current definitions supersede the first-pass current-state/resolution cohort described in earlier checkpoints. Throughput comes from actual Done transitions, not only today's Done items. Historically bug-classified issues remain in the analytics cohort after label/type removal. Recompletion counts only after an actual reopen; duplicate transitions do not count. Classification is not real-world detection. Current capture remains one seven-day completion and 51.2 mean hours from only two resolved cycles across two issues; the dashboard explicitly warns about this sparse sample. No metric value was forced to increase. See data-api.md for exact event/cohort and time-bucket rules. Completion, velocity, scope, burndown and deployment definitions are unchanged.
