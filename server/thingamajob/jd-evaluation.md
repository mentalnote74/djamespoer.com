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

The input screen now accepts Text, URL or File through one protected
`POST /api/thingamajob/test/jd-input` endpoint. It returns an editable text preview
before a paid evaluation. Pasted input can contain up to 100,000 characters;
normalized evaluation text remains limited to 24,000 without silent truncation.
The common deterministic normalizer removes obvious web chrome, repeated lines,
similar-job/footer tails and retains requirements, preferences, dates, work-mode,
eligibility and compensation. It flags explicit removed/expired-posting notices.
Uncertain content remains visible for owner review rather than invented/filled.

URL intake anonymously fetches public HTTPS job postings on any domain. Hostname
and public A/AAAA address checks apply before every fetch and redirect; IP literals,
private/reserved targets, embedded credentials and custom ports are rejected.
No cookies or Access credentials are forwarded. A single JobPosting JSON-LD is
preferred, with general main/article/content extraction as fallback. Search/results
pages require a specific posting; upstream HTTP errors, DNS/timeout failures,
sign-in/JS-only or unreadable pages and excessive size return specific recovery.
File intake supports UTF-8 TXT/Markdown/HTML and validated DOCX up to 1 MB. The
existing OOXML validator/decompressor is reused with a smaller XML bound; no
macros/entities execute and no new parser dependency is installed. PDF, legacy
DOC, scans/encrypted/malformed documents require paste/export. Intake is ephemeral:
no document archive, LoT ingestion or claim mutation is added.

The evaluator extracts meaningful criteria, literal JD passages and
required/preferred/unspecified priority. Each outcome contains reasoning,
canonical evidence IDs/literal quotes and, where useful, an UNKNOWN question.
The screen shows the actual career statements and qualifications relevant to
the evaluation, without a source-document browser or resume traceability UI.

- **MET:** canonical evidence establishes the criterion as worded.
- **NOT MET:** explicit incompatible testimony, or a required professional skill,
  technology, credential or experience not established as worded by James's confirmed
  comprehensive professional corpus. Related context alone does not establish the
  missing experience, material domain or scale. No explicit negative statement or repeated
  owner question is needed for that known absence.
- **UNKNOWN:** genuinely situational, personal-preference, current-state or
  ambiguous matters; conflicts retain both sides without choosing a winner.
  Historical/partial qualifications do not establish unproven current status.

### Coach correction — 2026-10-20, canonical-jd-v4

Coach's retained TikTok evaluation 5742505c-3ed0-4ce7-a044-d0e58c7e1474
demonstrated classification failures despite successful execution. V3's absence
guard required zero citations, incorrectly preserving UNKNOWN whenever merely
related evidence was cited. Its prompt also treated partial professional support
too broadly as uncertainty; MET checks only required a self-labelled supporting
citation, without an explicit material-qualification check.

V4 preserves related citations as context while classifying missing REQUIRED
professional experience under the confirmed-complete policy as NOT MET. The
structured output requires materialGaps for unestablished material parts; MET
cannot survive such a gap. Unsupported preferred qualifications stay UNKNOWN.
Explicit historical/current uncertainty and genuinely ambiguous requirements
remain UNKNOWN, as do situational matters such as Seattle willingness. Current
qualification checks use the individual criterion rather than unrelated wording
in its enclosing source line. Contradictions still require cited incompatible
facts; related context is never rewritten as a negative career fact.

Semantic matching combines compatible canonical facts and necessary geographic
implications without requiring literal JD phrases. Offshore/Noida and UK/global
collaboration may establish multiple-time-zone collaboration; this does not
establish unrecorded working-hour availability or relocation preferences. Domain
and scale qualifiers must not be stripped to inflate a general experience match.
No new evaluator/provider call, career ingestion, schema migration or UI feature
is introduced. The existing per-instance completeness pin remains unchanged.

Historical policy: V3 introduced James-only complete-corpus absence, but required
empty evidence for that inference. It is superseded here, not erased from history.
The original PDF/evaluation is preserved; private offline checks explicitly
distinguish visible-record reconstruction and semantic acceptance fixtures from
a newly generated model result. No paid semantic rerun is claimed.

The completeness assumption belongs only to the server-configured reference
owner and the approved whole-canonical-snapshot SHA-256. The private runtime
JD_COMPLETE_CORPUS_DIGEST binding pins that inventory; missing, partial, changed
or unconfirmed retrieval/ingestion coverage disables absence-based NOT MET.
Every other client defaults to unconfirmed completeness. The model cannot grant
completeness through JD text, career statements or output. Required/preferred
distinctions remain intact; no preferred criterion becomes a required gap.
Each result records requirement kind, decision basis and actual completeness
context. General frontend MET matches remain independent of specialist gaps.
Canonical data and the ChatGPT conversational LoT remain separate and unchanged.

