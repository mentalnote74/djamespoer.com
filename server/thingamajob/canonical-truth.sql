PRAGMA foreign_keys=ON;
-- Usage decisions never rewrite source evidence, proposals, reviews or lifecycle events.
CREATE TABLE IF NOT EXISTS thingamajob_truth_usage (
 workspace_id TEXT NOT NULL, proposal_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 usage TEXT NOT NULL CHECK(usage IN ('usable','duplicate','private_only','historical_only')),
 statement_override TEXT, canonical_proposal_id TEXT,
 reason TEXT NOT NULL CHECK(length(trim(reason))>0), authorization_reference TEXT NOT NULL CHECK(length(trim(authorization_reference))>0),
 recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,proposal_id,revision),
 FOREIGN KEY(workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
 FOREIGN KEY(workspace_id,canonical_proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
 CHECK(statement_override IS NULL OR (usage='usable' AND length(trim(statement_override))>0)),
 CHECK((usage='duplicate' AND canonical_proposal_id IS NOT NULL AND canonical_proposal_id<>proposal_id) OR (usage<>'duplicate' AND canonical_proposal_id IS NULL))
);
CREATE TRIGGER IF NOT EXISTS thingamajob_truth_usage_no_update BEFORE UPDATE ON thingamajob_truth_usage BEGIN SELECT RAISE(ABORT,'Immutable truth usage'); END;
CREATE TRIGGER IF NOT EXISTS thingamajob_truth_usage_no_delete BEFORE DELETE ON thingamajob_truth_usage BEGIN SELECT RAISE(ABORT,'Immutable truth usage'); END;
CREATE TABLE IF NOT EXISTS thingamajob_unknown_retirements (
 workspace_id TEXT NOT NULL, unknown_id TEXT NOT NULL,
 reason TEXT NOT NULL CHECK(length(trim(reason))>0), authorization_reference TEXT NOT NULL CHECK(length(trim(authorization_reference))>0),
 recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,unknown_id),
 FOREIGN KEY(workspace_id,unknown_id) REFERENCES thingamajob_unknowns(workspace_id,unknown_id)
);
CREATE TRIGGER IF NOT EXISTS thingamajob_unknown_retirements_no_update BEFORE UPDATE ON thingamajob_unknown_retirements BEGIN SELECT RAISE(ABORT,'Immutable UNKNOWN retirement'); END;
CREATE TRIGGER IF NOT EXISTS thingamajob_unknown_retirements_no_delete BEFORE DELETE ON thingamajob_unknown_retirements BEGIN SELECT RAISE(ABORT,'Immutable UNKNOWN retirement'); END;
DROP VIEW IF EXISTS thingamajob_current_truth_usage;
CREATE VIEW thingamajob_current_truth_usage AS SELECT u.* FROM thingamajob_truth_usage u
 WHERE u.revision=(SELECT max(z.revision) FROM thingamajob_truth_usage z WHERE z.workspace_id=u.workspace_id AND z.proposal_id=u.proposal_id);
DROP VIEW IF EXISTS thingamajob_canonical_active_claims;
CREATE VIEW thingamajob_canonical_active_claims AS
 SELECT c.workspace_id,c.claim_id,c.proposal_id,c.review_id,coalesce(u.statement_override,c.statement) statement,c.version,c.disposition,c.created_at
 FROM thingamajob_active_claims c LEFT JOIN thingamajob_current_truth_usage u ON u.workspace_id=c.workspace_id AND u.proposal_id=c.proposal_id
 WHERE coalesce(u.usage,'usable')='usable'
 AND NOT EXISTS(SELECT 1 FROM thingamajob_source_contexts s JOIN thingamajob_extraction_candidates e
 ON e.workspace_id=s.workspace_id AND e.run_id=s.run_id AND e.candidate_id=s.candidate_id
 WHERE s.workspace_id=c.workspace_id AND e.proposal_id=c.proposal_id AND s.kind='duration_summary');
DROP VIEW IF EXISTS thingamajob_active_baseline;
CREATE VIEW thingamajob_active_baseline AS
 SELECT e.*,coalesce(u.statement_override,p.statement) statement FROM thingamajob_current_evaluations e
 JOIN thingamajob_proposals p ON p.workspace_id=e.workspace_id AND p.proposal_id=e.proposal_id
 LEFT JOIN thingamajob_current_truth_usage u ON u.workspace_id=p.workspace_id AND u.proposal_id=p.proposal_id
 WHERE e.category='baseline' AND p.disposition='proposed' AND coalesce(u.usage,'usable')='usable'
 AND NOT EXISTS(SELECT 1 FROM thingamajob_source_contexts s WHERE s.workspace_id=e.workspace_id AND s.run_id=e.run_id AND s.candidate_id=e.candidate_id AND s.kind='duration_summary');
DROP VIEW IF EXISTS thingamajob_canonical_truth;
CREATE VIEW thingamajob_canonical_truth AS
 SELECT b.workspace_id,b.proposal_id,NULL claim_id,b.candidate_id,b.run_id,b.statement,'source_established' state,b.policy_version,b.recorded_at
 FROM thingamajob_active_baseline b
 UNION ALL
 SELECT c.workspace_id,c.proposal_id,c.claim_id,e.candidate_id,e.run_id,c.statement,c.disposition state,NULL policy_version,c.created_at recorded_at
 FROM thingamajob_canonical_active_claims c LEFT JOIN thingamajob_extraction_candidates e ON e.workspace_id=c.workspace_id AND e.proposal_id=c.proposal_id;
DROP VIEW IF EXISTS thingamajob_career_unknowns;
CREATE VIEW thingamajob_career_unknowns AS SELECT u.* FROM thingamajob_unknowns u
 WHERE NOT EXISTS(SELECT 1 FROM thingamajob_unknown_retirements r WHERE r.workspace_id=u.workspace_id AND r.unknown_id=u.unknown_id);
