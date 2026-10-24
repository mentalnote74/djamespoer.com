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