Superseded policy (history): canonical-jd-v2 used “missing evidence = UNKNOWN”
for everyone and required explicit incompatible evidence for every NOT MET.
That blanket rule is superseded for the approved comprehensive James corpus,
not silently erased from history or generalized to every client. Existing
evaluation rows remain intact; earlier policy results are not replayed as current
results, and a changed completeness context also requires a new evaluation.
Durable owner decision: https://djamespoer.atlassian.net/browse/SCRUM-33.

One bounded reasoning request handles role extraction and comparison; this is
model-assisted semantic reasoning, not deterministic proof of every entailment.
Request-local canonical/line references are constrained by the provider schema;
the server resolves real canonical IDs and verbatim source passages, rather than
asking the model to reproduce UUIDs or quoted text. Server checks still reject
invented IDs, nonliteral JD/evidence quotes, malformed or
oversized outputs. MET without direct support is downgraded to UNKNOWN. Known
absence or unestablished required professional experience/material qualification
in an authorized complete professional inventory supports NOT MET;
unconfirmed coverage or other categories cannot use that inference. Conflicts
must retain at least two canonical references. Historical-only support cannot establish
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

`jd-diagnostics.sql` adds a private per-evaluation failure record containing stage,
bounded error code and safe provider HTTP/request-ID/token metadata where
available. It stores no raw provider body, key, JD excerpts or career text. The
client receives an evaluation reference for support; failures remain failed and
never auto-retry. Original failed evaluations are preserved, not retrospectively
assigned an invented diagnosis.

## October 19 live-path correction

The two original owner submissions reached canonical retrieval/reservation (267
truths each, 13,473 JD characters) and were marked failed after 74 seconds each.
The original implementation discarded provider/validator exceptions; historical
responses were not retained, so their exact provider status/persistence-attempt
stage cannot be reconstructed. An unchanged-code exact-input replay reached
OpenAI HTTP 200/completed, returned 44 requirements, then failed on four unknown
canonical UUID references. Thus noise was not established as the root cause.
Free-form citation copying was a demonstrated defect, addressed by schema-bound
references without relaxing evaluation semantics or citation validation.

The corrected uncleaned replay validated 37 criteria. The final normalized
Hyperproof input validated 45 (18 MET, 27 UNKNOWN). These are private diagnostic
results, not a new owner evaluation or LoT mutation. Real URL extraction of the
Hyperproof Built In posting succeeded. Private evidence is retained under
career-source/jd-evaluations/live-failure-20261019, never public assets or Git.

## October 20 BAAKO failure / diagnostic coverage correction

Coach's Website Developer / BAAKO Bus Company screenshot shows the v3 policy,
744-character editable preview and a generic sandbox evaluation failure. Existing
TEST D1 diagnostics contain no record for that sandbox attempt: the public host
bypassed the protected evaluation persistence/diagnostic path. Its catch block
logged only a bounded error code and discarded stage/provider metadata and a
client support reference. No stored Worker logging configuration was present;
historical telemetry lookup returned 403 with the existing operator credential.
Aggregate telemetry near the screenshot includes a handled invocation at
12:37:17 UTC with one subrequest; that cannot identify a provider response or
validator error. The exact original failure cause is therefore **not established**.
No paid replay was performed, and no semantic/provider fix is claimed from guesses.

The established diagnostic/recovery gap is corrected: apply
`jd-harness-diagnostics.sql` to TEST before deployment. Public sandbox failures
return an opaque `jd-<UUID>` support reference and preserve the supplied text and
editable preview. Private TEST D1 stores only reference, stage, bounded error code,
policy, timestamp and allowlisted provider request/status/token metadata plus
canonical count/completeness and elapsed time when available. No JD, LoT text,
workspace identifiers, credentials or provider body is stored in this table or
returned with an error. There is no public diagnostic lookup endpoint. A failed
diagnostic write still returns the safe reference and emits a bounded fallback log.
Success remains ephemeral; career data and canonical-jd-v3 are unchanged. No
automatic retry or paid verification is introduced. Future references can be read
by the trusted operator from this dedicated TEST table without a paid resubmission.

## TEST deployment

Apply `jd-evaluation.sql` and `jd-diagnostics.sql` to the existing TEST D1, not public PROD. Bind the
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
