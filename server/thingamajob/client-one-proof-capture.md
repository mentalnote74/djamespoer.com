# Client #1 independent source capture

Local-only operator tooling: `node scripts/thingamajob-proof-capture.mjs`.
No Worker, D1, R2, authenticated workspace, UI or deployment changes.

## First capture

- Run: `4fff8dd5-0e07-4a8b-8c54-286b69c34c0b`
- Private location: `career-source/proof-runs/4fff8dd5-0e07-4a8b-8c54-286b69c34c0b/`
- Manifest SHA-256: `70b4605927260052297611b40442ce0703b60b0d80829b91f6c127f3bdbc68e2`
- Historical input: `career-source/resumes/historical/DJamesPoerResume.10.21.docx`
- Resume captured: `2026-10-15T17:21:10.040Z`; 233,648 bytes.
- Resume SHA-256: `47f46afecfd0a732bb54b83b6000668d23296b063e3be7b50162b9fc7e189290`
- Public input: `https://djamespoer.com/`
- Website captured: `2026-10-15T17:21:10.194Z`; HTTP 200; 3,422 bytes.
- Website SHA-256: `629984f5c10d5365b38c9e22fba4b3f15c0ed8c8c50c76f6b2c1905a5ea99b42`

The website snapshot is the root HTML response only, not the rendered Angular
application, linked routes, scripts or assets. Assess source sufficiency before
extraction; capture any additional approved public pages separately if needed.
This snapshot must not be described as a complete portfolio crawl.

## Capture contract

Existing evidence validation checks the DOCX container and validates bounded UTF-8
website bytes. HTML stays inert; it is neither executed nor added as a newly
supported format to deployed evidence ingestion. Retrieval is restricted to the
fixed approved HTTPS URL, without redirects or credentials, with a timeout and
10 MB body bound. No benchmark is read; the CLI reads only the selected resume.

Every source records an independent ID, run ID, version, attribution, source
locator, acquisition timestamp, byte length and SHA-256. Original bytes are
preserved; no normalization, candidate claims or owner decisions are created.
Run directories and files are exclusively created; existing captures are never
overwritten. A manifest seal is written last, and verification checks both source
hashes and linkage against the expected manifest hash recorded above. Partial
directories remain uncommitted for inspection. A new CLI invocation creates a new
run; it is not a retry/resume operation for this run.

This is application-level write-once capture with tamper detection, not filesystem
WORM storage. Local filesystem administrators can modify files; verify against
the committed manifest hash before consuming a capture. Private bytes and the
manifest remain ignored under `career-source/`, outside Angular/public assets.

Focused check: `node --test scripts/thingamajob-proof-capture.test.mjs`.
Fictional fixtures cover exact bytes, run linkage, timestamps, manifest/source
tampering, invalid documents and failed/non-HTML retrieval. No model is called.

Next slice: independently extract cited candidates from approved captured sources,
preserving uncertainty and conflicts for owner review. The reconciled benchmark
remains sealed until the independent LoT comparison stage. Extraction/provider
authorization and source sufficiency must be settled before model processing.
