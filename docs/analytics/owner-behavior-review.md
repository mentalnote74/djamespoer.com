> November 6 owner direction supersedes the historical hold below: stop this investigation; preserve existing behavior for the analytics release. Follow-up: [SCRUM-170](https://djamespoer.atlassian.net/browse/SCRUM-170). The pause/bring-back issue is not a release blocker.

# SCRUM-169 / SCRUM-141 owner behavior review ? follow-up only

Reviewed implementation: `12138f5413052c9fbc417c6321021c84426990a6`.
Owner reported incorrect base Rigby behavior at http://127.0.0.1:4300/.
Push/deployment remains on hold. This record supersedes any implication that the earlier analytics validation establishes owner acceptance of Rigby's behavior.

## Reproduction status

No product behavior changed during this investigation. Fresh isolated installed-Chrome sessions, 1440x1000, normal motion (not forced reduced motion), native pointer/keyboard controls, localhost with external requests blocked. The owner's affected browser/profile was not reset or modified.

Verified port 4300 is Angular serve from the named review worktree/branch, clean at reviewed commit. Its .git metadata is local/shared with the C:/Dev project, not Step2. `origin/main` is fc0b866; local `main` is an older private TEST checkpoint and is not the correct comparison. Exported unchanged fc0b866 source into ignored tmp/scrum-169-correction/baseline, sharing the existing dependency install via a junction, and served on 4301. No dependency install, Git repair, worktree prune, CT changes, OneDrive operation or cleanup.

The actual reviewed UI showed:

1. Fresh browser: Rigby initially off; genuine header activation followed by the delayed introduction (visible by the 13-second observation).
2. Play: greeting celebration closes after its existing delay; companion visible with normal motion.
3. Doghouse Sit / keyboard Shake update the actual trick; explicit biscuit control triggers celebration.
4. Home cookie collection increments jar once and starts the blue/hulking dance reaction; screenshot contains the visible rendered blue sprite.
5. Turn off removes the companion and stores off. Reload keeps it off and retains the collected cookie.
6. Cookie Jar Play brings the greeting back. Greeting Play returns the companion; enabled reload restores him and the jar.

These flows have not reproduced James's unspecified failure. All 13 observed checkpoints on unchanged main, including saved-off reload, bring-back and enabled reload, matched enabled/greeting/trick/reaction/jar state; movement coordinates differ with sampling/scroll timing, not evidence of regression. Full comparison evidence is retained in ignored tmp/scrum-169-correction/{reviewed,unchanged-main}/probe.json and screenshots. Source changes were traced: telemetry/consent are separate from enabled/progress state; the earlier changed preference wrapper and successful-collection subscription were inspected rather than presumed causal. No root cause has been established.

Probe setup issues (non-clickable hidden H1 selector, initial dependency-optimization navigation timeout and reading a lazy view before it existed) were corrected in the probe, not in product code. They are not presented as application defects. No paid evaluator or public analytics traffic was generated.

## Missing trigger / next action

Asked James for the exact page/control, steps, observed versus expected behavior, and whether the affected session is returning with saved Rigby/cookie state. Keep that affected tab/profile intact. No speculative behavior fix or failure-specific regression assertion is appropriate until the symptom is identified. Existing analytics tests are not treated as proof that every Rigby behavior works.

## Owner inspection

- Review build: http://127.0.0.1:4300/ ; unchanged-main comparison: http://127.0.0.1:4301/ . Both loopback-only.
- For a separate fresh-visitor comparison, use a new private window; do not clear the affected profile. Activate the home link and allow the delayed entrance after browsing/quiet loading. Choose Play and wait for the existing greeting to finish.
- Open Rigby's Doghouse; inspect Sit, Shake and Feed a biscuit. Collect the Home cookie and inspect its reaction.
- Turn off, reload, then Cookie Jar ? Play with Rigby ? greeting Play; reload again and inspect preserved progress.
- Report the first divergence from the expected behavior and any saved state in the affected profile. A stored off/seen preference or active form/modal can intentionally suppress entrance/companion on unchanged main too; that is context to inspect, not an assumed cause.

No fix commit exists yet. No new application tests/build were needed for documentation-only findings; prior 90/8 analytics checks are historical evidence and were not substituted for this actual-experience investigation. Analytics/consent/internal suppression must be rechecked after any confirmed fix.

## Owner clarification: second cookie after bed/bring-back

James clarified: first cookie worked; after sending Rigby to bed and bringing him back, the second cookie turned him blue but he sat still. Reproduced the precise two-hidden-cookie path (Home cookie, Turn off, Cookie Jar bring-back/greeting Play, About cookie) against both 4300 and unchanged main 4301. In 16 half-second samples per second reward, both builds had paused=false, running native animations, changing sprite positions and advancing routine tokens 3/4/5. No page errors.

A conditional match was reproduced by additionally selecting Pause Rigby before Turn off. In both builds the in-memory pause flag survives off/bring-back: the second cookie is blue with animations paused at time zero for all 16 samples, token stays 3. Explicit keyboard activation of the existing Resume Rigby button changed paused to false and animations advanced to running (~717ms observed). The pause flag/control/dance still/suspended bindings are unchanged from main; this mechanism predates analytics and does not depend on consent or new persistence.

This is **not yet proof that James's affected session was paused**. Asked which bed control and whether the second cookie was a hidden page cookie or Feed Rigby a biscuit. The affected-tab computer-use inspection failed at the tool's sandbox-helper launch; its live state was not inspected or changed. Do not clear the motion choice or alter approved behavior speculatively. Ask whether the affected Doghouse control currently says Resume Rigby or Pause Rigby.

New ignored evidence: second-reviewed/trace.json, second-main/trace.json, pause-off-reviewed/trace.json, pause-off-main/trace.json and pause-resume-reviewed/trace.json under tmp/scrum-169-correction/. Product files remain unchanged. No fix commit or failure-specific regression is claimed; push/deployment hold continues pending identification of the actual failing state.
