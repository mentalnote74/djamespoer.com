# Creative Town source recovery — October 23, 2026

This is a preservation checkpoint, not implementation authorization or new artwork.
The five recovered source files are copied byte-for-byte from the original local
`output/experiments/SCRUM-64/` folders. Originals remain untouched. `manifest.json`
records their original paths, sizes, hashes and PNG geometry. This directory is
outside `public/`; no component, asset build rule, runtime request or deployment
has been added.

## Verified inventory

| Item | Preserved file | State and use |
| --- | --- | --- |
| Larry V1-C mural | `scrum-64/larry-v1-c/SCRUM-64-larry-v1-c.png` | Historical generated composite, 2067 × 761, 3,931,278 bytes, opaque RGB. Superseded by V2; not an independent character or production-approved cutout. |
| V1 frozen source brief | `scrum-64/larry-v1-c/frozen-brief.md` | Original historical generation instructions, unchanged. |
| V1 provenance | `scrum-64/larry-v1-c/provenance.md` | Original generation date, source comments, hash and failed-canvas limitation, unchanged. |
| Larry V2-C mural | `scrum-64/larry-v2-c/SCRUM-64-Larry-V2-C.png` | Historically approved flattened composite, 2172 × 724, 3,608,344 bytes, opaque RGB. Exact duplicate of the already-committed approved master under `public/assets/perspectives/`. Archival copy keeps the prompt/result pair together; Git reuses the existing identical blob. |
| V2 exact submitted prompt | `scrum-64/larry-v2-c/exact-prompt.md` | Original generation instructions, unchanged; not rewritten as a current production specification. |

Counts apply only to recovered files: **two composite masters and three associated
source documents**. One master is the historically approved V2; one is the
superseded V1 experiment. An explicit owner rejection of V1 is not asserted.
Neither master has alpha or separated characters. These files date to October 8;
they are not evidence that the later afternoon character work was recovered.

The V2 master and its four full-scene WebP delivery derivatives were already in
Git before this recovery:

- `public/assets/perspectives/SCRUM-64-Larry-V2-C.png`
- `public/assets/perspectives/creative-600.webp`
- `public/assets/perspectives/creative-1200.webp`
- `public/assets/perspectives/creative-1800.webp`
- `public/assets/perspectives/creative-2172.webp`

Their existing delivery contract is in `docs/creative-asset-delivery.md` and
`scripts/optimize-creative.mjs`. Those files/assets are not modified by this
checkpoint. Full-scene delivery readiness is separate from independent-character
readiness. No unrelated carousel, TCC piglet, rejected TCC/D&R scene, screenshot
or other project's asset is counted as a Creative Town character.

## Provenance and decisions recovered

- SCRUM-64 comments 10012/10013 establish the V1 generation brief/protocol; its
  provenance records Jira attachment 10003. The original requested 1280 × 194
  canvas was not delivered. Preserve that failure rather than crop the evidence.
- SCRUM-64 comment 10033 records one V2 generation from revision-2 comment 10032,
  attachment 10004, exact hash and another failure to meet the then-requested
  1280 × 194 canvas. Later repository approval/use of the 3:1 V2 master is
  documented by `docs/creative-asset-delivery.md`; both historical states matter.
- SCRUM-64 comment 10039 changes the future production approach to isolated
  character/prop ingredients with compact profiles and must-survive traits;
  Larry owns final composition. A flattened mural is reference material, not a
  substitute for those independent assets.
- SCRUM-101/103 require canonical reusable individual sources, transparent assets,
  appropriate variants and optimized runtime delivery. Atlases are conditional
  on a real benefit, not a requirement to build a new system in this recovery.
- SCRUM-102 describes a roughly 100-asset library with approximately 75 in a
  scene. That is a target, not proof that a finite 100-item production list or
  completed set already exists.
- SCRUM-107's later concept is a stable static scene per visit, with rare one-off
  cameo exceptions. Resident status is distinct from always-present status;
  Pig Prime alone is guaranteed visible. Maximum one superhero. The Rubber Duck
  stays inanimate. Golden dunce cap is a desk prop (comment 10075). James's
  Emotional Support Donkey is a resident addition without invented backstory
  (SCRUM-101 comment 10121).

These are recovered decisions, not new approvals. Historical prompts can differ
from later canon; do not silently normalize the archived documents.

## Later session work: unrecovered, not confirmed lost

The saved overnight report at `88543bb` (`docs/overnight-2026-10-23.md`, originating
in `18ee5e4`) explicitly reports no character generation/registration/placement in
that overnight pass. It parked implementation because it found the flattened
mural but no implementation-ready independent asset/placement contract.

No later independent Creative Town character asset set was found in the actual
repository/worktrees or known Codex output locations inspected during recovery.
Coach has no confirmed alternate afternoon session/output path and instructed us
not to broaden the filesystem search or regenerate the work. The afternoon
generated-character work is therefore **unrecovered, not confirmed lost**.
Its completed/partial/rejected counts and original production decisions cannot
responsibly be reconstructed from the two older murals.

Expected handoff areas were the existing repository `artwork/`, `public/assets/`
and local `output/` areas (including their existing worktree copies), and the
previously supplied `C:/Users/djame/Documents/Codex/2026-10-22/o/outputs/` location.
Those are inspected/expected handoff areas, **not a recorded destination for the
missing session**. No exact later-session output path was established. Recovering
that session/location is a separate follow-up; uncertain files stay untouched.

## What remains before independent-character implementation

Zero independent implementation-ready character assets are verified in the
recovered material. No percentage-complete claim about the afternoon set is made.
The old mural is complete as a flattened reference; it is not a partially cleaned
transparent cast sheet. No separate partial character files were recovered.

First recover the afternoon files and their approval/provenance. Then assess each
actual asset against the existing story contracts: complete independent
silhouette/pose, genuine transparency and clean edges, necessary source/variant
separation, responsive size/crop/padding, registration/footing/scale, permitted
placement/occlusion and must-survive traits. Confirm applicable Coach approval.
Accessibility treatment depends on eventual use: decorative scene ingredients
must not create repetitive announcements; any meaningful or interactive content
needs suitable semantics and keyboard behavior. No such runtime decision is
implemented here.

"Parked pending an implementation-ready independent character asset/placement
contract" meant that reusable characters and placement rules were not available
in the inspected implementation—not that the approved mural was unfinished or
that no later afternoon art could exist elsewhere. The parked statement must not
be used as evidence that the unrecovered session never happened.

## Preservation verification and scope

The PNGs decode as RGB images with the dimensions recorded above. SHA-256 checks
confirm both copied masters and all three source documents are identical to
their original local files; V2 also matches the already-committed approved master.
Only this archive, its manifest and this note belong in the preservation commit.
Unrelated dirty root files, Thingamajob diagnostics, AI_HANDOFF edits, page markup,
traces, output clutter and uncertain files must remain untouched. No application
test suite/build, generation, resizing, transparency edits, UI wiring or PROD
deployment is needed or performed for this source-only checkpoint.
