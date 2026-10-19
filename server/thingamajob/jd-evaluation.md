# SCRUM-78 / SCRUM-33: protected TEST JD evaluation

Extends the existing private Worker, workspace authorizer, canonical truth boundary
and Angular host. SCRUM-78 establishes Role Model × LoT → MET / NOT MET / UNKNOWN;
the owner's October 19 direction applies that contract to this slice. Older
public demo labels are not a separate evaluator or a source of client truth.

## User path and contract

Open `/api/thingamajob/test/app/#/evaluate`, or choose **Evaluate a job description**
from the existing private career-record home. Paste 20–24,000 characters. The
authenticated owner submits only `jobDescription`; no browser-supplied actor,
workspace, truth, outcome or evidence IDs can authorize/change the evaluation.

`POST /api/thingamajob/test/evaluations` requires a same-origin request and an
`Idempotency-Key`. `GET .../evaluations/<id>` reads only that owner's result.
Both are TEST-gated, Access-authenticated and non-cacheable. No CORS grant.

The evaluator extracts meaningful criteria, literal JD passages and
required/preferred/unspecified priority. Each outcome contains reasoning,
canonical evidence IDs/literal quotes and, where useful, an UNKNOWN question.
The screen shows the actual career statements and qualifications relevant to
the evaluation, without a source-document browser or resume traceability UI.

- **MET:** canonical evidence establishes the criterion as worded.
- **NOT MET:** explicit incompatible testimony; absence is not a negative fact.
- **UNKNOWN:** missing/partial/ambiguous evidence or unsupported recency/proficiency.

One bounded reasoning request handles role extraction and comparison; this is
model-assisted semantic reasoning, not deterministic proof of every entailment.
Server checks reject invented IDs, nonliteral JD/evidence quotes, malformed or
oversized outputs. MET without direct support and NOT MET without incompatible
support are downgraded to UNKNOWN. Historical-only support cannot establish
explicit current/recent/proficient/expert criteria. The prompt also preserves
chronology, approximate quantities, collective attribution, alternatives,
design-vs-shipped distinctions and overlapping employment periods. No match
percentage, invented current proficiency or resume generation.

## Truth and persistence boundary

Only `canonicalTruth()` supplies statements and source qualifications. Rejected,
superseded, duplicate, private-only and historical-only representations remain
excluded by existing views. No raw archive documents, source text packages,
contact metadata or audit history are sent to the provider. Automatic truth is
equal in membership to accepted/corrected truth; no extra owner approvals.

The additive `jd-evaluation.sql` table stores a private JD, canonical snapshot
digest, exact reasoning inputs, policy/model, state, timestamps and validated
result. It never writes evidence/proposal/review/claim/UNKNOWN tables. A unique
pending reservation prevents concurrent paid calls per workspace. Identical keys
replay without another call; changed input on the same key conflicts. Failures
remain failed, without implicit paid retry. A reservation older than 180 seconds
is retired on the next explicit submission; the provider call times out at 120
seconds. Stale canonical snapshots are not served as current evaluations: a LoT
change during evaluation or before a later read requires reevaluation.

## TEST deployment

Apply `jd-evaluation.sql` to the existing TEST D1, not public PROD. Bind the
operator-approved `OPENAI_API_KEY` as a Worker **runtime secret** and set
`JD_EVALUATION_MODEL` explicitly. The initial adapter reuses the existing
source-extraction Responses API/model approach (`gpt-5.6-sol`). Its small
`JdReasoner` seam permits another provider without moving the database's truth
authority into the model. The browser never receives credentials.

Requests use strict JSON Schema, `store:false`, no tools, and no automatic model
retry. See [official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
The owner explicitly approved sending canonical statements/qualifications plus
the JD to OpenAI for this protected TEST capability. The screen discloses this
processing. Provider response bodies/errors are not exposed or logged.

Build `npm run build:thingamajob-test`, then deploy only
`server/thingamajob/wrangler.private.jsonc --env test --keep-vars` through the
existing protected release path. Public main/PROD and other client data remain
untouched. Real JD acceptance is the next owner exercise; this slice does not
authorize tailored resume generation.
