# SCRUM-86 visible claim audit acceptance

Read-only follow-up to the approved-claim lifecycle checkpoint. Every active claim
now has a native **View history / audit** button. It loads that claim's existing
owner-scoped proposal detail and moves keyboard focus to **Selected proposal**.
No review or lifecycle action is submitted by these navigation controls.

The detail exposes original proposal/review IDs, proposal attribution and actor,
source references/locators, owner review decision/actor/time, version transition,
readable UTC history timestamps, historical claim status, supersession event and
replacement claim/proposal/review IDs, authorizing owner, execution context and
explicit authorization reference. Existing buttons permit inspection in both
directions. Untrusted values remain Angular text interpolation.

## Exact human steps

1. Reload https://api-test.djamespoer.com/api/thingamajob/test/app/ through normal
   James Access.
2. Under **Active reviewed claims: Library of Truth**, locate the corrected claim
   specified by James and click its **View history / audit** button. Focus moves
   to **Selected proposal: corrected** in **Proposals and owner decisions**.
3. Click **Inspect original approval and supersession history**.
4. Check **Original owner review** shows the original accepted decision and its
   owner/timestamp; the proposal/source references and **Proposal history** remain.
   Check **Historical claim: superseded, excluded from active LoT**, then inspect
   **Supersession event**, replacement identifiers, authorization reference and UTC
   supersession timestamp. The event is `615b684d-9c05-4fea-81fb-131ae09e6594`.
5. Click **Open replacement proposal and review**. Confirm the corrected approved
   claim and original corrected review are displayed, together with **This approved
   claim replaces historical claim** and the same event ID.

These clicks do not alter data. No Accept/Reject/Correct/Supersede submission is
required to inspect the existing reconciliation.

## Verification and deployed state

TEST Worker `thingamajob-api-test` version
`36cab580-511e-464f-b348-b0941ed83e21` serves 100%; bindings preserved. No schema
migration or data mutation. All 20 original TEST table counts/hashes still match,
with 4 historical claims/3 active claims/1 unchanged lifecycle event and zero linked
correction drafts. D1 foreign-key/quick checks pass. Erica, Access, private R2,
LIVE, portfolio deployment and remote main remain untouched.

Angular focused 18/18/full 252/252; shipping server 120/120; strict TypeScript,
formatting/whitespace and public/protected builds/budgets pass. Public initial
304.98 kB; protected initial 247.40 kB/lazy feature 32.74 kB. Public generated
build timestamp restored. Local compiled Angular/fictional signed Worker/SQLite
integration passes actual button navigation by keyboard, detail focus, timestamp/
provenance display, inert content and database equality across audit navigation.
Twenty-two axe audits find zero violations; one main/no overflow at desktop,
390/320px and 200% text/CSS zoom. Narrow screenshot visually inspected.

Local fictional rendered checks and authoritative deployed database/deployment
verification are distinct from James's real authenticated UI acceptance, which is
still pending. Branch `test/scrum-86-angular-presentation`; stop at that human gate.
No Erica site work.
