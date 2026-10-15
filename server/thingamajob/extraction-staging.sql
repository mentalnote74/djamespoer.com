-- Additive run metadata only. Existing proposal/review/claim lifecycle stays authoritative.
PRAGMA foreign_keys = ON;
CREATE TABLE thingamajob_extraction_runs (
  workspace_id TEXT NOT NULL REFERENCES thingamajob_workspaces(workspace_id),
  run_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  document_json TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  state TEXT NOT NULL CHECK (state IN ('staging','staged')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,run_id)
);
CREATE TABLE thingamajob_extraction_candidates (
  workspace_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  PRIMARY KEY (workspace_id,run_id,candidate_id),
  UNIQUE (workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,run_id) REFERENCES thingamajob_extraction_runs(workspace_id,run_id),
  FOREIGN KEY (workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id)
);
