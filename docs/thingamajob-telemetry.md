# SCRUM-141 public telemetry integration

Coach approved Phase 2 with **90-day retention** for new public evaluation content
and telemetry, preserving existing career/history evidence. The public component
uses the existing /test/thingamajob/jd-input and /evaluate Worker. No second
evaluator, public career-source reader or LoT mutation is introduced.

One attempt UUID spans intake and evaluation. A random nonrolling 30-minute,
same-tab session joins follow-through to the latest attempt privately. UUIDs,
JD text, filenames, submitted URLs, results and career evidence never go to GA.
No private-event requests occur without a recent attempt. Existing internal
analytics opt-out and optional/nonblocking analytics behavior remain intact.

GA vocabulary: evaluation_submitted, evaluation_completed, evaluation_failed,
evaluation_result_viewed, case_study_view and evidence_view, alongside existing
case_study_open/work_open, resume_download, contact_click and
external_profile_click. Only finite method/location/page/employer/profile enums
are sent. Result-view requires viewport intersection and a visible document;
page views follow Angular navigation completion. Link activations measure intent,
not successful contact, hiring, download completion or reading comprehension.

The existing evaluator Worker separately records authoritative operational
attempts/status/usage in D1 and privately retains submitted/evaluated text and
provider/final output in its existing R2 bucket. This includes available usage
for paid responses rejected by parsing/validation. No paid evaluation was used
for verification. USD/billing attribution still requires a verified price card
or account export; missing tokens/cost are not reported as zero.

Backend implementation/setup/expiry contract is maintained on the established
isolated evaluator branch in server/thingamajob/public-evaluation.md. Its new
public-evaluations/v1/ prefix and dedicated D1 attempt/events expire after 90 days,
with daily bounded deletion (next daily run, up to 24 hours after expiry) and a
prefix-only R2 lifecycle backstop. Existing sources/LoT/history/older records are
not covered by the new expiry rule. There is no public audit-record read endpoint.

Blocked client events, lost requests, browser storage limits, cross-tab behavior,
server/store outages and provider timeouts remain measurement limits; absent
follow-through is not proof of abandonment. Session correlation does not identify
people or prove visitor-versus-automation. SCRUM-141 contains verification and
the separate portfolio/backend commit and deployment receipts.


## Lean attribution pass — October 28, 2026

Use the existing GA property 557271056, America/New_York. Acquisition is GA's
session source/medium and campaign, not an application-invented visitor label.
Use utm_source/utm_medium/utm_campaign on externally distributed campaign URLs
only (public slug values: letters, digits, underscore, hyphen or dot, <=80 chars).
Internal links use event context; do not append campaign UTMs internally.
Direct/unknown remains unknown; an untagged visit cannot be called LinkedIn.
Historical acquisition contains internal-looking sources; their origin was not
established by this pass and they cannot be repaired retroactively.

Angular completion owns page_view, with config send_page_view=false. The GA stream
must not add history-based page views. Initial/public route titles and paths use
the existing public-page registry, including articles and published journal dates.
Fragment/query-only changes do not add views; returning from a non-public route
counts again. History indicates popstate (Back/Forward combined), not direction.
page_location/referrer are sanitized, with only bounded public campaign values on
entry. Unknown/private paths become /other; no submitted content or private IDs.

One bounded route-link listener supplies navigation_click or the existing
carousel_cta_click. It measures public destinations, not every button or movement.
Context: source_page, destination_path, navigation_method (header/carousel/in-page/
Rigby/history/etc.), cta_location, and registered slide_id. Existing high-value
events retain their names. interaction_source replaces the ambiguous source
parameter; no acquisition override is inferred from internal interaction context.
About's public profile links now use the existing high-value hook. The private
evaluation correlation/transport and 90-day operational records are unchanged.

### Where James can view acquisition -> pages -> actions

1. Reports: find Traffic acquisition; use Session source / medium and Session
   campaign. Compare tagged external campaigns with search/referral/direct.
2. Reports: Pages and screens for individual public paths/titles and views;
   Landing page for entry paths. Add source/campaign comparisons where supported.
3. Reports: Events / Key events for resume_download, contact_click,
   evaluation_completed and the diagnostic lifecycle/evidence/profile events.
4. Explore: Path exploration, starting at a landing page/title or ending at an
   action event. A Free form exploration can use source/medium, campaign, page
   path and event name with views, sessions, event count and key events.
5. Event-scoped custom dimensions needed for context: Source page (source_page),
   Destination path (destination_path), Navigation method (navigation_method),
   Slide (slide_id), Placement (cta_location), Profile (profile). Register only
   these, then add them to the exploration. Until registration/processing is
   verified, payload/DebugView context is not a configured ordinary report.

The three requested key events were saved and read back in GA; no invented USD
value was assigned to evaluation_completed. Existing unrelated key-event defaults
were retained. Custom dimensions and stream settings require an account-side
receipt; native browser geometry failures prevented that receipt during the pass.
Do not claim they were configured merely because collection code exists.

Exclude operator / verification campaign scrum141 and stated operator test windows
from visitor conclusions. Collection can be blocked or lost before the existing
deferred tag loads (mobile quiet window retained), on exit, with consent denial or
internal opt-out. Keep GA's existing scroll threshold; scroll is not reading.
Clicks are intent, not completed contact/download, distinct people or usefulness.
Missing follow-through does not prove abandonment. GA is not session replay.
No paid evaluation was run; completed/result-view code paths use intercepted
fictional fixtures. The new production ledger only held the prior marked operator
fixture at inspection. Provider success/usage and billed USD remain unverified.

Production verification note: bootstrap page defaults use global set, not fixed
config-scoped page_location; otherwise later route set calls lose precedence.
Bing follow-through now shows sitemap Success with 52 discovered URLs. Fresh GA
Realtime was empty despite observed production collection; do not label transport
verification as confirmed new report receipt.
