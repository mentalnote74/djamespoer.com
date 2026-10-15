PRAGMA foreign_keys=ON;
CREATE TABLE thingamajob_baseline_evaluations (
 workspace_id TEXT NOT NULL, run_id TEXT NOT NULL, candidate_id TEXT NOT NULL,
 proposal_id TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('baseline','attention','qualified','invalid')),
 reasons_json TEXT NOT NULL CHECK(json_valid(reasons_json)), policy_version TEXT NOT NULL,
 evidence_digest TEXT NOT NULL, execution_context TEXT NOT NULL CHECK(execution_context='authorized_test_policy'),
 recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,candidate_id),
 FOREIGN KEY(workspace_id,run_id,candidate_id) REFERENCES thingamajob_extraction_candidates(workspace_id,run_id,candidate_id),
 FOREIGN KEY(workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id)
);
CREATE TRIGGER thingamajob_baseline_no_update BEFORE UPDATE ON thingamajob_baseline_evaluations BEGIN SELECT RAISE(ABORT,'Immutable baseline evaluation'); END;
CREATE TRIGGER thingamajob_baseline_no_delete BEFORE DELETE ON thingamajob_baseline_evaluations BEGIN SELECT RAISE(ABORT,'Immutable baseline evaluation'); END;
CREATE TABLE thingamajob_baseline_issues (
 workspace_id TEXT NOT NULL, run_id TEXT NOT NULL, issue_id TEXT NOT NULL, question TEXT NOT NULL,
 candidate_ids_json TEXT NOT NULL CHECK(json_valid(candidate_ids_json)),
 PRIMARY KEY(workspace_id,run_id,issue_id),
 FOREIGN KEY(workspace_id,run_id) REFERENCES thingamajob_extraction_runs(workspace_id,run_id)
);
CREATE TABLE thingamajob_baseline_answers (
 workspace_id TEXT NOT NULL,run_id TEXT NOT NULL,issue_id TEXT NOT NULL,
 response_json TEXT NOT NULL CHECK(json_valid(response_json)), fingerprint TEXT NOT NULL,
 owner_actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,issue_id),
 FOREIGN KEY(workspace_id,run_id,issue_id) REFERENCES thingamajob_baseline_issues(workspace_id,run_id,issue_id)
);
CREATE TRIGGER thingamajob_baseline_answers_no_update BEFORE UPDATE ON thingamajob_baseline_answers BEGIN SELECT RAISE(ABORT,'Immutable owner answer'); END;
CREATE TRIGGER thingamajob_baseline_answers_no_delete BEFORE DELETE ON thingamajob_baseline_answers BEGIN SELECT RAISE(ABORT,'Immutable owner answer'); END;
CREATE VIEW thingamajob_active_baseline AS
 SELECT e.*,p.statement FROM thingamajob_baseline_evaluations e JOIN thingamajob_proposals p ON p.workspace_id=e.workspace_id AND p.proposal_id=e.proposal_id
 WHERE e.category='baseline' AND p.disposition='proposed';
-- A later explicit review corrects/rejects/replaces the baseline through the same proposal.
-- The original automatic establishment remains immutable; it is never a fabricated human review.
CREATE TABLE thingamajob_baseline_jobs (
 workspace_id TEXT NOT NULL,run_id TEXT NOT NULL,policy_version TEXT NOT NULL,
 input_fingerprint TEXT NOT NULL,authorization_reference TEXT NOT NULL CHECK(length(authorization_reference)>0),
 guard INTEGER NOT NULL CHECK(guard=1),recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,policy_version),
 FOREIGN KEY(workspace_id,run_id) REFERENCES thingamajob_extraction_runs(workspace_id,run_id)
);
CREATE TRIGGER thingamajob_baseline_jobs_no_update BEFORE UPDATE ON thingamajob_baseline_jobs BEGIN SELECT RAISE(ABORT,'Immutable policy job'); END;
CREATE TRIGGER thingamajob_baseline_jobs_no_delete BEFORE DELETE ON thingamajob_baseline_jobs BEGIN SELECT RAISE(ABORT,'Immutable policy job'); END;
CREATE TRIGGER thingamajob_baseline_issues_no_update BEFORE UPDATE ON thingamajob_baseline_issues BEGIN SELECT RAISE(ABORT,'Immutable exception'); END;
CREATE TRIGGER thingamajob_baseline_issues_no_delete BEFORE DELETE ON thingamajob_baseline_issues BEGIN SELECT RAISE(ABORT,'Immutable exception'); END;
