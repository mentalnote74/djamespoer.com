# Curated Client #1 baseline capture

Run: `b3359519-cebd-4407-a432-e99b357d2716`

Manifest SHA-256: `558267773bb53dcb595abcbd1c48242e249ad1561d79df85353536e136231e9e`

Private artifacts: `career-source/proof-runs/b3359519-cebd-4407-a432-e99b357d2716/`.

The LIVE public pages were rendered in a fresh, unauthenticated headless Chrome
session. No local page/build served as evidence. Local approved content supplied
only the comparison expectations; differences other than whitespace fail closed.

Captured at https://djamespoer.com/work/ips:

- Role/date introduction
- Overview
- Translating State Rules Into Interface Logic
- Preventing Invalid Submissions
- Technologies & Practices

Captured at https://djamespoer.com/work/tcc:

- Role/date introduction
- Overview
- Ascend And The Oregon Implementation
- Structured Comparative Usability Research
- The Result: Neither A Nor B

All ten excerpts matched. Each records URL, heading, section order/location,
exact rendered text, UTF-8 text hash, capture timestamp, source ID and run ID.
Original main-document response bodies (browser-decoded HTTP entity bytes) and
full rendered HTML snapshots have separate hashes and remain provenance-only.
No wire-level compressed-byte preservation is claimed.

Only `extractionInputs` may enter the next extraction stage: the original resume
and the two selected-section JSON artifacts. Whole snapshots, navigation, footer,
unselected sections and the previous homepage must NOT be supplied to extraction.
No EXL, Thingamajob, status, scaffold or protected content is selected or crawled.
External requests and same-origin API requests are blocked. No credentials are
copied from James's browser; no Access configuration is touched.

The previous sealed run is verified before reuse. Resume bytes, original source
ID, acquisition timestamp, original run reference and provenance are unchanged;
the baseline adds a linkage, not a new assertion about source acquisition.
The previous homepage capture and manifest remain untouched.

`scripts/thingamajob-baseline-capture.mjs` uses a fixed two-URL/heading allowlist,
exclusive file creation, bounded saved artifacts, navigation timeouts, noindex
checks, missing/duplicate heading rejection and strict rendered-copy validation.
Its local write-once/tamper-detection limitations are the same as the original
capture; this is not filesystem WORM storage. Partial runs remain uncommitted.
Hashes must be checked against this committed manifest anchor before consumption.

Focused tests use synthetic DOM content, covering exact selection/provenance
locations, exclusion, missing/duplicate headings, changed text and role/date.
No claims, conflicts, decisions, model calls, private API or deployed data changes
were made. The reconciled benchmark remains sealed. The baseline is ready as
input for the separately authorized extraction slice; no provider is implied.

After the clean accuracy baseline passes, stale/contradictory/incomplete/problem
sources belong in a separate resilience run testing competing provenance,
uncertainty, owner questions, truth-promotion safeguards and review history.
