# Client #1 private resume derivative

Baseline run: `b3359519-cebd-4407-a432-e99b357d2716`.
Derivative: `87775f17-c0ae-48e1-93e8-ead4fe36b268`.

Private artifact:
`career-source/proof-runs/redacted-87775f17-c0ae-48e1-93e8-ead4fe36b268/resume.redacted.txt`

Artifact SHA-256:
`539992e69dcf39a2026d1beb9078574f078d55bdb973219485023c41b9af744a`

Derivative manifest SHA-256:
`bbf988c88ebed5de9f294cb4ed3e33e21e01811e8ba3c068472a78ffc77212a2`

Original resume SHA-256, unchanged in original and baseline runs:
`47f46afecfd0a732bb54b83b6000668d23296b063e3be7b50162b9fc7e189290`

The deterministic local script projects DOCX text, tabs and line breaks into
part/paragraph-addressable UTF-8 text. It does not rewrite the original DOCX.
Formatting, embedded assets, document properties, hidden package metadata and
Word about: placeholder targets are excluded. Eight career HTTP(S) hyperlink
targets are preserved beside their paragraph locations.

The inspected contact header contains name, street/home address, personal phone,
personal email and a personal profile URL. Those five identifier classes and the
now-unused contact heading were replaced with explicit markers: six paragraphs.
All other 135 paragraphs (including empty paragraphs across document, footer,
footnote and endnote parts) remain exactly unchanged in text projection. Career
text is not normalized, summarized, repaired or inferred. Original source ID,
acquisition timestamp, source locator, hashes and run provenance are retained in
the private derivative manifest; the original and baseline manifests are untouched.

Checks: both sealed parent manifests validated; resume copies byte-identical;
all removed values absent; no remaining detected email/phone pattern; every
unmodified paragraph compared exactly; derivative re-read hash validated.
Two synthetic unit tests cover contact removal, career/date preservation,
changed-header refusal and additional-contact refusal. No model/network calls.

Next extraction must explicitly use this derivative instead of the original
DOCX, plus the baseline IPS/TCC selected-section artifacts. The sealed benchmark
and whole-page snapshots remain excluded. No baseline artifact is replaced.
This text projection is the model input, not a public/downloadable resume.

An earlier text-only derivative bdb11afe-f719-40e8-9c1b-9d081f4f928a was
retained privately after adding career-link preservation. It is not the selected
extraction artifact. No model has received either derivative.
