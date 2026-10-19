-- SCRUM-78 / SCRUM-33. Private owner-scoped role/evaluation history only.
-- Never promotes a claim, changes the LoT, or generates application artifacts.
CREATE TABLE IF NOT EXISTS thingamajob_jd_evaluations (
 workspace_id TEXT NOT NULL REFERENCES thingamajob_workspaces(workspace_id),
 evaluation_id TEXT NOT NULL,
 request_key TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 jd_text TEXT NOT NULL,
 truth_digest TEXT NOT NULL,
 truth_snapshot_json TEXT NOT NULL CHECK(json_valid(truth_snapshot_json)),
 state TEXT NOT NULL CHECK(state IN ('pending','complete','failed')),
 result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
 model TEXT NOT NULL,
 policy_version TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
 created_at INTEGER NOT NULL DEFAULT(unixepoch()),
 completed_at INTEGER,
 PRIMARY KEY(workspace_id,evaluation_id),
 UNIQUE(workspace_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS thingamajob_one_pending_evaluation
 ON thingamajob_jd_evaluations(workspace_id) WHERE state='pending';
