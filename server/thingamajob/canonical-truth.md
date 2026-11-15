# Canonical career truth

Faithfully extracted factual testimony from approved client career sources counts
as truth without individual owner reconfirmation. Automatic baseline establishment
does not forge an owner acceptance: proposals remain proposed, and explicit review
continues to handle corrections, genuine conflicts, ambiguity and new assertions.
Literal quote matching or model confidence alone is not a semantic truth policy.
The October 19 source QA is pinned to the inspected run and its approved sources.

`canonical-truth.sql` adds append-only usage and test-UNKNOWN retirement records.
It leaves evidence, source text, proposals, reviews, existing claims, supersessions
and UNKNOWN lifecycle events intact. A safe statement override can remove private
background context from a usable representation without deleting original history.
Duplicate representations point at one canonical proposal and retain source support.
Source-title variants can support one employment fact without implying promotion.

`thingamajob_canonical_truth` combines automatically established and reviewed truth.
It excludes superseded claims, canonical-excluded historical summaries, duplicates
and private-only material. Later correction/rejection removes the old automatic
representation. Duplicate support never resurrects an excluded canonical target.
`thingamajob_career_unknowns` excludes retired test records; original lifecycle state
remains inspectable, with retirement metadata on the owner diagnostic detail route.

The protected owner-only GET `/api/thingamajob/test/truth` returns canonical statements
and source references, with no raw proposals, source quotations, review drafts or
test UNKNOWNs. It fails closed when the canonical migration is absent. The existing
workflow overview uses the same safe views after migration. Detailed original
proposals, extraction packages and UNKNOWN history remain explicit owner audit paths;
they are not inputs for downstream career outputs or evaluation.

Apply the schema only to protected TEST before deploying its Worker. The offline
`scripts/thingamajob-truth-qa.mjs` prepares a guarded, idempotent patch from a private
snapshot and approved source/correction manifest. It validates literal citations,
pins source hashes and prior proposal versions/dispositions, checks active ownership,
records authorization, preserves all earlier records, and makes no model/network calls.
It does not create human reviews or backdate facts. Private manifests, statements,
SQL patches and snapshots stay under ignored `career-source/`; never publish them.

No JD evaluator, broad ingestion/parser changes, public-site or other-client changes
belong to this correction slice. Remaining source coverage is reported separately.
