# Buildometer release reconciliation

Owner: James. Operator: Larry or an authorized release operator. This is the named **BOM release reconciliation check** in release completion and AI_HANDOFF. It reuses the approved known-scope ledger and existing observer; it is not live Jira status counting or a new scheduler.

## Normal release completion

1. Finish the normal release and verify production success, deployed source SHA and actual affected behavior. Pending, failed, preview and build-only records earn no shipped credit. Save the successful activation ID/time, source SHA and a reviewable receipt URL. Never infer shipment from Jira Done or a commit subject.
2. Capture a complete sanitized Jira inventory through the existing connector/operator path. NDJSON fields: key, title, type, parent, status and points (`null` for genuinely missing estimates). Discover/use the site's estimate field; capture every page. No people, descriptions, tokens or private career input. Keep raw acquisition out of public assets.
3. Prepare a reviewed item-to-release mapping using `scripts/buildometer/release-evidence.json`'s schema. Each credited story needs its reachable implementation commit, existing evidence path and whole-story acceptance note. Validate behavior/owner acceptance separately: ancestry/path existence cannot prove acceptance. Archive the receipt and decisions beside each reviewed reconciliation under `docs/buildometer/reconciliation/`. The current eligible-release receipt is committed at `scripts/buildometer/release-evidence.json`; update it only from verified delivery, not build time.
4. Run `npm run buildometer:release-check`. It reports the ledger observation and latest recorded eligible successful release. `-- --strict true` exits 2 for an unreconciled newer release. Invalid receipts fail nonzero with an actionable message. This is an operator/handoff step, not a predeployment gate that awards credit before success.
5. Prepare a complete candidate from the previous approved membership, current inventory, release evidence and explicit decisions:

```powershell
npm run buildometer:reconcile -- prepare --inventory tmp/buildometer/jira.ndjson --evidence scripts/buildometer/release-evidence.json --decisions docs/buildometer/reconciliation/2026-11-06/decisions.json --out tmp/buildometer/candidate
```

`add` and `ship` contain issue keys; `remove`, `reestimate` and `unship` contain objects with key and reason (reestimate also points). `defer` can document held membership decisions. Missing estimates never become zero. Explicit exclusions, epics, samples, duplicate members and parent/child double credit fail closed. Existing members/estimates/dispositions are preserved unless explicitly changed. The tool validates actual Git ancestry and artifact existence and lists every nonmember needing a decision. The output's totals have no invented observation date.

6. Review the item-level changes, unresolved items and exact `candidateHash`. Scope additions/removals/reestimates require James's recorded approval. For subsequent unchanged approved scope, an authorized operator can record whole-story acceptance against verified production evidence under this procedure, without repeatedly asking James to approve unchanged membership. Ambiguous acceptance, partial stories, reverted work, scope or estimates remain explicit decisions; never assume them approved. The initial workflow itself is for James's review before production.
7. Save an approval JSON containing `candidateHash`, `reviewer`, `reviewRef` and, for any scope/estimate changes, `scopeReviewRef`. These are actual recorded references, not invented signatures. Run:

```powershell
npm run buildometer:reconcile -- apply --candidate tmp/buildometer/candidate/candidate.json --approval docs/buildometer/reconciliation/2026-11-06/approval.json
npm run buildometer:release-check
```

Apply rejects a changed candidate, changed ledger or changed companion member file. It invokes the existing observe command with the exact reviewed members and auditable reason. The observer uses the actual apply time, retains original header/observation bytes, and regenerates aggregate projection, home summary and server member list. Same membership/points/shipped flags are a no-op by default: no duplicate observation and no fake freshness. If a genuinely newer verified eligible release changes behavior without changing whole-story points, set `verifyUnchangedRelease: true` in decisions and record its actual operator review. Only that explicit reviewed successful newer release can append a flat prospective point. An old receipt, rebuild, label or reason alone never advances observation time. Apply also rejects a changed current release receipt. No observation is backdated to a release or reconstructed from current Jira state.

8. Commit the approved observation, projection, summary, receipt/review evidence and relevant tests/handoff. This task's production release still requires owner review. Do not deploy merely because the command succeeded.

## Publishing the post-release observation without a loop

The static home summary/public project projection are build artifacts, so a production release cannot include its own later verified-success observation. After a verified eligible release, use at most **one bounded follow-up data release** to publish its approved observation. The follow-up may change only ledger/projection/generated membership/summary, release/review receipts and handoff/docs; inspect the Git diff and record it as projection-only. It does not ship new eligible functionality and therefore does not become a new eligible release requiring yet another observation. A source/functionality change is not projection-only. Normal pipeline success still must be verified.

No automatic provider credential acquisition or fully automatic acceptance mapping is implemented. Jira capture, receipt/behavior review, scope approval and final release classification remain operator work. No new service, scheduler, secret/client token, paid call or metric denominator was introduced. The release-check can only reason about the latest **recorded** eligible release; omitting a release receipt is not proof of freshness.

## Failure recovery and freshness

- Acquisition or mapping incomplete: retain previous approved numbers/date; show the pending/unresolved state. Do not manufacture points or broad shipment credit.
- Candidate/ledger hash changed: regenerate and review again; do not reuse approval for different content.
- Failed delivery: do not mark stories shipped. Preserve failure receipts separately; do not promote them to eligible success.
- Projection write/build failed after append: preserve the ledger; rerun `node scripts/buildometer/project.mjs` then the normal checks. It projects the existing observation, without another append. Release all related artifacts together; never publish a partial failed build.
- Prior history or baseline changed: restore only the unintended edits from the last approved committed history; append the intended new observation instead. Never prune/rewrite earlier points.

Freshness rule: an observation is stale when the latest recorded verified eligible production activation occurred after observedAt. Otherwise it is reconciled through that recorded release; absent/invalid release provenance is unverified, not fresh. This follows the release-update cadence without an arbitrary age threshold. Both home and API/dashboard use the same source observation, shipped/known points and rounded calculation. The visible date uses America/New_York with EDT/EST and a full ISO datetime attribute. Browser Last fetched is a separate actual successful-fetch time; it never advances observedAt. Missing/invalid/zero-known-scope evidence has a neutral unavailable value, not 0%. No live announcements or polling were added.

Local demo: `node scripts/buildometer/demo.mjs` serves only built public assets and retained public source metrics at http://127.0.0.1:4371/buildometer. No live Jira, Google or paid evaluator call. Browser verification: `node scripts/buildometer/validate-browser.mjs` (Chrome installed; all external requests blocked). Required build: `npm run build`; focused tests: `node --test server/buildometer/*.test.mjs scripts/buildometer/reconcile.test.mjs` and `ng test --watch=false --include=src/app/components/buildometer/**/*.spec.ts`.

Fixture browser checks: `node scripts/buildometer/validate-freshness-fixtures.mjs` covers current, old, missing and invalid progress at 390px, scoped axe and reload date preservation. Historical report tests explicitly retain the original T0 fixture; a separate current-ledger projection test checks the real current observation.
