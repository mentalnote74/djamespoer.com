# First Client #1 candidate extraction

Extraction run: `1f96a7ab-1567-4678-bcef-15b840439cc7`.
Baseline: `b3359519-cebd-4407-a432-e99b357d2716`.
Private result directory:
`career-source/proof-extractions/2373daaf9ebfd391c7c386cb4df4e382c599e8f404df0b454c1153e948d944d4/`.

Candidates SHA-256:
`d1570225565b99c8983aaa1f24c4cef77ff8c05425ffe71de74451f58a7aa9c4`.

## Execution and cost

One OpenAI Responses API request, requested/returned model `gpt-5.6-sol`,
reasoning effort low, strict JSON Schema, output ceiling 24,000 tokens,
`store: false`, no tools, no retries. The request fingerprint directory is
exclusively created before transmission and blocks duplicate attempts, including
interrupted attempts. Any future rerun requires an explicit decision; changing
the prompt must not become a workaround for duplicate-processing protection.

Inputs: verified redacted resume derivative 87775f17-c0ae-48e1-93e8-ead4fe36b268
and only the selected IPS/TCC section artifacts. Original resume, full page
snapshots, homepage, benchmark and existing active LoT were not model inputs.
No network retrieval tools or protected workspace operations were invoked.

Usage: 6,477 input tokens (6,474 reported cache-write tokens; zero cached reads),
6,763 output tokens including 89 reasoning tokens. Estimated API cost $0.167642;
including the earlier access test, $0.167782. This is a token-based estimate,
not an inspected invoice. Current short-context rates per million tokens:
uncached input $4, cache writes $5, cached reads $0.40, output $20.
Pricing reference: https://developers.openai.com/api/docs/models/gpt-5.6-sol

The original usage receipt's $0.161168 estimate omitted the reported cache-write
premium. It remains unchanged; `cost-reconciliation.json` records the corrected
$0.167642 estimate. No new API call was made to reconcile cost. Conservative
preflight bounds remain below $2 even charging all input at the cache-write rate.

## Result and focused verification

65 candidates: resume 47; IPS 6; TCC 12. All remain candidate-only.
76 verbatim citations validated against approved source locations; each candidate
retains source ID/type, locator, artifact hash, capture timestamp, extraction run,
actual model, citation and source-text hashes. Original/derivative linkage is
retained. Private request/response/result hash seals were independently checked.

Nine candidates sampled across all sources; five additional uncertainty examples
spot-checked. Four focused synthetic tests cover literal citation/source scope,
conflict/question references, duplicate IDs/source omission, and cache-write cost.
No broad regression, accessibility or performance sweep was run.

The model recorded 16 candidates with uncertainty, four owner questions, one
possible title discrepancy, and two context differences. Context differences
(abbreviations and date precision) are not established contradictions. No definite
contradiction was identified. Historical present-tense, work in progress,
education date placement and source superlatives remain qualified. All model
confidence labels describe extraction fidelity, never verified truth.

Sampling found a compound maintenance/development candidate suitable for owner
splitting/correction. Candidates were not rewritten or repaired from outside
sources. Owner-authored source agreement is not external independent verification.
No completeness/benchmark-accuracy claim is made before later validation.

## Owner review compatibility and next checkpoint

Existing assertion/review services accept statements plus workspace-owned evidence
references, require owner authorization, and preserve Accept/Correct/Reject,
version checks, history and post-acceptance correction. Reuse them; no second
review engine or standalone product UI is needed.

These files are not yet persisted workspace evidence/proposals. Minimum estimated
remaining focused slices for an honest protected TEST owner-review checkpoint:

1. Authenticated run-scoped source/candidate staging: register authorized source
   artifacts, preserve extraction/citation lineage and conflict/question metadata,
   create only pending proposals idempotently, and retain run-scoped selection.
2. Adapt the shared protected review view with run filtering, readable citations,
   context/conflict distinction, uncertainty and existing owner decision controls.
   Use host theme tokens wherever materially touched. Preserve complete access
   to the run despite the current overview's 100-record limit and other records.
3. Focused protected integration/security verification and an explicitly authorized
   TEST deployment/human review checkpoint. Deployment permission remains pending.

This estimates an owner-review-ready checkpoint, not a completed independent LoT
proof, benchmark comparison or JD evaluator. No new review/deployment work was
implemented in this extraction slice. No deployment, active-LoT write, benchmark
comparison, Erica operation or UI change occurred. Private results stay ignored.
