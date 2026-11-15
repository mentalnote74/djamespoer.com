# SCRUM-82 private evidence intake/retrieval checkpoint

SCRUM-81 real TEST transaction/replay acceptance is complete at
`05f1fa680ae21824b28203b841dc66e633237ab9`. This slice reuses its private R2,
original metadata/history and authorization. Erica's real SCRUM-80 acceptance
remains open, not a claimed two-human acceptance result.

## Protected TEST interface

`https://api-test.djamespoer.com/api/thingamajob/test/evidence`

An existing owner uses normal Cloudflare Access, selects an explicitly authorized
source, supplies attribution and an optional source locator, checks the authorization
box and submits. No local credential handoff, browser storage or token extraction.
The page is a minimal Worker acceptance surface, not the later Angular story.

TEST-only endpoints:

- `POST /api/thingamajob/workspaces/<workspaceId>/evidence`: multipart fields
  `file`, `attribution`, optional `sourceLocator`; required `Idempotency-Key` header.
- `GET /api/thingamajob/workspaces/<workspaceId>/evidence/<sourceId>`: private metadata.
- `GET /api/thingamajob/workspaces/<workspaceId>/evidence/<sourceId>/original`:
  authorized integrity-checked attachment containing the unchanged original bytes.

The exact TEST origin/gate is required. POST additionally checks Origin and
same-origin fetch metadata; Worker independently validates signed identity and
active D1 ownership before reading intake bytes or accessing storage. Record IDs,
filenames, keys, source links and body fields confer no authority. Unknown/foreign
sources deny without touching R2. No list of other clients or object keys is returned.
Failure/denial is JSON, never SPA HTML. Downloads are no-store, nosniff, sandboxed
attachments; they are not rendered as active documents in the application.

## Formats and limits

Maximum original size is **10,000,000 bytes** (10 MB decimal). Actual request bytes
are bounded before multipart parsing, independent of Content-Length, with a bounded
100,000-byte allowance for multipart metadata. Duplicate/unknown fields reject.
Zero-length files reject. Original bytes are never normalized or transcoded.

- TXT / Markdown (`.txt`, `.md`, `.markdown`): valid UTF-8, no binary control bytes.
- PDF: header/version, final EOF, plausible byte-addressed xref/xref-stream,
  root reference and catalog structural checks.
- DOCX: bounded single-disk ZIP directory/local headers; stored or raw-deflated
  parts; required content types, relationship and document XML; size/CRC checks
  on required XML, no encryption/macros/path traversal/DTD/entity declarations.
  Expanded directory sizes are capped at 50 MB and each required XML at 8 MB.

These are structural intake checks, **not malware scanning, a complete PDF/XML
semantic parser, document extraction, or career verification**. Password-protected
DOCX, ZIP64 packages, legacy DOC, macro-enabled formats and non-UTF-8 text are not
accepted. Unsupported MIME/extension combinations return 415; malformed input
returns 400; oversize returns 413. Future broader-format needs require an explicit
decision rather than silent conversion or a large parsing framework.

## Provenance and atomic storage

Additive `evidence.sql` defines provenance tied through a same-workspace composite
FK to original version 1. Filename/type, supplied attribution and locator, and
server-acquisition time are immutable. Original hash/size/object reference and
creator history remain in the accepted SCRUM-81 tables. Uploaded attribution is
not an assertion that an external authority verified the document. Acquisition
time is not employment time; file timestamps are not used.

The private object put precedes one D1 transaction containing original metadata,
creation history and provenance. Failure in any dependent insert rolls back all
three. R2 failure exposes no record; D1 failure preserves an inaccessible private
orphan. Retrieval resolves only committed authorized D1 references. Same request
key/bytes/provenance replays; changed bytes or provenance conflict (409), without
overwriting originals or rewriting history. Refer to SCRUM-81 reconciliation;
no automatic orphan deletion, public object URL or retention expiry is added.

No raw career-source material is read or copied by the Worker. No private content,
JWT, subject, provider identity, SQL or unfiltered error is logged. Access policies,
ownership, pending approval, LIVE and origin/main are unchanged.

## Acceptance gate

All automated fixtures are fictional. The story's real acceptance requires James
to explicitly select **one source he authorizes for his private TEST workspace**
using the URL above. Do not choose an archive document on his behalf or upload
career material merely to exercise infrastructure.

Expect HTTP 200 private provenance with source type, acquisition time, SHA-256,
byte length and version 1. Use Download unchanged original and compare bytes/hash
locally. Retry the same form unchanged to prove `replayed: true`. Do not paste
private source contents, attribution or provider identifiers into Jira/chat.
Return only safe acceptance outcomes. Erica can remain empty; her later approved
mapping uses the same platform. Two real humans' isolation is still an open item.

Stop before expanding if meaningful personal Cloudflare charges appear. The
previous operator-reported $0.00 baseline is not a newly audited invoice total.

References: [Worker request parsing](https://developers.cloudflare.com/workers/runtime-apis/request/),
[Worker compression support](https://developers.cloudflare.com/workers/runtime-apis/web-standards/),
[D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).
