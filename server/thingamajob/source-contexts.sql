PRAGMA foreign_keys=ON;
CREATE TABLE thingamajob_source_contexts (
 workspace_id TEXT NOT NULL,run_id TEXT NOT NULL,candidate_id TEXT NOT NULL,source_id TEXT NOT NULL,
 issue_id TEXT NOT NULL,kind TEXT NOT NULL,display_text TEXT NOT NULL,citation_json TEXT NOT NULL CHECK(json_valid(citation_json)),
 document_date TEXT CHECK(document_date IS NULL),date_basis TEXT NOT NULL,policy_version TEXT NOT NULL,recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,run_id,candidate_id),
 FOREIGN KEY(workspace_id,run_id,candidate_id) REFERENCES thingamajob_extraction_candidates(workspace_id,run_id,candidate_id),
 FOREIGN KEY(workspace_id,source_id) REFERENCES thingamajob_evidence(workspace_id,source_id)
);
CREATE TRIGGER thingamajob_source_contexts_no_update BEFORE UPDATE ON thingamajob_source_contexts BEGIN SELECT RAISE(ABORT,'Immutable source context'); END;
CREATE TRIGGER thingamajob_source_contexts_no_delete BEFORE DELETE ON thingamajob_source_contexts BEGIN SELECT RAISE(ABORT,'Immutable source context'); END;

CREATE VIEW thingamajob_canonical_active_claims AS
 SELECT c.* FROM thingamajob_active_claims c WHERE NOT EXISTS (SELECT 1 FROM thingamajob_source_contexts s JOIN thingamajob_extraction_candidates e ON e.workspace_id=s.workspace_id AND e.run_id=s.run_id AND e.candidate_id=s.candidate_id WHERE s.workspace_id=c.workspace_id AND e.proposal_id=c.proposal_id AND s.kind='duration_summary');
