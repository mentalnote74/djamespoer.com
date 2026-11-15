PRAGMA foreign_keys=ON;
CREATE TABLE thingamajob_baseline_reassessments (
 workspace_id TEXT NOT NULL,run_id TEXT NOT NULL,candidate_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>1),
 category TEXT NOT NULL CHECK(category IN ('baseline','attention','qualified','invalid')),reasons_json TEXT NOT NULL CHECK(json_valid(reasons_json)),
 policy_version TEXT NOT NULL,recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,candidate_id,revision),
 FOREIGN KEY(workspace_id,run_id,candidate_id) REFERENCES thingamajob_baseline_evaluations(workspace_id,run_id,candidate_id)
);
CREATE TABLE thingamajob_issue_reassessments (
 workspace_id TEXT NOT NULL,run_id TEXT NOT NULL,issue_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>1),
 disposition TEXT NOT NULL CHECK(disposition IN ('attention','informational')),reason TEXT NOT NULL,policy_version TEXT NOT NULL,recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,issue_id,revision),
 FOREIGN KEY(workspace_id,run_id,issue_id) REFERENCES thingamajob_baseline_issues(workspace_id,run_id,issue_id)
);
CREATE TABLE thingamajob_role_presentations (
 workspace_id TEXT NOT NULL,run_id TEXT NOT NULL,candidate_id TEXT NOT NULL,role_key TEXT NOT NULL,source_id TEXT NOT NULL,
 presented_title TEXT NOT NULL,citation_json TEXT NOT NULL CHECK(json_valid(citation_json)),association_basis TEXT NOT NULL,
 canonical_title TEXT CHECK(canonical_title IS NULL),policy_version TEXT NOT NULL,recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,candidate_id),
 FOREIGN KEY(workspace_id,run_id,candidate_id) REFERENCES thingamajob_extraction_candidates(workspace_id,run_id,candidate_id),
 FOREIGN KEY(workspace_id,source_id) REFERENCES thingamajob_evidence(workspace_id,source_id)
);
CREATE TRIGGER thingamajob_baseline_reassessments_no_update BEFORE UPDATE ON thingamajob_baseline_reassessments BEGIN SELECT RAISE(ABORT,'Immutable reassessment'); END;
CREATE TRIGGER thingamajob_baseline_reassessments_no_delete BEFORE DELETE ON thingamajob_baseline_reassessments BEGIN SELECT RAISE(ABORT,'Immutable reassessment'); END;
CREATE TRIGGER thingamajob_issue_reassessments_no_update BEFORE UPDATE ON thingamajob_issue_reassessments BEGIN SELECT RAISE(ABORT,'Immutable reassessment'); END;
CREATE TRIGGER thingamajob_issue_reassessments_no_delete BEFORE DELETE ON thingamajob_issue_reassessments BEGIN SELECT RAISE(ABORT,'Immutable reassessment'); END;
CREATE TRIGGER thingamajob_role_presentations_no_update BEFORE UPDATE ON thingamajob_role_presentations BEGIN SELECT RAISE(ABORT,'Immutable title provenance'); END;
CREATE TRIGGER thingamajob_role_presentations_no_delete BEFORE DELETE ON thingamajob_role_presentations BEGIN SELECT RAISE(ABORT,'Immutable title provenance'); END;
CREATE VIEW thingamajob_current_evaluations AS
 SELECT e.workspace_id,e.run_id,e.candidate_id,e.proposal_id,coalesce(r.category,e.category) category,
 coalesce(r.reasons_json,e.reasons_json) reasons_json,coalesce(r.policy_version,e.policy_version) policy_version,
 coalesce(r.recorded_at,e.recorded_at) recorded_at
 FROM thingamajob_baseline_evaluations e LEFT JOIN thingamajob_baseline_reassessments r
 ON r.workspace_id=e.workspace_id AND r.run_id=e.run_id AND r.candidate_id=e.candidate_id
 AND r.revision=(SELECT max(revision) FROM thingamajob_baseline_reassessments z WHERE z.workspace_id=e.workspace_id AND z.run_id=e.run_id AND z.candidate_id=e.candidate_id);
CREATE VIEW thingamajob_current_issues AS
 SELECT i.*,coalesce(r.disposition,'attention') current_disposition,r.reason,r.policy_version
 FROM thingamajob_baseline_issues i LEFT JOIN thingamajob_issue_reassessments r
 ON r.workspace_id=i.workspace_id AND r.run_id=i.run_id AND r.issue_id=i.issue_id
 AND r.revision=(SELECT max(revision) FROM thingamajob_issue_reassessments z WHERE z.workspace_id=i.workspace_id AND z.run_id=i.run_id AND z.issue_id=i.issue_id);
DROP VIEW thingamajob_active_baseline;
CREATE VIEW thingamajob_active_baseline AS
 SELECT e.*,p.statement FROM thingamajob_current_evaluations e JOIN thingamajob_proposals p ON p.workspace_id=e.workspace_id AND p.proposal_id=e.proposal_id
 WHERE e.category='baseline' AND p.disposition='proposed';
